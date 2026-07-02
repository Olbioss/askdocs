// retrieve → generate → stream
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { retrieveChunks, type RetrievedChunk } from "@/lib/rag/retrieve";
import { AskInput, ChatStreamEvent, Citation } from "@/lib/types";
import { jsonError } from "@/lib/http";

// Allow streaming responses up to 30s (raise on Pro if needed).
export const maxDuration = 30;

const MAX_QUESTION_CHARS = 4000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return [
      "You are AskDocs, a document assistant.",
      "No relevant context was found in the user's documents for this question.",
      "Tell the user you don't have information about that in their documents.",
      "Do not answer from outside knowledge or guess.",
    ].join("\n");
  }

  const context = chunks
    .map((c, i) => {
      const loc = c.page ? `, page ${c.page}` : "";
      return `[${i + 1}] (source: ${c.filename}${loc})\n${c.content}`;
    })
    .join("\n\n");

  return [
    "You are AskDocs, a document assistant. Answer the user's question using",
    "ONLY the numbered context chunks below. If the answer is not in the context,",
    "say you don't have that information in their documents — do not guess or use",
    "outside knowledge.",
    "",
    "For every claim, cite the chunk it came from using its bracket number, e.g. [1].",
    "",
    "Context:",
    context,
  ].join("\n");
}

export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  // Array order defines the marker index: citation n backs the [n] in the answer text.
  return chunks.map((c) => ({
    id: c.id,
    documentId: c.documentId,
    documentName: c.filename,
    content: c.content,
    similarity: Number(c.similarity.toFixed(3)),
    metadata: c.page ? { page: c.page } : undefined,
  }));
}

export async function POST(req: Request) {
  // 1. auth — identity from the server-verified session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  // 2. parse + validate the AskInput contract your client sends
  let input: AskInput;
  try {
    input = (await req.json()) as AskInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const { question, documentId } = input;
  if (typeof question !== "string" || !question.trim()) {
    return jsonError("No question provided", 400);
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return jsonError(
      `Question too long (max ${MAX_QUESTION_CHARS} characters)`,
      400,
    );
  }
  if (documentId !== undefined && !UUID_RE.test(String(documentId))) {
    return jsonError("Invalid documentId", 400);
  }

  // 3. retrieve (scoped to this user, optional single-doc)
  let retrieved: RetrievedChunk[];
  try {
    retrieved = await retrieveChunks(question, user.id, {
      documentId,
      matchCount: 5,
    });
  } catch (err) {
    // most likely the embedding call failed (e.g. missing GOOGLE_GENERATIVE_AI_API_KEY)
    return jsonError("Retrieval failed", 500, { detail: String(err) });
  }

  // 4. stream NDJSON ChatStreamEvent lines: citations first (the UI can show
  // sources before the first token), then text deltas, an error event on failure.
  // Body transport avoids the old x-citations header's 16KB size ceiling and
  // base64/atob UTF-8 mangling.
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: buildSystemPrompt(retrieved),
    prompt: question,
    abortSignal: req.signal, // client abort / disconnect stops generation
    onError: ({ error }) => console.error("chat streamText error:", error),
  });

  const encoder = new TextEncoder();
  const line = (ev: ChatStreamEvent) =>
    encoder.encode(JSON.stringify(ev) + "\n");

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        line({ type: "citations", value: toCitations(retrieved) }),
      );
      try {
        for await (const text of result.textStream) {
          controller.enqueue(line({ type: "text", value: text }));
        }
      } catch {
        // textStream throws on mid-stream model/network errors (already logged
        // via onError); don't enqueue after a client abort — the stream is dead.
        if (!req.signal.aborted) {
          controller.enqueue(
            line({ type: "error", message: "Answer generation failed" }),
          );
        }
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
