import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import {
  AUTH_ROUTES,
  PROTECTED_PREFIXES,
  ROUTES,
  safeRedirectPath,
} from "@/lib/routes";
import type { Database } from "@/types/supabase";

/**
 * Builds a redirect that carries over the session cookies refreshed by
 * `supabase.auth.getUser()` and never points at the URL we are already on.
 *
 * Both details matter for loop-freedom: dropping the refreshed cookies, or
 * redirecting to the current URL, turns a perfectly normal auth guard into an
 * endless redirect chain.
 */
function redirect(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  params?: Record<string, string>
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const isSelfRedirect =
    url.pathname === request.nextUrl.pathname &&
    url.search === request.nextUrl.search;

  if (isSelfRedirect) {
    return sessionResponse;
  }

  const response = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}

/**
 * `error` and `next` mark a request that came out of an auth flow. Those must
 * be rendered (or followed) instead of bounced, otherwise the guard ping-pongs
 * between the auth routes and the protected ones.
 */
function hasAuthRecoveryParams(request: NextRequest): boolean {
  const { searchParams } = request.nextUrl;
  return searchParams.has("error") || searchParams.has("next");
}

/**
 * Refreshes the Supabase session cookie and enforces route protection.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[middleware] Supabase env vars are missing: auth and route protection are disabled."
      );
    }
    return response;
  }

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Everything else (the marketing site, /auth/callback, /api/*) is public, so
  // it returns before touching Supabase: this removes one auth round trip from
  // every one of those requests, which is what made the landing page slow.
  if (!isProtected && !isAuthRoute) {
    return response;
  }

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A signed-in visitor is normally pushed away from /login and /signup, but
  // not when the URL carries `error` or `next`: those are produced by the auth
  // flows themselves, and bouncing them is exactly what used to create the
  // infinite /login ⇄ /dashboard redirect loop.
  const shouldBounceFromAuthRoute =
    isAuthRoute && Boolean(user) && !hasAuthRecoveryParams(request);

  if (isProtected && !user) {
    return redirect(request, response, ROUTES.login, {
      next: safeRedirectPath(`${pathname}${search}`),
    });
  }

  if (shouldBounceFromAuthRoute) {
    return redirect(request, response, ROUTES.dashboard);
  }

  return response;
}
