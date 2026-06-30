// retrieve → generate → stream
import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { createClient } from "@/lib/supabase/server";
import { retrieveChunks, type RetrievedChunk } from "@/lib/rag/retrieve";
// Stub: not implemented yet. The frontend talks to this through
// lib/data/client.ts, which currently runs on mocks (USE_MOCKS).
// Implement the RAG pipeline here (embed query → retrieveChunks → Gemini stream)
// and flip USE_MOCKS to false to go live.

// Allow streaming responses up to 30s (raise on Pro if needed).
export const maxDuration = 30;

function buildSystemPrompt(chunks: RetrievedChunk[]): string {
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

export async function POST(req: Request) {
  // 1. auth — identity from the server-verified session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. parse request — messages from useChat, optional documentId scope
  const {
    messages,
    documentId,
  }: { messages: UIMessage[]; documentId?: string } = await req.json();

  // last user message text = the question to retrieve against
  const last = messages[messages.length - 1];
  const question =
    last?.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join(" ") ?? "";

  // 3. retrieve relevant chunks (scoped to this user)
  const retrieved = await retrieveChunks(question, user.id, {
    documentId,
    matchCount: 5,
  });

  // 4. stream a grounded answer; attach sources as metadata for the UI
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: buildSystemPrompt(retrieved),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      messageMetadata: ({ part }) => {
        // send the citation sources once, at the start of the response
        if (part.type === "start") {
          return {
            sources: retrieved.map((c, i) => ({
              n: i + 1,
              documentId: c.documentId,
              filename: c.filename,
              page: c.page,
              chunkIndex: c.chunkIndex,
              similarity: Number(c.similarity.toFixed(3)),
            })),
          };
        }
      },
    }),
  });
}
