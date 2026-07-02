"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { CitationMarker } from "./citation-marker";
import type { ChatMessage as Message, Citation } from "@/lib/types";

function shortName(name: string) {
  return name.length > 22 ? `${name.slice(0, 20)}…` : name;
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderWithCitations(
  content: string,
  citations: Citation[] | undefined,
  onCite: (citations: Citation[], id: string) => void,
) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const n = Number(m[1]);
      const c = citations?.[n - 1];
      return (
        <CitationMarker
          key={i}
          n={n}
          onClick={c ? () => onCite(citations!, c.id) : undefined}
        />
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function ChatMessage({
  message,
  streaming,
  onCite,
  onRetry,
}: {
  message: Message;
  streaming?: boolean;
  onCite: (citations: Citation[], id: string) => void;
  onRetry?: (id: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <article className="animate-rise border-b border-rule px-5 py-6 sm:px-8">
      <div className="mb-3 flex items-center gap-2">
        {isUser ? (
          <span className="label text-ink-40">You</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-accent" />
            <span className="label text-ink">AskDocs</span>
          </span>
        )}
        <span className="label ml-auto text-ink-40">
          {clockTime(message.createdAt)}
        </span>
      </div>

      {isUser ? (
        <p className="whitespace-pre-wrap font-mono text-[0.9rem] leading-relaxed text-ink">
          {message.content}
        </p>
      ) : (
        <div className="reading max-w-[68ch] text-ink">
          {streaming && message.content === "" ? (
            <span className="label inline-flex items-center gap-2 text-ink-60">
              <span className="size-2 animate-pulse bg-accent" />
              Searching sources…
            </span>
          ) : (
            <p>
              {renderWithCitations(message.content, message.citations, onCite)}
              {streaming && <span className="cursor-block" aria-hidden />}
            </p>
          )}

          {!streaming && message.error && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              className="mt-3 inline-flex items-center gap-1.5 border border-ink bg-paper px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              <RotateCcw className="size-3" />
              Retry
            </button>
          )}

          {!streaming && message.citations && message.citations.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="label text-ink-40">Sources</span>
              {message.citations.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCite(message.citations!, c.id)}
                  className="inline-flex items-center gap-1.5 border border-ink bg-paper px-2 py-0.5 font-mono text-[0.625rem] text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  <span className="text-accent">[{i + 1}]</span>
                  {shortName(c.documentName)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
