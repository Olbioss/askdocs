import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Hesap oluştur — AskDocs",
};

function safePath(value?: string | string[]) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/library";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthForm
      mode="signup"
      redirectTo={safePath(sp.redirect)}
      initialError={typeof sp.error === "string" ? sp.error : undefined}
    />
  );
}
