import { eq } from "drizzle-orm";
import { chunkPages } from "../ai/chunk";
import { embedChunks } from "../ai/embed";
import { extractDocument } from "../ai/extract";
import { db } from "../db";
import { chunks, documents } from "../db/schema";

/**
 * Known ingestion failures carry a code so the upload route can surface a
 * message in the request's locale; the English message is a fallback for logs.
 */
export class IngestError extends Error {
  constructor(public code: "no_text" | "no_chunks") {
    super(
      code === "no_text"
        ? "No text could be extracted — the file may be empty or image-only"
        : "The document's content couldn't be processed",
    );
    this.name = "IngestError";
  }
}

export async function ingestDocument(
  documentId: string,
  buffer: ArrayBuffer,
  mimeType: string,
) {
  try {
    const pages = await extractDocument(buffer, mimeType);
    if (pages.length === 0) throw new IngestError("no_text");

    const pieces = chunkPages(pages);
    if (pieces.length === 0) throw new IngestError("no_chunks");

    const embeddings = await embedChunks(pieces.map((p) => p.content));

    // one transaction: chunks must never be queryable while the document
    // isn't "ready" (and vice versa on failure)
    await db.transaction(async (tx) => {
      // bulk insert - embeddings line up with pieces by index
      await tx.insert(chunks).values(
        pieces.map((p, i) => ({
          documentId,
          content: p.content,
          embedding: embeddings[i],
          metadata: p.metadata,
        })),
      );

      await tx
        .update(documents)
        .set({ status: "ready" })
        .where(eq(documents.id, documentId));
    });

    return { chunkCount: pieces.length };
  } catch (err) {
    await db
      .update(documents)
      .set({ status: "failed" })
      .where(eq(documents.id, documentId));
    throw err;
  }
}
