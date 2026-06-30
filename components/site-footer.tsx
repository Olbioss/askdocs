import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Library", href: "/library" },
      { label: "Chat", href: "/chat" },
      { label: "Get started", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
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
            Ask your documents in plain language and get answers grounded in
            cited passages.
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
