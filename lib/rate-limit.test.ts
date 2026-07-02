import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const returning = vi.fn();
  const chain = {
    insert: vi.fn(),
    values: vi.fn(),
    onConflictDoUpdate: vi.fn(),
    returning,
  };
  chain.insert.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.onConflictDoUpdate.mockReturnValue(chain);
  return chain;
});

vi.mock("@/lib/db", () => ({ db: h }));

import { checkRateLimit } from "@/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  h.insert.mockReturnValue(h);
  h.values.mockReturnValue(h);
  h.onConflictDoUpdate.mockReturnValue(h);
  h.returning.mockResolvedValue([{ count: 1 }]);
});

afterEach(() => vi.useRealTimers());

describe("checkRateLimit", () => {
  it("allows a caller under the limit", async () => {
    h.returning.mockResolvedValue([{ count: 3 }]);
    expect(await checkRateLimit("u1", "chat", 5, 3_600_000)).toBe(true);
  });

  it("denies a caller over the limit", async () => {
    h.returning.mockResolvedValue([{ count: 6 }]);
    expect(await checkRateLimit("u1", "chat", 5, 3_600_000)).toBe(false);
  });

  it("fails open (allows) when the counter query errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.returning.mockRejectedValue(new Error("relation does not exist"));
    expect(await checkRateLimit("u1", "chat", 5, 3_600_000)).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("upserts a counter into the current fixed window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T10:34:56Z"));
    await checkRateLimit("u1", "upload", 20, 3_600_000);
    expect(h.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        bucket: "upload",
        windowStart: new Date("2026-07-02T10:00:00Z"),
        count: 1,
      }),
    );
    expect(h.onConflictDoUpdate).toHaveBeenCalled();
  });
});
