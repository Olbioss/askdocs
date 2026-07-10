import { describe, it, expect } from "vitest";
import { resolveLocale } from "@/lib/i18n/get-locale";

const withHeaders = (headers: Record<string, string>) =>
  ({ headers: new Headers(headers) }) as unknown as Request;

describe("resolveLocale", () => {
  it("prefers the x-locale header", () => {
    expect(resolveLocale(withHeaders({ "x-locale": "tr" }))).toBe("tr");
    expect(resolveLocale(withHeaders({ "x-locale": "en" }))).toBe("en");
  });

  it("falls back to the NEXT_LOCALE cookie", () => {
    expect(
      resolveLocale(withHeaders({ cookie: "a=b; NEXT_LOCALE=tr; c=d" })),
    ).toBe("tr");
  });

  it("header wins over cookie", () => {
    expect(
      resolveLocale(withHeaders({ "x-locale": "en", cookie: "NEXT_LOCALE=tr" })),
    ).toBe("en");
  });

  it("rejects unknown locales", () => {
    expect(resolveLocale(withHeaders({ "x-locale": "de" }))).toBe("en");
    expect(resolveLocale(withHeaders({ cookie: "NEXT_LOCALE=xx" }))).toBe("en");
  });

  it("defaults to en for bare test doubles without headers", () => {
    expect(resolveLocale({} as unknown as Request)).toBe("en");
  });
});
