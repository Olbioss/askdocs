// Typed client for the app's data needs. Calls the /api/* route handlers.

import type {
  AskInput,
  ChatStreamEvent,
  Citation,
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
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok)
    throw new Error(messageFrom(await errorBody(res), "Chat request failed"));
  if (!res.body) throw new Error("Chat request failed");

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
