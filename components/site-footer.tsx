import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  const t = useTranslations("SiteFooter");

  const columns = [
    {
      title: t("product"),
      links: [
        { label: t("library"), href: "/library" },
        { label: t("chat"), href: "/chat" },
        { label: t("getStarted"), href: "/signup" },
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("about"), href: "#" },
        { label: t("privacy"), href: "#" },
        { label: t("terms"), href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="reading mt-4 text-sm text-ink-60">{t("tagline")}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-14 gap-y-3">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="label mb-3 text-ink-40">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="font-mono text-xs text-ink-70 underline-offset-4 hover:text-accent hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="label text-ink-40">© 2026 AskDocs</span>
          <span className="label text-ink-40">Next.js · Supabase · Gemini</span>
        </div>
      </div>
    </footer>
  );
}
