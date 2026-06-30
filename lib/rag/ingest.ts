import { eq } from "drizzle-orm";
import { chunkPages } from "../ai/chunk";
import { embedChunks } from "../ai/embed";
import { extractDocument } from "../ai/extract";
import { db } from "../db";
import { chunks, documents } from "../db/schema";

export async function ingestDocument(
  documentId: string,
  buffer: ArrayBuffer,
  mimeType: string,
) {
  try {
    const pages = await extractDocument(buffer, mimeType);
    if (pages.length === 0) throw new Error("No extractable text found");

    const pieces = chunkPages(pages);
    if (pieces.length === 0) throw new Error("No chunks produced");

    const embeddings = await embedChunks(pieces.map((p) => p.content));

    // bulk insert - embeddings line up with pieces by index
    await db.insert(chunks).values(
      pieces.map((p, i) => ({
        documentId,
        content: p.content,
        embedding: embeddings[i],
        metadata: p.metadata,
      })),
    );

    await db
      .update(documents)
      .set({ status: "ready" })
      .where(eq(documents.id, documentId));

    return { chunkCount: pieces.length };
  } catch (err) {
    await db
      .update(documents)
      .set({ status: "failed" })
      .where(eq(documents.id, documentId));
    throw err;
  }
}
