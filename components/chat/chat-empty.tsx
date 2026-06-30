"use client";

import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "What valuation and liquidation preference are in the term sheet?",
  "How did the business perform last quarter?",
  "How much PTO do employees get, and what's the remote policy?",
  "Why does hybrid retrieval reduce hallucinations?",
];

export function ChatEmpty({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-5 py-12 text-center">
        <span className="grid size-12 animate-rise place-items-center border border-ink bg-accent text-accent-ink">
          <Sparkles className="size-5" />
        </span>
        <h2
          className="mt-5 animate-rise font-serif text-3xl font-semibold tracking-tight text-ink"
          style={{ animationDelay: "60ms" }}
        >
          Ask your documents.
        </h2>
        <p
          className="reading mt-2 max-w-md animate-rise text-ink-60"
          style={{ animationDelay: "120ms" }}
        >
          Pose a question in plain language. Every answer cites the exact
          passages it relied on, with a similarity score you can check.
        </p>

        <div
          className="mt-8 grid w-full animate-rise gap-3 sm:grid-cols-2"
          style={{ animationDelay: "180ms" }}
        >
          {SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="group border border-ink bg-paper p-4 text-left transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-hard-sm"
            >
              <span className="label text-ink-40 transition-colors group-hover:text-accent">
                Ask &rarr;
              </span>
              <p className="reading mt-2 text-sm text-ink">{q}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
