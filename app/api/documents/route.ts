// Stub: not implemented yet. The frontend reaches these via
// lib/data/client.ts (currently mocked). Implement list (GET) and
// delete (DELETE ?id=) against the documents table, then flip USE_MOCKS.

import { db } from "@/lib/db";
import { chunks, documents } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { Document } from "@/lib/types";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/documents
 * Returns the authenticated user's documents (newest first), shaped to the
 * Document type the UI/mock layer expects. Includes a chunk count per doc.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // documents + their chunk counts, scoped to this user
  const rows = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      status: documents.status,
      createdAt: documents.createdAt,
      chunkCount: sql<number>`count(${chunks.id})::int`,
    })
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(eq(documents.userId, user.id))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));

  const result: Document[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    status: (r.status ?? "processing") as Document["status"],
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
    chunkCount: r.chunkCount ?? 0,
  }));

  return NextResponse.json(result, { status: 200 });
}

/**
 * DELETE /api/documents?id=<documentId>
 * Removes the storage object, the chunks, and the document row — but only if
 * the document belongs to the authenticated user.
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });

  // 1. verify ownership + get the storage path (scoped select)
  const [doc] = await db
    .select({ id: documents.id, filePath: documents.filePath })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
    .limit(1);

  if (!doc) {
    // either doesn't exist or isn't theirs — don't distinguish (avoid leaking existence)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // 2. remove the original file from storage
  const { error: storageErr } = await supabase.storage
    .from("documents")
    .remove([doc.filePath]);
  if (storageErr) {
    // log but continue — a dangling storage object is less bad than a half-delete
    console.error("Storage delete failed:", storageErr.message);
  }

  // 3. delete the row. chunks cascade automatically via the FK
  //    (chunks.document_id references documents.id ON DELETE CASCADE)
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)));

  return NextResponse.json({ ok: true, id }, { status: 200 });
}
