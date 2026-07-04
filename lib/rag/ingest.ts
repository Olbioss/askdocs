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
    if (pages.length === 0)
      throw new Error(
        "Belgeden metin çıkarılamadı — dosya boş ya da salt görüntü olabilir",
      );

    const pieces = chunkPages(pages);
    if (pieces.length === 0) throw new Error("Belge içeriği işlenemedi");

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
