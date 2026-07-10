"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  // Locale-free path; the router re-adds the right prefix.
  const pathname = usePathname();

  const next: Locale = locale === "en" ? "tr" : "en";

  function switchTo() {
    // Read the query at click time (avoids useSearchParams + Suspense);
    // preserves e.g. /chat?doc=… across the locale switch.
    const search = typeof window === "undefined" ? "" : window.location.search;
    router.replace(`${pathname}${search}`, { locale: next });
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      aria-label={`${t("label")}: ${t(next)}`}
      className={cn(
        "grid size-9 place-items-center border border-ink bg-paper font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none",
        className,
      )}
    >
      {next}
    </button>
  );
}
