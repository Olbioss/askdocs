"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [sent, setSent] = React.useState(false);

  const callbackUrl = (origin: string) =>
    `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

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
        toast.success("Account created");
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Signed in");
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
        <p className="label text-ink-40">Check your inbox</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">
          Confirm your email
        </h1>
        <p className="reading mt-3 text-sm text-ink-70">
          We sent a confirmation link to finish creating your account. Open it
          and you&rsquo;ll be signed in automatically.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-6 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-rise border border-ink bg-paper p-6 shadow-hard">
      <p className="label text-ink-40">
        {isSignup ? "Create account" : "Welcome back"}
      </p>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">
        {isSignup ? "Start asking your documents" : "Sign in to AskDocs"}
      </h1>

      {error && (
        <div className="mt-5 border border-accent bg-paper px-3 py-2 font-mono text-[0.6875rem] leading-relaxed text-accent">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isSignup && (
          <Field label="Name">
            <Input name="name" placeholder="Ada Lovelace" autoComplete="name" />
          </Field>
        )}
        <Field label="Email">
          <Input
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 6 : undefined}
            required
          />
          {isSignup && (
            <p className="label mt-1.5 text-ink-40">At least 6 characters</p>
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
              ? "Creating…"
              : "Signing in…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-rule" />
        <span className="label text-ink-40">or</span>
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
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleOAuth("github")}
          disabled={pending}
        >
          Continue with GitHub
        </Button>
      </div>

      <p className="label mt-6 text-center text-ink-60">
        {isSignup ? (
          <>
            Have an account?{" "}
            <Link
              href="/login"
              className="text-accent underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href="/signup"
              className="text-accent underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
