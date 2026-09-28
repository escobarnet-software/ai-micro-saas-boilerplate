import { NextResponse, type NextRequest } from "next/server";

import { getSiteUrl } from "@/lib/env";
import { ROUTES, safeRedirectPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Exchanges the PKCE `code` from email confirmation / OAuth for a session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = safeRedirectPath(nextParam);
  const baseUrl = getSiteUrl() || origin;

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    const failure = new URL(ROUTES.login, baseUrl);
    failure.searchParams.set("error", providerError);
    return NextResponse.redirect(failure);
  }

  if (!code) {
    const failure = new URL(ROUTES.login, baseUrl);
    failure.searchParams.set("error", "Missing confirmation code.");
    return NextResponse.redirect(failure);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failure = new URL(ROUTES.login, baseUrl);
    failure.searchParams.set("error", error.message);
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(new URL(next, baseUrl));
}
