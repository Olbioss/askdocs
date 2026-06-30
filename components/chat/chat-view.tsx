"use client";

import * as React from "react";
import { toast } from "sonner";
import { PanelRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScopeSelect } from "./scope-select";
import { MessageList } from "./message-list";
import { ChatEmpty } from "./chat-empty";
import { ChatComposer } from "./chat-composer";
import { CitationsPanel } from "./citations-panel";
import { askQuestion, listDocuments } from "@/lib/data/client";
import type { ChatMessage, Citation, Document } from "@/lib/types";

interface PanelState {
  citations: Citation[];
  highlightId?: string;
}

export function ChatView({
  initialDocumentId,
}: {
  initialDocumentId?: string;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [scope, setScope] = React.useState<string | null>(
    initialDocumentId ?? null,
  );
  const [streamingId, setStreamingId] = React.useState<string | null>(null);
  const [panel, setPanel] = React.useState<PanelState | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);

  React.useEffect(() => {
    listDocuments()
      .then((d) => setDocuments(d.filter((x) => x.status === "ready")))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (initialDocumentId) setScope(initialDocumentId);
  }, [initialDocumentId]);

  async function send(question: string) {
    if (streamingId) return;
    const stamp = Date.now();
    const userMsg: ChatMessage = {
      id: `u_${stamp}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    const answerId = `a_${stamp}`;
    const answerMsg: ChatMessage = {
      id: answerId,
      role: "assistant",
      content: "",
      pending: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, answerMsg]);
    setStreamingId(answerId);

    try {
      for await (const ev of askQuestion({
        question,
        documentId: scope ?? undefined,
      })) {
        if (ev.type === "text") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === answerId ? { ...m, content: m.content + ev.value } : m,
            ),
          );
        } else {
          const citations = ev.value;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === answerId ? { ...m, citations, pending: false } : m,
            ),
          );
          setPanel({ citations });
          setPanelOpen(true);
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === answerId
            ? {
                ...m,
                content:
                  m.content || "Something went wrong while fetching an answer.",
                pending: false,
              }
            : m,
        ),
      );
      toast.error("Couldn't complete that answer");
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === answerId ? { ...m, pending: false } : m)),
      );
      setStreamingId(null);
    }
  }

  function handleCite(citations: Citation[], id: string) {
    setPanel({ citations, highlightId: id });
    setPanelOpen(true);
  }

  function reset() {
    if (streamingId) return;
    setMessages([]);
    setPanel(null);
    setPanelOpen(false);
  }

  const hasMessages = messages.length > 0;
  const sourceCount = panel?.citations.length ?? 0;

  return (
    <div className="relative flex min-h-0 flex-1">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-ink px-3 sm:px-5">
          <ScopeSelect documents={documents} value={scope} onChange={setScope} />
          <div className="flex items-center gap-1">
            {sourceCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPanelOpen((o) => !o)}
                className="h-8 gap-1.5"
              >
                <PanelRight className="size-3.5" />
                <span className="hidden sm:inline">Sources</span> {sourceCount}
              </Button>
            )}
            {hasMessages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={!!streamingId}
                className="h-8 gap-1.5"
              >
                <Plus className="size-3.5" />
                New
              </Button>
            )}
          </div>
        </div>

        {hasMessages ? (
          <MessageList
            messages={messages}
            streamingId={streamingId}
            onCite={handleCite}
          />
        ) : (
          <ChatEmpty onPick={send} />
        )}

        <ChatComposer onSubmit={send} disabled={!!streamingId} />
      </section>

      {panelOpen && panel && (
        <CitationsPanel
          citations={panel.citations}
          highlightId={panel.highlightId}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
