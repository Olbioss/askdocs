// Typed client for the app's data needs. Calls the /api/* route handlers.

import type { AskInput, ChatStreamEvent, Citation, Document } from "@/lib/types";

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load documents");
  return (await res.json()) as Document[];
}

export async function uploadDocument(file: File): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()) as Document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function* askQuestion(
  input: AskInput,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok || !res.body) throw new Error("Chat request failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) yield { type: "text", value: chunk };
  }

  const encoded = res.headers.get("x-citations");
  if (encoded) {
    try {
      const citations = JSON.parse(atob(encoded)) as Citation[];
      yield { type: "citations", value: citations };
    } catch {
      // ignore malformed citation payloads
    }
  }
}
