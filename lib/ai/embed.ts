import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

/**
 * Embedding configuration for AskDocs.
 *
 * Model: gemini-embedding-001 (text-embedding-004 is deprecated as of Jan 2026).
 * Dimensions: 768 — requested via outputDimensionality so it matches the
 *   vector(768) column + HNSW index in the Drizzle schema.
 *
 * IMPORTANT: at any non-default dimension (i.e. not 3072) gemini-embedding-001
 * returns vectors that are NOT pre-normalized. Cosine distance in pgvector only
 * ranks correctly on unit-length vectors, so every embedding is L2-normalized
 * here before it leaves this module. Both the ingest path (embedChunks) and the
 * query path (embedQuery) go through the same normalize() step to guarantee the
 * stored vectors and the query vector live in the same normalized space.
 */
const DIMENSIONS = 768;

const embeddingModel = google.embeddingModel("gemini-embedding-001");

/** L2-normalize a single vector to unit length. */
function normalize(vec: number[]): number[] {
  let sumSquares = 0;
  for (const x of vec) sumSquares += x * x;
  const norm = Math.sqrt(sumSquares);
  // guard against a zero vector (would divide by zero)
  return norm === 0 ? vec : vec.map((x) => x / norm);
}

/**
 * Embed many chunk texts in one batched call, normalized.
 * Uses RETRIEVAL_DOCUMENT — these are the stored "documents" side of the
 * asymmetric retrieval pair. Output order matches input order.
 */
export async function embedChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    maxParallelCalls: 2, // gentle on the free-tier rate limit
    providerOptions: {
      google: {
        outputDimensionality: DIMENSIONS,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    },
  });

  return embeddings.map(normalize);
}

/**
 * Embed a single query string, normalized.
 * Uses RETRIEVAL_QUERY — the "query" side of the asymmetric pair, which the
 * model optimizes differently from documents for better match quality.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });

  return normalize(embedding);
}

// Exported for reuse elsewhere (e.g. schema dimension assertions in tests).
export const EMBEDDING_DIMENSIONS = DIMENSIONS;
export const EMBEDDING_MODEL_ID = "gemini-embedding-001";
