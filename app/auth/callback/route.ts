import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/get-locale";
import { apiMessages } from "@/lib/i18n/api-messages";

// Exchanges an OAuth / email-confirmation `code` for a session cookie, then
// sends the user on to `next` (defaults to the library). `next` arrives
// locale-prefixed (auth-form bakes the prefix in via getPathname).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  const locale = resolveLocale(request);
  const prefix = locale === "en" ? "" : `/${locale}`;
  return NextResponse.redirect(
    `${origin}${prefix}/login?error=${encodeURIComponent(
      apiMessages(locale).authCallback.failed,
    )}`,
  );
}
