"use client";

import * as React from "react";
import { ChatMessage } from "./chat-message";
import type { ChatMessage as Message, Citation } from "@/lib/types";

const STICK_THRESHOLD_PX = 120;

export function MessageList({
  messages,
  streamingId,
  onCite,
  onRetry,
}: {
  messages: Message[];
  streamingId: string | null;
  onCite: (citations: Citation[], id: string) => void;
  onRetry?: (id: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  // Follow the stream only while the reader is near the bottom; scrolling up
  // to reread must not snap back on every delta.
  const stickRef = React.useRef(true);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }

  React.useEffect(() => {
    if (stickRef.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-3xl">
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            streaming={m.id === streamingId}
            onCite={onCite}
            onRetry={onRetry}
          />
        ))}
        <div ref={endRef} className="h-2" />
      </div>
    </div>
  );
}
