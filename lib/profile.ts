import type { User } from "@supabase/supabase-js";

import type { Profile } from "@/types/supabase";

/**
 * Builds a stand-in profile from the auth user, for the case where the
 * `profiles` row can neither be read nor created — the schema has not been
 * applied yet, or the signup trigger never ran.
 *
 * These are defaults, not stored state: `plan` and `credits` are not real, so
 * whoever renders this must show the setup problem to the user.
 */
export function buildFallbackProfile(user: User): Profile {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
  const timestamp =
    typeof user.created_at === "string" ? user.created_at : new Date().toISOString();

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    avatar_url: avatarUrl,
    plan: "free",
    credits: 0,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}
