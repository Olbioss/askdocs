import {
  deleteOwnedDocument,
  getOwnedDocument,
  listDocumentsWithCounts,
} from "@/lib/db/documents";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http";
import { Document } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const rows = await listDocumentsWithCounts(user.id);
  const result: Document[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    status: (r.status ?? "processing") as Document["status"],
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    chunkCount: r.chunkCount ?? 0,
  }));
  return NextResponse.json(result, { status: 200 });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Missing document id", 400);

  const doc = await getOwnedDocument(id, user.id);
  if (!doc) return jsonError("Document not found", 404);

  // DB row first — it's the source of truth. A failed storage removal only
  // orphans a file (logged below); the reverse order could strand a row whose
  // file is already gone.
  await deleteOwnedDocument(id, user.id);

  const { error: storageErr } = await supabase.storage
    .from("documents")
    .remove([doc.filePath]);
  if (storageErr) console.error("Storage delete failed:", storageErr.message);

  return NextResponse.json({ ok: true, id }, { status: 200 });
}
