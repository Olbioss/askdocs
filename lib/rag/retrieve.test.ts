import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before the hoisted vi.mock factory, so `chain` is available
// both inside the factory and in the test bodies — no globalThis needed.
const chain = vi.hoisted(() => {
  const c = {
    select: vi.fn(),
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };
  c.select.mockReturnValue(c);
  c.from.mockReturnValue(c);
  c.innerJoin.mockReturnValue(c);
  c.where.mockReturnValue(c);
  c.orderBy.mockReturnValue(c);
  return c;
});

vi.mock("@/lib/db", () => ({ db: chain }));
vi.mock("@/lib/ai/embed", () => ({ embedQuery: vi.fn() }));

import { embedQuery } from "@/lib/ai/embed";
import { retrieveChunks } from "@/lib/rag/retrieve";

describe("retrieveChunks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("embeds the question, joins documents, maps rows, honors matchCount", async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1, 0.2]);
    chain.limit.mockResolvedValue([
      {
        id: "c1",
        content: "hello",
        documentId: "d1",
        filename: "a.pdf",
        metadata: { page: 3, chunkIndex: 2 },
        similarity: 0.91,
      },
    ]);

    const out = await retrieveChunks("q", "user-1", { matchCount: 4 });

    expect(embedQuery).toHaveBeenCalledWith("q");
    expect(chain.innerJoin).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(4);
    expect(out).toEqual([
      {
        id: "c1",
        content: "hello",
        documentId: "d1",
        filename: "a.pdf",
        page: 3,
        chunkIndex: 2,
        similarity: 0.91,
      },
    ]);
  });

  it("defaults page/chunkIndex to null and matchCount to 5", async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1]);
    chain.limit.mockResolvedValue([
      {
        id: "c2",
        content: "x",
        documentId: "d2",
        filename: "b.md",
        metadata: null,
        similarity: 0.5,
      },
    ]);
    const out = await retrieveChunks("q", "user-1", {});
    expect(embedQuery).toHaveBeenCalledWith("q");
    expect(out[0].page).toBeNull();
    expect(out[0].chunkIndex).toBeNull();
    expect(chain.limit).toHaveBeenCalledWith(5);
  });
});
