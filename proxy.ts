import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes and the OAuth callback are never locale-prefixed:
  // refresh the session only, skip locale routing.
  if (pathname.startsWith("/api") || pathname.startsWith("/auth")) {
    return updateSession(request, NextResponse.next({ request }));
  }

  // Locale routing first (rewrite "/" → "/en" internally, redirect "/en/x"
  // → "/x", set NEXT_LOCALE), then refresh Supabase cookies onto that
  // response and apply auth redirects.
  const response = handleI18n(request);
  return updateSession(request, response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
