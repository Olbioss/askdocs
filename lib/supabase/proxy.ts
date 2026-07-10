import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { stripLocale } from "@/i18n/routing";

// Routes that require an authenticated user (locale-free paths).
const PROTECTED = ["/library", "/chat"];
// Auth screens a signed-in user shouldn't see.
const AUTH_ROUTES = ["/login", "/signup"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

function redirectKeepingCookies(url: URL, from: NextResponse) {
  const res = NextResponse.redirect(url);
  // Carry any freshly-refreshed auth cookies onto the redirect response.
  from.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
  return res;
}

/**
 * Refreshes the Supabase session on every request and performs optimistic
 * auth redirects. Called from the root `proxy.ts` (Next.js 16's middleware)
 * with the response produced by next-intl's locale routing — cookies must be
 * written onto THAT response (never a fresh one), or its rewrite/redirect
 * would be dropped and unprefixed routes would 404.
 *
 * IMPORTANT: don't run logic between createServerClient and getClaims, and
 * never use getSession() here — it doesn't revalidate the token.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // refreshes the session + syncs cookies
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  // next-intl may itself redirect (e.g. /en/library → /library under
  // "as-needed"); return it as-is — cookies were already written above, and
  // the auth rules will run against the redirected request.
  if (response.headers.has("location")) {
    return response;
  }

  const { locale, path } = stripLocale(request.nextUrl.pathname);
  const prefix = locale === "en" ? "" : `/${locale}`;

  // bounce unauthenticated users out of protected areas
  if (!isAuthed && matches(path, PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/login`;
    url.search = "";
    // locale-free path; the client re-adds the prefix via next-intl routing
    url.searchParams.set("redirect", path);
    return redirectKeepingCookies(url, response);
  }

  // keep signed-in users away from the auth screens
  if (isAuthed && matches(path, AUTH_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/library`;
    url.search = "";
    return redirectKeepingCookies(url, response);
  }

  return response;
}
