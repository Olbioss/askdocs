"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block text-ink-60">{label}</span>
      {children}
    </label>
  );
}

export function AuthForm({
  mode,
  redirectTo = "/library",
  initialError,
}: {
  mode: "login" | "signup";
  redirectTo?: string;
  initialError?: string;
}) {
  const isSignup = mode === "signup";
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [sent, setSent] = React.useState(false);

  // The callback route redirects to `next` verbatim, so bake the locale
  // prefix in here (getPathname → "/library" for en, "/tr/library" for tr).
  const callbackUrl = (origin: string) => {
    const next = getPathname({ href: redirectTo, locale });
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  };

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    setPending(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: name ? { name } : undefined,
            emailRedirectTo: callbackUrl(window.location.origin),
          },
        });
        if (error) throw error;

        // No session means email confirmation is required.
        if (!data.session) {
          setSent(true);
          return;
        }
        toast.success(t("createdToast"));
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success(t("signedInToast"));
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setPending(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    if (pending) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(window.location.origin) },
    });
    if (error) setError(error.message);
  }

  if (sent) {
    return (
      <div className="animate-rise border border-ink bg-paper p-6 shadow-hard">
        <p className="label text-ink-40">{t("checkInbox")}</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">
          {t("verifyEmail")}
        </h1>
        <p className="reading mt-3 text-sm text-ink-70">{t("verifySent")}</p>
        <Button asChild variant="outline" size="lg" className="mt-6 w-full">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-rise border border-ink bg-paper p-6 shadow-hard">
      <p className="label text-ink-40">
        {isSignup ? t("signupLabel") : t("welcomeBack")}
      </p>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">
        {isSignup ? t("signupTitle") : t("loginTitle")}
      </h1>

      {error && (
        <div className="mt-5 border border-accent bg-paper px-3 py-2 font-mono text-[0.6875rem] leading-relaxed text-accent">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isSignup && (
          <Field label={t("name")}>
            <Input name="name" placeholder="Ada Lovelace" autoComplete="name" />
          </Field>
        )}
        <Field label={t("email")}>
          <Input
            type="email"
            name="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            required
          />
        </Field>
        <Field label={t("password")}>
          <Input
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 6 : undefined}
            required
          />
          {isSignup && (
            <p className="label mt-1.5 text-ink-40">{t("minChars")}</p>
          )}
        </Field>
        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending
            ? isSignup
              ? t("creating")
              : t("signingIn")
            : isSignup
              ? t("createAccount")
              : t("signIn")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-rule" />
        <span className="label text-ink-40">{t("or")}</span>
        <span className="h-px flex-1 bg-rule" />
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleOAuth("google")}
          disabled={pending}
        >
          {t("continueWithGoogle")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleOAuth("github")}
          disabled={pending}
        >
          {t("continueWithGithub")}
        </Button>
      </div>

      <p className="label mt-6 text-center text-ink-60">
        {isSignup ? (
          <>
            {t("haveAccount")}{" "}
            <Link
              href="/login"
              className="text-accent underline-offset-4 hover:underline"
            >
              {t("signIn")}
            </Link>
          </>
        ) : (
          <>
            {t("newHere")}{" "}
            <Link
              href="/signup"
              className="text-accent underline-offset-4 hover:underline"
            >
              {t("createAccount")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
