import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { chunks, documents } from "./schema";

/** Insert a new document row (status: processing) and return it. */
export async function createDocument(input: {
  userId: string;
  filename: string;
  filePath: string;
}) {
  const [doc] = await db
    .insert(documents)
    .values({ ...input, status: "processing" })
    .returning();
  return doc;
}

/** A user's documents with per-doc chunk counts, newest first. */
export async function listDocumentsWithCounts(userId: string) {
  return db
    .select({
      id: documents.id,
      filename: documents.filename,
      status: documents.status,
      createdAt: documents.createdAt,
      chunkCount: sql<number>`count(${chunks.id})::int`,
    })
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(eq(documents.userId, userId))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));
}

/** Fetch a document's id + storage path only if it belongs to the user. */
export async function getOwnedDocument(id: string, userId: string) {
  const [doc] = await db
    .select({ id: documents.id, filePath: documents.filePath })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);
  return doc;
}

/** Delete a user's document (chunks cascade via FK). */
export async function deleteOwnedDocument(id: string, userId: string) {
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}
