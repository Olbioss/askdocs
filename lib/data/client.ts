// Typed client for the app's data needs. Calls the /api/* route handlers.

import type {
  AskInput,
  ChatStreamEvent,
  Document,
  DocumentStatus,
} from "@/lib/types";

/** Upload failures may reference a real document row (created before ingestion failed). */
export class UploadError extends Error {
  documentId?: string;
  status?: DocumentStatus;
}

async function errorBody(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function messageFrom(body: Record<string, unknown>, fallback: string): string {
  return typeof body.error === "string" && body.error ? body.error : fallback;
}

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok)
    throw new Error(messageFrom(await errorBody(res), "Failed to load documents"));
  return (await res.json()) as Document[];
}

export async function uploadDocument(file: File): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await errorBody(res);
    const err = new UploadError(messageFrom(body, "Upload failed"));
    if (typeof body.id === "string") err.documentId = body.id;
    if (body.status === "processing" || body.status === "ready" || body.status === "failed") {
      err.status = body.status;
    }
    throw err;
  }
  return (await res.json()) as Document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(messageFrom(await errorBody(res), "Delete failed"));
}

export async function* askQuestion(
  input: AskInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok)
    throw new Error(messageFrom(await errorBody(res), "Chat request failed"));
  if (!res.body) throw new Error("Chat request failed");

  // The route streams NDJSON ChatStreamEvent lines; reads can split a line
  // anywhere (including mid-codepoint), so buffer and emit per newline.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function* drain(): Generator<ChatStreamEvent> {
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const raw = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!raw) continue;
      try {
        yield JSON.parse(raw) as ChatStreamEvent;
      } catch {
        // skip malformed lines
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    yield* drain();
  }
  buffer += decoder.decode(); // flush any multi-byte remainder
  buffer += "\n"; // treat a final partial line as complete
  yield* drain();
}
