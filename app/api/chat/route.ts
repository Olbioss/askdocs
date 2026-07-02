// retrieve → generate → stream
import { google } from "@ai-sdk/google";
import { streamText, createTextStreamResponse, toTextStream } from "ai";
import { createClient } from "@/lib/supabase/server";
import { retrieveChunks, type RetrievedChunk } from "@/lib/rag/retrieve";
import { AskInput, Citation } from "@/lib/types";
import { jsonError } from "@/lib/http";

// Allow streaming responses up to 30s (raise on Pro if needed).
export const maxDuration = 30;

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

  // 2. parse the AskInput contract your client sends
  const { question, documentId }: AskInput = await req.json();
  if (!question?.trim()) {
    return jsonError("No question provided", 400);
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

  // 4. stream plain text; ship citations in an x-citations header (base64 JSON) as metadata for the UI
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: buildSystemPrompt(retrieved),
    prompt: question,
    onError: ({ error }) => console.error("chat streamText error:", error),
  });

  const citationsB64 = Buffer.from(
    JSON.stringify(toCitations(retrieved)),
  ).toString("base64");

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
    headers: { "x-citations": citationsB64 },
  });
}
