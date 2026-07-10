import type { Locale } from "@/i18n/routing";

// Kept as a locale-parameterized pure function (not next-intl's useFormatter):
// it's called from client components and unit-tested directly in node.
const RELATIVE = {
  en: {
    now: "now",
    m: (n: number) => `${n} min ago`,
    h: (n: number) => `${n} hr ago`,
    d: (n: number) => `${n} days ago`,
    dateLocale: "en-US",
  },
  tr: {
    now: "şimdi",
    m: (n: number) => `${n} dk önce`,
    h: (n: number) => `${n} sa önce`,
    d: (n: number) => `${n} gün önce`,
    dateLocale: "tr-TR",
  },
} as const;

export function relativeTime(iso: string, locale: Locale = "en"): string {
  const rt = RELATIVE[locale];
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60_000);
  if (m < 1) return rt.now;
  if (m < 60) return rt.m(m);
  const h = Math.round(m / 60);
  if (h < 24) return rt.h(h);
  const d = Math.round(h / 24);
  if (d < 7) return rt.d(d);
  return new Date(iso).toLocaleDateString(rt.dateLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function fileExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "FILE" : filename.slice(dot + 1).toUpperCase();
}
