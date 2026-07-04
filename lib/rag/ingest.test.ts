import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted so the db mock (with its fluent tx chains) exists before the
// hoisted vi.mock factories run — same pattern as retrieve.test.ts.
const h = vi.hoisted(() => {
  const txInsert = { values: vi.fn(async () => undefined) };
  const txUpdateSet = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
  const tx = {
    insert: vi.fn(() => txInsert),
    update: vi.fn(() => ({ set: txUpdateSet })),
  };
  const dbUpdateSet = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
  const db = {
    transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    update: vi.fn(() => ({ set: dbUpdateSet })),
  };
  return { db, tx, txInsert, txUpdateSet, dbUpdateSet };
});

vi.mock("@/lib/db", () => ({ db: h.db }));
const extractDocument = vi.fn();
vi.mock("@/lib/ai/extract", () => ({
  extractDocument: (...a: unknown[]) => extractDocument(...a),
}));
const chunkPages = vi.fn();
vi.mock("@/lib/ai/chunk", () => ({
  chunkPages: (...a: unknown[]) => chunkPages(...a),
}));
const embedChunks = vi.fn();
vi.mock("@/lib/ai/embed", () => ({
  embedChunks: (...a: unknown[]) => embedChunks(...a),
}));

import { ingestDocument } from "@/lib/rag/ingest";
import { chunks } from "@/lib/db/schema";

const buf = new ArrayBuffer(0);

beforeEach(() => {
  vi.clearAllMocks();
  extractDocument.mockResolvedValue([{ page: 1, text: "hello world" }]);
  chunkPages.mockReturnValue([
    { content: "c1", metadata: { page: 1, chunkIndex: 0 } },
    { content: "c2", metadata: { page: 1, chunkIndex: 1 } },
  ]);
  embedChunks.mockResolvedValue([[0.1], [0.2]]);
});

describe("ingestDocument", () => {
  it("inserts chunks and marks ready inside a single transaction", async () => {
    const res = await ingestDocument("doc-1", buf, "application/pdf");
    expect(res).toEqual({ chunkCount: 2 });
    expect(h.db.transaction).toHaveBeenCalledTimes(1);
    expect(h.tx.insert).toHaveBeenCalledWith(chunks);
    expect(h.txInsert.values).toHaveBeenCalledWith([
      { documentId: "doc-1", content: "c1", embedding: [0.1], metadata: { page: 1, chunkIndex: 0 } },
      { documentId: "doc-1", content: "c2", embedding: [0.2], metadata: { page: 1, chunkIndex: 1 } },
    ]);
    expect(h.txUpdateSet).toHaveBeenCalledWith({ status: "ready" });
  });

  it("marks the document failed when embedding throws", async () => {
    embedChunks.mockRejectedValue(new Error("quota"));
    await expect(ingestDocument("doc-1", buf, "application/pdf")).rejects.toThrow("quota");
    expect(h.db.transaction).not.toHaveBeenCalled();
    expect(h.dbUpdateSet).toHaveBeenCalledWith({ status: "failed" });
  });

  it("marks the document failed when nothing is extractable", async () => {
    extractDocument.mockResolvedValue([]);
    await expect(ingestDocument("doc-1", buf, "application/pdf")).rejects.toThrow(
      /metin çıkarılamadı/i,
    );
    expect(h.dbUpdateSet).toHaveBeenCalledWith({ status: "failed" });
  });
});
