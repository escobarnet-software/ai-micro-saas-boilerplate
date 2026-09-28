export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  generator: "/dashboard/generator",
  billing: "/dashboard/billing",
  settings: "/dashboard/settings",
  authCallback: "/auth/callback",
  billingSuccess: "/dashboard/billing?checkout=success",
  billingCancelled: "/dashboard/billing?checkout=cancelled",
} as const;

export const PROTECTED_PREFIXES = ["/dashboard"] as const;

/** Routes that must never be used as a post-login destination. */
export const AUTH_ROUTES: readonly string[] = [ROUTES.login, ROUTES.signup];

/**
 * Normalises a `next` query param into a path that is safe to navigate to.
 *
 * Rejects absolute URLs, protocol-relative values (`//evil.com`), backslashes
 * and the auth routes themselves. Returning a signed-in visitor to `/login`
 * would make the middleware bounce them back to `/dashboard` and produce an
 * infinite redirect loop (ERR_TOO_MANY_REDIRECTS).
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = ROUTES.dashboard
): string {
  const candidate = value?.trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  if (candidate.includes("\\")) {
    return fallback;
  }

  const [path] = candidate.split(/[?#]/);
  const isAuthRoute = [...AUTH_ROUTES, ROUTES.authCallback].some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  return isAuthRoute ? fallback : candidate;
}

export const CREDIT_COST_PER_GENERATION = 1;
export const MIN_PROMPT_LENGTH = 3;
export const MAX_PROMPT_LENGTH = 4000;
export const SIGNUP_BONUS_CREDITS = 100;
