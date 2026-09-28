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

export const CREDIT_COST_PER_GENERATION = 1;
export const MIN_PROMPT_LENGTH = 3;
export const MAX_PROMPT_LENGTH = 4000;
export const SIGNUP_BONUS_CREDITS = 100;
