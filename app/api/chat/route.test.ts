import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const retrieveChunks = vi.fn();
vi.mock("@/lib/rag/retrieve", () => ({ retrieveChunks: (...a: unknown[]) => retrieveChunks(...a) }));
const checkRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));
vi.mock("@ai-sdk/google", () => ({ google: () => ({ id: "gemini-2.5-flash" }) }));
const streamText = vi.fn();
vi.mock("ai", () => ({ streamText: (...a: unknown[]) => streamText(...a) }));

import { POST, buildSystemPrompt, toCitations } from "@/app/api/chat/route";
import type { RetrievedChunk } from "@/lib/rag/retrieve";

const chunk = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  id: "c1",
  content: "ctx",
  documentId: "d1",
  filename: "a.pdf",
  page: 2,
  chunkIndex: 0,
  similarity: 0.912345,
  ...over,
});

const jsonReq = (body: unknown) =>
  ({
    json: async () => body,
    signal: new AbortController().signal,
  } as unknown as Request);

const ndjson = async (res: Response) =>
  (await res.text())
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  retrieveChunks.mockResolvedValue([chunk()]);
  checkRateLimit.mockResolvedValue(true);
  streamText.mockReturnValue({
    textStream: (async function* () {
      yield "Hello ";
      yield "world";
    })(),
  });
});

describe("buildSystemPrompt", () => {
  it("guards against answering when there is no context", () => {
    const p = buildSystemPrompt([]);
    expect(p).toMatch(/no relevant context/i);
    expect(p).toMatch(/do not/i);
  });
  it("numbers the context with source + page", () => {
    const p = buildSystemPrompt([chunk()]);
    expect(p).toContain("[1] (source: a.pdf, page 2)");
    expect(p).toContain("ctx");
  });
});

describe("toCitations", () => {
  it("maps chunk fields and rounds similarity to 3dp", () => {
    expect(toCitations([chunk()])).toEqual([
      {
        id: "c1",
        documentId: "d1",
        documentName: "a.pdf",
        content: "ctx",
        similarity: 0.912,
        metadata: { page: 2 },
      },
    ]);
  });
});

describe("POST /api/chat", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(jsonReq({ question: "hi" }))).status).toBe(401);
  });

  it("400 when question is empty", async () => {
    expect((await POST(jsonReq({ question: "  " }))).status).toBe(400);
  });

  it("400 when the body isn't valid JSON", async () => {
    const req = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
      signal: new AbortController().signal,
    } as unknown as Request;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/json/i) });
  });

  it("400 when question is not a string", async () => {
    expect((await POST(jsonReq({ question: 42 }))).status).toBe(400);
  });

  it("400 when question exceeds the length cap", async () => {
    const res = await POST(jsonReq({ question: "x".repeat(4001) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/long/i) });
  });

  it("400 when documentId is not a UUID", async () => {
    const res = await POST(jsonReq({ question: "hi", documentId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    expect(retrieveChunks).not.toHaveBeenCalled();
  });

  it("429 when over the chat rate limit, before any retrieval", async () => {
    checkRateLimit.mockResolvedValue(false);
    const res = await POST(jsonReq({ question: "hi" }));
    expect(res.status).toBe(429);
    expect(retrieveChunks).not.toHaveBeenCalled();
  });

  it("500 when retrieval throws", async () => {
    retrieveChunks.mockRejectedValue(new Error("no key"));
    const res = await POST(jsonReq({ question: "hi" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Retrieval failed", detail: expect.stringContaining("no key") });
  });

  const docId = "5a4e1c9e-2f7b-4d3a-9c1e-8b6f0a2d4e71";

  it("streams NDJSON — citations first, then text deltas — scoped to the user", async () => {
    const res = await POST(jsonReq({ question: "hi", documentId: docId }));
    expect(retrieveChunks).toHaveBeenCalledWith("hi", "user-1", {
      documentId: docId,
      matchCount: 5,
    });
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const lines = await ndjson(res);
    expect(lines[0]).toEqual({
      type: "citations",
      value: toCitations([chunk()]),
    });
    expect(lines.slice(1)).toEqual([
      { type: "text", value: "Hello " },
      { type: "text", value: "world" },
    ]);
  });

  it("emits an error event when the model fails mid-stream", async () => {
    streamText.mockReturnValue({
      textStream: (async function* () {
        yield "partial";
        throw new Error("model exploded");
      })(),
    });
    const lines = await ndjson(await POST(jsonReq({ question: "hi" })));
    expect(lines[1]).toEqual({ type: "text", value: "partial" });
    expect(lines[2]).toEqual({ type: "error", message: expect.any(String) });
  });

  it("passes the request's abort signal to generation", async () => {
    const req = jsonReq({ question: "hi" });
    await (await POST(req)).text();
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: req.signal }),
    );
  });
});
