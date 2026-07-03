import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Giriş yap — AskDocs",
};

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
