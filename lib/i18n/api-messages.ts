import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import type { Locale } from "@/i18n/routing";

// Route handlers read messages via direct import instead of next-intl's
// getTranslations — no request context needed, so unit tests can call the
// handlers with bare Request doubles.
const MESSAGES = { en, tr } as const;

/** The `Api` namespace of the given locale's catalog. */
export function apiMessages(locale: Locale) {
  return MESSAGES[locale].Api;
}

/** Fill `{name}` placeholders (the Api namespace uses no other ICU syntax). */
export function fmt(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}
