import { describe, it, expect, vi, beforeEach } from "vitest";

const generateText = vi.fn();
vi.mock("ai", () => ({
  generateText: (...a: unknown[]) => generateText(...a),
}));
vi.mock("@ai-sdk/google", () => ({ google: vi.fn(() => "mock-gemini") }));

import { isLikelyScanned, parseOcrPages, ocrPdf } from "@/lib/ai/ocr";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isLikelyScanned", () => {
  it("is true when the text layer is empty", () => {
    expect(isLikelyScanned([], 3)).toBe(true);
  });

  it("is true when pages hold only sparse artifacts", () => {
    const pages = [
      { page: 1, text: "3" },
      { page: 2, text: "- 4 -" },
    ];
    expect(isLikelyScanned(pages, 4)).toBe(true);
  });

  it("is false for a normal short document", () => {
    const pages = [{ page: 1, text: "x".repeat(200) }];
    expect(isLikelyScanned(pages, 1)).toBe(false);
  });
});

describe("parseOcrPages", () => {
  it("splits marker-delimited output into real page numbers", () => {
    const raw =
      "<<<PAGE 1>>>\nFirst page text.\n\n<<<PAGE 2>>>\nSecond page.\n";
    expect(parseOcrPages(raw)).toEqual([
      { page: 1, text: "First page text." },
      { page: 2, text: "Second page." },
    ]);
  });

  it("treats marker-less output as a single page 1", () => {
    expect(parseOcrPages("  Just a transcription.  ")).toEqual([
      { page: 1, text: "Just a transcription." },
    ]);
  });

  it("drops empty pages", () => {
    const raw = "<<<PAGE 1>>>\n\n<<<PAGE 2>>>\nContent";
    expect(parseOcrPages(raw)).toEqual([{ page: 2, text: "Content" }]);
  });

  it("returns nothing for blank output", () => {
    expect(parseOcrPages("   \n  ")).toEqual([]);
  });
});

describe("ocrPdf", () => {
  it("sends the PDF bytes as a file part and parses the transcription", async () => {
    generateText.mockResolvedValue({ text: "<<<PAGE 1>>>\nMerhaba dünya" });
    const buf = new ArrayBuffer(8);

    const pages = await ocrPdf(buf);

    expect(pages).toEqual([{ page: 1, text: "Merhaba dünya" }]);
    const call = generateText.mock.calls[0][0] as {
      messages: {
        role: string;
        content: { type: string; data?: unknown; mediaType?: string; text?: string }[];
      }[];
    };
    const content = call.messages[0].content;
    expect(content).toContainEqual({
      type: "file",
      data: buf,
      mediaType: "application/pdf",
    });
    const prompt = content.find((p) => p.type === "text")?.text ?? "";
    expect(prompt).toMatch(/transcribe/i);
    expect(prompt).toContain("<<<PAGE");
  });
});
