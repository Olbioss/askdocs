import { isLocale, routing, type Locale } from "@/i18n/routing";

/**
 * Resolve the request's locale for API route handlers (which live outside the
 * [locale] segment): explicit `x-locale` header from lib/data/client.ts first,
 * then next-intl's NEXT_LOCALE cookie, else the default locale. Defensive
 * against bare test doubles that have no headers object.
 */
export function resolveLocale(req: Request): Locale {
  const header = req.headers?.get?.("x-locale");
  if (isLocale(header)) return header;

  const cookie = req.headers?.get?.("cookie") ?? "";
  const match = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/.exec(cookie);
  if (match && isLocale(match[1])) return match[1];

  return routing.defaultLocale;
}
