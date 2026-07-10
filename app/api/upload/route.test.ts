import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const upload = vi.fn();
const remove = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    storage: { from: () => ({ upload, remove }) },
  }),
}));
vi.mock("@/lib/ai/extract", () => ({
  SUPPORTED_MIMES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
}));
const createDocument = vi.fn();
vi.mock("@/lib/db/documents", () => ({ createDocument: (i: unknown) => createDocument(i) }));
const ingestDocument = vi.fn();
vi.mock("@/lib/rag/ingest", () => {
  // Stand-in class (not importActual — the real module pulls in the db):
  // the route imports IngestError from this same mock, so instanceof works.
  class IngestError extends Error {
    constructor(public code: "no_text" | "no_chunks") {
      super(code);
      this.name = "IngestError";
    }
  }
  return { IngestError, ingestDocument: (...a: unknown[]) => ingestDocument(...a) };
});
const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));

import { POST } from "@/app/api/upload/route";
import { IngestError } from "@/lib/rag/ingest";

function reqWith(file: unknown) {
  const form = new FormData();
  if (file) form.append("file", file as Blob);
  return { formData: async () => form } as unknown as Request;
}
const pdf = (name = "a.pdf") =>
  new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  checkRateLimit.mockResolvedValue(true);
  createDocument.mockResolvedValue({
    id: "doc-1",
    filename: "a.pdf",
    filePath: "user-1/uuid-a.pdf",
    status: "processing",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    userId: "user-1",
  });
  ingestDocument.mockResolvedValue({ chunkCount: 12 });
});

describe("POST /api/upload", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(reqWith(pdf()))).status).toBe(401);
  });

  it("400 when no file", async () => {
    expect((await POST(reqWith(null))).status).toBe(400);
  });

  it("429 when over the upload rate limit, before touching storage", async () => {
    checkRateLimit.mockResolvedValue(false);
    const res = await POST(reqWith(pdf()));
    expect(res.status).toBe(429);
    expect(upload).not.toHaveBeenCalled();
  });

  it("415 for legacy .doc", async () => {
    const doc = new File(["x"], "a.doc", { type: "application/msword" });
    const res = await POST(reqWith(doc));
    expect(res.status).toBe(415);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining(".docx") });
  });

  it("415 for unsupported type", async () => {
    const png = new File(["x"], "a.png", { type: "image/png" });
    expect((await POST(reqWith(png))).status).toBe(415);
  });

  it("413 when over 10MB", async () => {
    const big = pdf("big.pdf");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    expect((await POST(reqWith(big))).status).toBe(413);
  });

  it("happy path returns the indexed document", async () => {
    const res = await POST(reqWith(pdf()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "doc-1",
      filename: "a.pdf",
      createdAt: "2026-07-01T00:00:00.000Z",
      status: "ready",
      chunkCount: 12,
    });
    expect(createDocument).toHaveBeenCalledWith({
      userId: "user-1",
      filename: "a.pdf",
      filePath: expect.stringMatching(/^user-1\//),
    });
    expect(ingestDocument).toHaveBeenCalledWith("doc-1", expect.anything(), "application/pdf");
  });

  it("500 when storage upload fails", async () => {
    upload.mockResolvedValue({ error: { message: "boom" } });
    expect((await POST(reqWith(pdf()))).status).toBe(500);
  });

  it("sanitizes the storage path but keeps the original filename", async () => {
    const res = await POST(reqWith(pdf("héllo wörld?.pdf")));
    expect(res.status).toBe(200);
    const path = upload.mock.calls[0][0] as string;
    expect(path).toMatch(/^user-1\/[0-9a-f-]{36}-h_llo_w_rld_\.pdf$/);
    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "héllo wörld?.pdf" }),
    );
  });

  it("removes the stored file when the DB insert fails (500)", async () => {
    createDocument.mockRejectedValue(new Error("db down"));
    const res = await POST(reqWith(pdf()));
    expect(res.status).toBe(500);
    const path = upload.mock.calls[0][0] as string;
    expect(remove).toHaveBeenCalledWith([path]);
  });

  it("500 with failed status when ingestion throws", async () => {
    ingestDocument.mockRejectedValue(new Error("bad"));
    const res = await POST(reqWith(pdf()));
    expect(res.status).toBe(500);
    // the raw Error message, without a serialized "Error: " prefix
    expect(await res.json()).toMatchObject({
      id: "doc-1",
      status: "failed",
      error: "bad",
    });
  });

  it("localizes known ingest failures via their code (default en)", async () => {
    ingestDocument.mockRejectedValue(new IngestError("no_text"));
    const res = await POST(reqWith(pdf()));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({
      id: "doc-1",
      status: "failed",
      error: expect.stringMatching(/no text could be extracted/i),
    });
  });

  it("localizes known ingest failures in Turkish with x-locale", async () => {
    ingestDocument.mockRejectedValue(new IngestError("no_text"));
    const form = new FormData();
    form.append("file", pdf());
    const req = {
      formData: async () => form,
      headers: new Headers({ "x-locale": "tr" }),
    } as unknown as Request;
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/metin çıkarılamadı/i),
    });
  });
});
