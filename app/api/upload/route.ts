import { SUPPORTED_MIMES } from "@/lib/ai/extract";
import { createDocument } from "@/lib/db/documents";
import { ingestDocument } from "@/lib/rag/ingest";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http";
import { NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Ingestion runs inline (extract → embed → store), so give large files headroom.
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);
  const userId = user.id;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("No file provided", 400);

  // Friendly rejection for legacy .doc — MUST come before the SUPPORTED_MIMES allow-list below, or the bland "Unsupported type" 415 wins.
  if (file.type === "application/msword") {
    return jsonError(
      "Legacy .doc files aren't supported — please save as .docx or PDF and re-upload.",
      415,
    );
  }
  if (!SUPPORTED_MIMES.includes(file.type)) {
    return jsonError(`Unsupported type: ${file.type}`, 415);
  }
  // Check size BEFORE reading the file into memory — File.size needs no read.
  if (file.size > MAX_BYTES) return jsonError("File too large (max 10MB)", 413);

  const buffer = await file.arrayBuffer();

  const filePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: file.type });
  if (upErr) return jsonError(`Storage failed: ${upErr.message}`, 500);

  const doc = await createDocument({ userId, filename: file.name, filePath });

  // Ingestion is awaited for MVP simplicity; move to a background job once large files approach the serverless timeout.
  try {
    const { chunkCount } = await ingestDocument(doc.id, buffer, file.type);
    return NextResponse.json({
      id: doc.id,
      filename: doc.filename,
      createdAt: (doc.createdAt ?? new Date()).toISOString(),
      status: "ready",
      chunkCount,
    });
  } catch (err) {
    return jsonError(String(err), 500, { id: doc.id, status: "failed" });
  }
}
