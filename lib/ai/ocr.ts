import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import type { ExtractedPage } from "./extract";

/**
 * OCR fallback for scanned PDFs, done by Gemini itself (multimodal) — the PDF
 * bytes go straight to gemini-2.5-flash, no rendering step and no extra OCR
 * vendor. The 10 MB upload cap keeps the base64-inflated request under
 * Gemini's ~20 MB inline limit.
 */

// Below this density the "text layer" is page numbers / artifacts, not content.
const MIN_CHARS_PER_PAGE = 30;

const PAGE_MARKER = /^<<<PAGE (\d+)>>>$/gm;

const TRANSCRIBE_PROMPT = [
  "Transcribe this PDF verbatim, in its original language.",
  "Start every page with a line containing exactly <<<PAGE n>>> (n = the page number), then that page's text.",
  "Preserve paragraph breaks. Mark illegible fragments as [unreadable].",
  "Output only the transcription — no commentary, no summaries.",
].join("\n");

/** True when the extracted text layer is too sparse to be the real content. */
export function isLikelyScanned(
  pages: ExtractedPage[],
  numPages: number,
): boolean {
  const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
  return totalChars < MIN_CHARS_PER_PAGE * Math.max(numPages, 1);
}

/** Split marker-delimited model output into pages; marker-less output is page 1. */
export function parseOcrPages(raw: string): ExtractedPage[] {
  const pages: ExtractedPage[] = [];
  let match: RegExpExecArray | null;
  let last: { page: number; start: number } | null = null;

  PAGE_MARKER.lastIndex = 0;
  while ((match = PAGE_MARKER.exec(raw)) !== null) {
    if (last) {
      pages.push({
        page: last.page,
        text: raw.slice(last.start, match.index).trim(),
      });
    }
    last = { page: Number(match[1]), start: match.index + match[0].length };
  }

  if (!last) {
    const text = raw.trim();
    return text.length ? [{ page: 1, text }] : [];
  }

  pages.push({ page: last.page, text: raw.slice(last.start).trim() });
  return pages.filter((p) => p.text.length > 0);
}

/** Transcribe a scanned PDF with Gemini; returns per-page text like extractDocument. */
export async function ocrPdf(buffer: ArrayBuffer): Promise<ExtractedPage[]> {
  const result = await generateText({
    model: google("gemini-2.5-flash"),
    messages: [
      {
        role: "user",
        content: [
          { type: "file", data: buffer, mediaType: "application/pdf" },
          { type: "text", text: TRANSCRIBE_PROMPT },
        ],
      },
    ],
  });

  return parseOcrPages(result.text);
}
