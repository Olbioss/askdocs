"use client";

import { X } from "lucide-react";
import { CitationCard } from "./citation-card";
import type { Citation } from "@/lib/types";

export function CitationsPanel({
  citations,
  highlightId,
  onClose,
}: {
  citations: Citation[];
  highlightId?: string;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-[86%] max-w-[22rem] flex-col border-l border-ink bg-paper-2 shadow-hard md:static md:z-auto md:w-[22rem] md:shadow-none">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-ink px-4">
        <span className="label">
          Kaynaklar <span className="text-ink-40">{citations.length}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kaynakları kapat"
          className="grid size-7 place-items-center border border-transparent text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {citations.length === 0 ? (
          <p className="reading p-4 text-sm text-ink-60">
            Bir cevabın kaynakları burada görünecek.
          </p>
        ) : (
          citations.map((c, i) => (
            <CitationCard
              key={c.id}
              n={i + 1}
              citation={c}
              highlighted={c.id === highlightId}
            />
          ))
        )}
      </div>
    </aside>
  );
}
