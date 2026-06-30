"use client";

import * as React from "react";
import { ChatMessage } from "./chat-message";
import type { ChatMessage as Message, Citation } from "@/lib/types";

export function MessageList({
  messages,
  streamingId,
  onCite,
}: {
  messages: Message[];
  streamingId: string | null;
  onCite: (citations: Citation[], id: string) => void;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl">
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            streaming={m.id === streamingId}
            onCite={onCite}
          />
        ))}
        <div ref={endRef} className="h-2" />
      </div>
    </div>
  );
}
