import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const retrieveChunks = vi.fn();
vi.mock("@/lib/rag/retrieve", () => ({ retrieveChunks: (...a: unknown[]) => retrieveChunks(...a) }));
vi.mock("@ai-sdk/google", () => ({ google: () => ({ id: "gemini-2.5-flash" }) }));
vi.mock("ai", () => ({
  streamText: vi.fn(() => ({ stream: {} })),
  toTextStream: vi.fn(() => ({})),
  createTextStreamResponse: vi.fn(
    ({ headers }: { headers: Record<string, string> }) =>
      new Response("streamed", { headers }),
  ),
}));

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
  ({ json: async () => body } as unknown as Request);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  retrieveChunks.mockResolvedValue([chunk()]);
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

  it("500 when retrieval throws", async () => {
    retrieveChunks.mockRejectedValue(new Error("no key"));
    const res = await POST(jsonReq({ question: "hi" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Retrieval failed" });
  });

  it("streams with citations header and scopes retrieval to the user", async () => {
    const res = await POST(jsonReq({ question: "hi", documentId: "d1" }));
    expect(retrieveChunks).toHaveBeenCalledWith("hi", "user-1", {
      documentId: "d1",
      matchCount: 5,
    });
    const header = res.headers.get("x-citations");
    expect(header).toBeTruthy();
    expect(JSON.parse(atob(header!))).toEqual(toCitations([chunk()]));
  });
});
