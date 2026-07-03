import type { Metadata } from "next";
import { ChatView } from "@/components/chat/chat-view";

export const metadata: Metadata = {
  title: "Sohbet — AskDocs",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string | string[] }>;
}) {
  const sp = await searchParams;
  const doc = Array.isArray(sp.doc) ? sp.doc[0] : sp.doc;
  // Key by the doc param so navigating with a new ?doc= remounts with the right scope.
  return <ChatView key={doc ?? "all"} initialDocumentId={doc} />;
}
