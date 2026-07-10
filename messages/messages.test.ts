import { describe, it, expect } from "vitest";
import en from "./en.json";
import tr from "./tr.json";

// The catalogs must stay structurally identical — a key present in one
// language but not the other surfaces as a runtime MISSING_MESSAGE.
function keyTree(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [`${prefix}[]`];
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) =>
      keyTree(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe("message catalogs", () => {
  it("en and tr have identical key trees", () => {
    expect(keyTree(en).sort()).toEqual(keyTree(tr).sort());
  });

  it("placeholders match between locales", () => {
    const placeholders = (o: unknown): Map<string, string> => {
      const map = new Map<string, string>();
      for (const [key, value] of Object.entries(
        flatten(o as Record<string, unknown>),
      )) {
        // Drop ICU clause bodies (`one {…}` / `other {…}`) so only real
        // argument names remain, then dedupe.
        const cleaned = value.replace(
          /(zero|one|two|few|many|other|=\d+)\s*\{[^}]*\}/g,
          "",
        );
        const found = [
          ...new Set([...cleaned.matchAll(/\{(\w+)/g)].map((m) => m[1])),
        ]
          .sort()
          .join(",");
        map.set(key, found);
      }
      return map;
    };
    const flatten = (
      obj: Record<string, unknown>,
      prefix = "",
    ): Record<string, string> =>
      Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") acc[key] = v;
        else if (v && typeof v === "object" && !Array.isArray(v))
          Object.assign(acc, flatten(v as Record<string, unknown>, key));
        return acc;
      }, {});

    expect(placeholders(en)).toEqual(placeholders(tr));
  });
});
