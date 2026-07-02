import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@ai-sdk/google", () => ({
  google: { embeddingModel: () => ({ id: "gemini-embedding-001" }) },
}));
vi.mock("ai", () => ({ embed: vi.fn(), embedMany: vi.fn() }));

import { embed, embedMany } from "ai";
import { embedChunks, embedQuery } from "@/lib/ai/embed";

describe("embedChunks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] and skips the model for empty input", async () => {
    expect(await embedChunks([])).toEqual([]);
    expect(embedMany).not.toHaveBeenCalled();
  });

  it("L2-normalizes each vector and preserves order", async () => {
    vi.mocked(embedMany).mockResolvedValue({ embeddings: [[3, 4], [0, 5]] } as never);
    expect(await embedChunks(["a", "b"])).toEqual([[0.6, 0.8], [0, 1]]);
  });

  it("requests 768 dims with RETRIEVAL_DOCUMENT", async () => {
    vi.mocked(embedMany).mockResolvedValue({ embeddings: [[1, 0]] } as never);
    await embedChunks(["a"]);
    expect(embedMany).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ["a"],
        providerOptions: {
          google: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" },
        },
      }),
    );
  });
});

describe("embedQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes and uses RETRIEVAL_QUERY", async () => {
    vi.mocked(embed).mockResolvedValue({ embedding: [3, 4] } as never);
    expect(await embedQuery("q")).toEqual([0.6, 0.8]);
    expect(embed).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "q",
        providerOptions: {
          google: { outputDimensionality: 768, taskType: "RETRIEVAL_QUERY" },
        },
      }),
    );
  });
});
