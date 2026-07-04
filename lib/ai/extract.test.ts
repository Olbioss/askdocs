import { describe, it, expect, vi, beforeEach } from "vitest";

const generateText = vi.fn();
vi.mock("ai", () => ({
  generateText: (...a: unknown[]) => generateText(...a),
}));
vi.mock("@ai-sdk/google", () => ({ google: vi.fn(() => "mock-gemini") }));

import { extractDocument } from "@/lib/ai/extract";

/** Minimal valid 1-page PDF with no content stream — a blank page, no text layer. */
function blankPdf(): ArrayBuffer {
  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const o of objs) {
    offsets.push(body.length);
    body += o;
  }
  const xrefStart = body.length;
  body += "xref\n0 4\n0000000000 65535 f \n";
  for (const off of offsets)
    body += String(off).padStart(10, "0") + " 00000 n \n";
  body += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new TextEncoder().encode(body).buffer as ArrayBuffer;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractDocument OCR fallback (real unpdf)", () => {
  it("OCRs a text-layer-less PDF and returns the transcription", async () => {
    generateText.mockResolvedValue({ text: "<<<PAGE 1>>>\nTaranmış içerik" });

    const pages = await extractDocument(blankPdf(), "application/pdf");

    expect(pages).toEqual([{ page: 1, text: "Taranmış içerik" }]);
  });

  it("hands the OCR call live bytes — pdf.js detaches the buffer it is given", async () => {
    generateText.mockResolvedValue({ text: "irrelevant" });

    await extractDocument(blankPdf(), "application/pdf");

    const call = generateText.mock.calls[0][0] as {
      messages: { content: { type: string; data?: ArrayBuffer }[] }[];
    };
    const filePart = call.messages[0].content.find((p) => p.type === "file");
    // a detached ArrayBuffer reports byteLength 0 and crashes the AI SDK
    expect(filePart?.data?.byteLength).toBeGreaterThan(0);
  });
});
