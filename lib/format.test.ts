import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { relativeTime, formatBytes, fileExt } from "@/lib/format";

describe("formatBytes", () => {
  it("handles undefined", () => expect(formatBytes(undefined)).toBe("—"));
  it("formats bytes", () => expect(formatBytes(0)).toBe("0 B"));
  it("formats KB with one decimal under 10", () =>
    expect(formatBytes(1536)).toBe("1.5 KB"));
  it("formats whole KB", () => expect(formatBytes(184320)).toBe("180 KB"));
  it("formats MB", () => expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB"));
});

describe("fileExt", () => {
  it("upper-cases the extension", () => expect(fileExt("a.pdf")).toBe("PDF"));
  it("uses last dot", () => expect(fileExt("a.tar.gz")).toBe("GZ"));
  it("returns FILE when no extension", () => expect(fileExt("noext")).toBe("FILE"));
});

describe("relativeTime", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-07-01T12:00:00Z")));
  afterEach(() => vi.useRealTimers());

  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("just now under 30s", () => expect(relativeTime(ago(20_000))).toBe("just now"));
  it("rounds 30s up to 1m ago", () => expect(relativeTime(ago(30_000))).toBe("1m ago"));
  it("minutes", () => expect(relativeTime(ago(5 * 60_000))).toBe("5m ago"));
  it("hours", () => expect(relativeTime(ago(2 * 3_600_000))).toBe("2h ago"));
  it("days", () => expect(relativeTime(ago(3 * 86_400_000))).toBe("3d ago"));
  it("absolute date beyond a week", () => {
    const iso = ago(30 * 86_400_000);
    const expected = new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    expect(relativeTime(iso)).toBe(expected);
  });
});
