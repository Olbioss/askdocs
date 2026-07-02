import { describe, it, expect } from "vitest";
import { chunkPages } from "@/lib/ai/chunk";

describe("chunkPages", () => {
  it("returns [] for no pages", () => expect(chunkPages([])).toEqual([]));

  it("emits one chunk for a short page with page + index metadata", () => {
    const out = chunkPages([{ page: 1, text: "hello world" }]);
    expect(out).toEqual([
      { content: "hello world", metadata: { page: 1, chunkIndex: 0 } },
    ]);
  });

  it("splits at size and carries overlap between chunks", () => {
    const a = "A".repeat(1500);
    const b = "B".repeat(1500);
    const out = chunkPages([{ page: 1, text: `${a}\n\n${b}` }]);
    expect(out).toHaveLength(2);
    expect(out[0].content).toBe(a);
    expect(out[1].content.startsWith("A".repeat(200))).toBe(true);
    expect(out[1].content.endsWith(b)).toBe(true);
    expect(out.map((c) => c.metadata.chunkIndex)).toEqual([0, 1]);
  });

  it("hard-splits a single giant paragraph with overlap", () => {
    const out = chunkPages([{ page: 1, text: "C".repeat(2500) }]);
    expect(out).toHaveLength(2);
    expect(out[0].content).toBe("C".repeat(2000));
    expect(out[1].content).toBe("C".repeat(700));
  });

  it("preserves page numbers and increments chunkIndex across pages", () => {
    const out = chunkPages([
      { page: 5, text: "x" },
      { page: 9, text: "y" },
    ]);
    expect(out).toEqual([
      { content: "x", metadata: { page: 5, chunkIndex: 0 } },
      { content: "y", metadata: { page: 9, chunkIndex: 1 } },
    ]);
  });
});
