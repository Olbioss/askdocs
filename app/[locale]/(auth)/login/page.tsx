import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("loginTitle"),
    alternates: { languages: { en: "/login", tr: "/tr/login" } },
  };
}

// Only allow internal redirect targets (prevents open-redirect).
function safePath(value?: string | string[]) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/library";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthForm
      mode="login"
      redirectTo={safePath(sp.redirect)}
      initialError={typeof sp.error === "string" ? sp.error : undefined}
    />
  );
}
