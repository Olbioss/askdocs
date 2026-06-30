import type { Metadata } from "next";
import { ChatView } from "@/components/chat/chat-view";

export const metadata: Metadata = {
  title: "Chat — AskDocs",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string | string[] }>;
}) {
  const sp = await searchParams;
  const doc = Array.isArray(sp.doc) ? sp.doc[0] : sp.doc;
  return <ChatView initialDocumentId={doc} />;
}
