import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Ürün",
    links: [
      { label: "Kitaplık", href: "/library" },
      { label: "Sohbet", href: "/chat" },
      { label: "Hemen başla", href: "/signup" },
    ],
  },
  {
    title: "Şirket",
    links: [
      { label: "Hakkında", href: "#" },
      { label: "Gizlilik", href: "#" },
      { label: "Koşullar", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="reading mt-4 text-sm text-ink-60">
            Belgelerinize doğal dille sorun; kaynak gösterilen pasajlara
            dayanan cevaplar alın.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-14 gap-y-3">
          {COLUMNS.map((col) => (
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
