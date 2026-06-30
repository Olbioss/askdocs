import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { chunks, documents } from "../db/schema";
import { db } from "../db";
import { embedQuery } from "../ai/embed";

export type RetrievedChunk = {
  id: string;
  content: string;
  documentId: string;
  filename: string;
  page: number | null;
  chunkIndex: number | null;
  similarity: number;
};

/**
 * Retrieve the most relevant chunks for a question, scoped to a user's own
 * documents (Architecture A: we enforce ownership explicitly here).
 *
 * @param question    the user's natural-language query
 * @param userId      server-verified user id — only this user's docs are searched
 * @param opts.documentId  optional: restrict to a single document ("ask this file")
 * @param opts.matchCount  how many chunks to return (default 5)
 * @param opts.minSimilarity  drop weak matches below this cosine similarity (0..1)
 */
export async function retrieveChunks(
  question: string,
  userId: string,
  opts: { documentId?: string; matchCount?: number; minSimilarity?: number },
): Promise<RetrievedChunk[]> {
  const { documentId, matchCount = 5, minSimilarity = 0.3 } = opts;

  // 1. embed the question (RETRIEVAL_QUERY task type, normalized — see embed.ts)
  const queryEmbedding = await embedQuery(question);
  // similarity = 1 - cosine distance
  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, queryEmbedding)})`;
  // 2. ownership + optional single-doc filter, joined to documents
  const ownership = and(
    eq(documents.userId, userId),
    documentId ? eq(chunks.documentId, documentId) : undefined,
  );

  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      documentId: chunks.documentId,
      filename: documents.filename,
      metadata: chunks.metadata,
      similarity,
    })
    .from(chunks)
    .innerJoin(documents, eq(documents.id, chunks.documentId))
    .where(and(ownership, gt(similarity, minSimilarity)))
    .orderBy(desc(similarity))
    .limit(matchCount);

  // 3. flatten metadata (page / chunkIndex live in the jsonb column)
  return rows.map((r) => {
    const meta = (r.metadata ?? {}) as { page?: number; chunkIndex?: number };
    return {
      id: r.id,
      content: r.content,
      documentId: r.documentId,
      filename: r.filename,
      page: meta.page ?? null,
      chunkIndex: meta.chunkIndex ?? null,
      similarity: r.similarity,
    };
  });
}
