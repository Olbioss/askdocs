import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

/** All MIME types the pipeline can ingest. Use this in the upload route's allow-list. */
export const SUPPORTED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/markdown",
];

/**
 * Extract text from a file buffer.
 *
 * PDFs return one ExtractedPage per page (real page numbers for citations).
 * DOCX and plain text have no fixed pagination, so they return a single
 * page (page: 1); positional citation info comes from chunkIndex downstream.
 *
 * Legacy .doc (binary OLE2 format) is intentionally unsupported: mammoth only
 * reads .docx, and there's no clean serverless library for .doc. We detect it
 * and throw a clear, actionable error rather than failing cryptically.
 */

export type ExtractedPage = { page: number; text: string };
/** All MIME types the pipeline can ingest. Use this in the upload route's allow-list. */
export async function extractDocument(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<ExtractedPage[]> {
  if (mimeType === "application/pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: false });
    // extractText with mergePages:false returns string[] (one per page)
    const pages = Array.isArray(text) ? text : [text];
    return pages
      .map((t, i) => ({ page: i + 1, text: t.trim() }))
      .filter((p) => p.text.length > 0);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // mammoth wants a Node Buffer; extractRawText ignores all formatting
    // and returns plain text with paragraphs separated by blank lines.
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });
    const text = value.trim();
    return text.length ? [{ page: 1, text }] : [];
  }

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    const text = new TextDecoder().decode(buffer).trim();
    return text.length ? [{ page: 1, text }] : [];
  }

  if (mimeType === "application/msword") {
    throw new Error(
      "Legacy .doc files aren't supported. Please save as .docx or PDF and re-upload.",
    );
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
