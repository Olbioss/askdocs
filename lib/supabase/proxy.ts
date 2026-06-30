import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require an authenticated user.
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
 * auth redirects. Called from the root `proxy.ts` (Next.js 16's middleware).
 *
 * IMPORTANT: don't run logic between createServerClient and getClaims, and
 * never use getSession() here — it doesn't revalidate the token.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
  const path = request.nextUrl.pathname;

  // bounce unauthenticated users out of protected areas
  if (!isAuthed && matches(path, PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", path);
    return redirectKeepingCookies(url, response);
  }

  // keep signed-in users away from the auth screens
  if (isAuthed && matches(path, AUTH_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/library";
    url.search = "";
    return redirectKeepingCookies(url, response);
  }

  return response;
}
