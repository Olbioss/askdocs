import { afterEach, describe, expect, it, vi } from "vitest";
import { requireEnv } from "@/lib/env";

afterEach(() => vi.unstubAllEnvs());

describe("requireEnv", () => {
  it("returns the value when set", () => {
    vi.stubEnv("ASKDOCS_TEST_VAR", "hello");
    expect(requireEnv("ASKDOCS_TEST_VAR")).toBe("hello");
  });

  it("throws naming the variable when missing", () => {
    vi.stubEnv("ASKDOCS_TEST_VAR", "");
    expect(() => requireEnv("ASKDOCS_TEST_VAR")).toThrow(/ASKDOCS_TEST_VAR/);
  });
});
