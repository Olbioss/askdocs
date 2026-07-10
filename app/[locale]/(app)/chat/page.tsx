import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChatView } from "@/components/chat/chat-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("chatTitle"),
    alternates: { languages: { en: "/chat", tr: "/tr/chat" } },
  };
}

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
