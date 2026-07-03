import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="AskDocs ana sayfa"
    >
      <span className="grid size-6 place-items-center border border-ink bg-accent font-mono text-[0.7rem] font-bold leading-none text-accent-ink transition-transform group-hover:rotate-3">
        A
      </span>
      <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-ink">
        AskDocs
      </span>
    </Link>
  );
}
