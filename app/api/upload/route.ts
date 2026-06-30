// ingest: extract → chunk → embed → store
//
// Stub: not implemented yet. See lib/rag/ingest.ts for the intended pipeline.
// The frontend reaches this via lib/data/client.ts (currently mocked).

import { SUPPORTED_MIMES } from "@/lib/ai/extract";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { ingestDocument } from "@/lib/rag/ingest";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File))
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Specific, friendly rejection for legacy .doc — MUST come before the generic
  // allow-list check below, otherwise the bland "Unsupported type" wins.
  if (file.type === "application/msword") {
    return NextResponse.json(
      {
        error:
          "Legacy .doc files aren't supported — please save as .docx or PDF and re-upload.",
      },
      { status: 415 },
    );
  }
  if (!SUPPORTED_MIMES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}` },
      { status: 415 },
    );
  }
  // Check size BEFORE reading the file into memory — File.size needs no read.
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 413 },
    );
  }

  const buffer = await file.arrayBuffer(); // only reached for acceptable files

  // 1. store original file in Supabase Storage
  const filePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: file.type });

  if (upErr)
    return NextResponse.json(
      { error: `Storage failed: ${upErr.message}` },
      { status: 500 },
    );

  // 2. create the documents row (status: processing)
  const [doc] = await db
    .insert(documents)
    .values({ userId, filename: file.name, filePath, status: "processing" })
    .returning();

  // 3. run ingestion (awaited for MVP simplicity; move to a background job
  //    once large files start hitting the serverless execution timeout)
  try {
    const { chunkCount } = await ingestDocument(doc.id, buffer, file.type);
    return NextResponse.json({ id: doc.id, status: "ready", chunkCount });
  } catch (err) {
    return NextResponse.json(
      { id: doc.id, status: "failed", error: String(err) },
      { status: 500 },
    );
  }
}
