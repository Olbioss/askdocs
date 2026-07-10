import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types";

export function CitationCard({
  n,
  citation,
  highlighted,
}: {
  n: number;
  citation: Citation;
  highlighted?: boolean;
}) {
  const t = useTranslations("CitationCard");
  const pct = Math.round(citation.similarity * 100);
  const loc = citation.metadata?.page
    ? t("pageAbbr", { page: citation.metadata.page })
    : (citation.metadata?.section ?? null);

  return (
    <div
      className={cn(
        "border bg-paper p-3 transition-shadow",
        highlighted ? "border-accent shadow-hard-sm" : "border-ink",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-5 shrink-0 place-items-center border border-accent font-mono text-[0.625rem] font-semibold text-accent">
          {n}
        </span>
        <span
          className="truncate font-mono text-[0.6875rem] text-ink"
          title={citation.documentName}
        >
          {citation.documentName}
        </span>
        {loc && <span className="label ml-auto shrink-0 text-ink-40">{loc}</span>}
      </div>

      <p className="reading mt-2.5 text-[0.8125rem] leading-relaxed text-ink-70">
        &ldquo;{citation.content}&rdquo;
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="label text-ink-40">{t("match")}</span>
          <span className="font-mono text-[0.625rem] font-semibold text-ink">
            {citation.similarity.toFixed(2)}
          </span>
        </div>
        <div className="h-2 w-full border border-ink bg-paper">
          <div
            className="h-full animate-bar bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
