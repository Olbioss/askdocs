import { describe, it, expect } from "vitest";
import { jsonError } from "@/lib/http";

describe("jsonError", () => {
  it("sets the status and an { error } body", async () => {
    const res = jsonError("nope", 400);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "nope" });
  });

  it("merges extra fields", async () => {
    const res = jsonError("bad", 500, { detail: "x" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "bad", detail: "x" });
  });
});
