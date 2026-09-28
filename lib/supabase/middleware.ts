import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { PROTECTED_PREFIXES, ROUTES } from "@/lib/routes";
import type { Database } from "@/types/supabase";

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

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthRoute =
    pathname === ROUTES.login || pathname === ROUTES.signup;

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.login;
    redirectUrl.search = "";
    redirectUrl.searchParams.set(
      "next",
      `${pathname}${search}`.startsWith("//") ? ROUTES.dashboard : `${pathname}${search}`
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.dashboard;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
