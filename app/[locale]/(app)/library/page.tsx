import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LibraryView } from "@/components/library/library-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("libraryTitle"),
    alternates: { languages: { en: "/library", tr: "/tr/library" } },
  };
}

export default function LibraryPage() {
  return <LibraryView />;
}
