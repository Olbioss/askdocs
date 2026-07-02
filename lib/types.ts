// Client-facing types. These mirror the Drizzle schema (lib/db/schema.ts) and
// the retrieval shape returned by retrieveChunks() (lib/rag/retrieve.ts), trimmed
// to what the UI actually needs.

export type DocumentStatus = "processing" | "ready" | "failed";

export interface Document {
  id: string;
  filename: string;
  status: DocumentStatus;
  createdAt: string; // ISO 8601
  /** Optional UI niceties (not all surfaced by every backend). */
  size?: number; // bytes
  pages?: number;
  chunkCount?: number;
}

export interface CitationMetadata {
  page?: number;
  section?: string;
}

/** One retrieved chunk backing an answer — `similarity` is 0..1 (1 = closest). */
export interface Citation {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  similarity: number;
  metadata?: CitationMetadata;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Citation[];
  pending?: boolean;
  createdAt: string;
}

/**
 * Streamed from askQuestion() as NDJSON lines: a citations payload first,
 * then text deltas; an error event if generation fails mid-stream.
 */
export type ChatStreamEvent =
  | { type: "text"; value: string }
  | { type: "citations"; value: Citation[] }
  | { type: "error"; message: string };

export interface AskInput {
  question: string;
  documentId?: string;
}
