import { db } from "../db";
import { chunks } from "../db/schema";

export async function storeChunk(
  documentId: string,
  content: string,
  embedding: number[],
  metadata: Record<string, unknown>,
) {
  await db.insert(chunks).values({
    documentId,
    content,
    embedding,
    metadata,
  });
}
