import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { buildFallbackProfile } from "@/lib/profile";
import { ROUTES, SIGNUP_BONUS_CREDITS } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/supabase";

/**
 * Returns the authenticated Supabase user, or null when there is no session
 * (or when Supabase is not configured yet).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!hasSupabaseEnv()) return null;

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
});

/**
 * Returns the profile row for the authenticated user.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
});

export interface ProfileContext {
  user: User;
  profile: Profile;
  /**
   * Set when the profile row does not exist in the database and could not be
   * created — normally because the schema has not been applied yet. The
   * workspace then renders in a degraded, read-only state and the shell shows a
   * setup banner instead of failing.
   */
  setupIssue: string | null;
}

/**
 * Creates the missing profile row for the authenticated user.
 *
 * Two attempts, cheapest first:
 *
 *  1. `bootstrap_profile()` — a `security definer` RPC that runs with the user's
 *     own session, so it needs nothing but the schema. This is the normal path.
 *  2. A service-role insert, for databases that predate the RPC.
 *
 * Every failure reason is collected so the caller can report what is actually
 * wrong instead of a generic message.
 */
async function bootstrapProfile(
  user: User
): Promise<{ profile: Profile } | { reason: string }> {
  const reasons: string[] = [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("bootstrap_profile", {});

    if (!error && data) {
      console.warn(
        `[auth] created the missing profile for ${user.id} via bootstrap_profile()`
      );
      return { profile: data };
    }

    reasons.push(error ? error.message : "bootstrap_profile() returned no row");
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : String(error));
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  try {
    const admin = createAdminClient();

    const { error: insertError } = await admin.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      avatar_url: avatarUrl,
      plan: "free",
      credits: 0,
    });

    // 23505 = unique violation: the signup trigger or a parallel request won the
    // race, which is exactly what we want.
    if (insertError && insertError.code !== "23505") {
      reasons.push(insertError.message);
    } else if (!insertError) {
      // The same bonus SIGNUP_BONUS_CREDITS the trigger grants, recorded in the
      // ledger so the credit history stays complete.
      const { error: grantError } = await admin.rpc("grant_credits", {
        p_user_id: user.id,
        p_amount: SIGNUP_BONUS_CREDITS,
        p_type: "grant",
        p_description: "Signup bonus credits",
      });

      if (grantError) {
        console.error(
          `[auth] could not grant the signup bonus: ${grantError.message}`
        );
      }
    }

    const { data } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      return { profile: data };
    }

    reasons.push("the service-role insert returned no row");
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : String(error));
  }

  return { reason: reasons.join(" | ") };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  return user;
}

/**
 * Returns the profile of the authenticated user, creating the row on the fly
 * for accounts that signed up before the database trigger existed.
 *
 * It never redirects and never fails hard: a missing or half-applied schema
 * degrades into a read-only workspace plus a setup banner. That is deliberate —
 * redirecting an authenticated request to `/login` loops forever (the
 * middleware sends it back), and a blank error page tells the user nothing.
 */
export async function requireProfile(): Promise<ProfileContext> {
  const user = await requireUser();

  const existing = await getCurrentProfile();
  if (existing) {
    return { user, profile: existing, setupIssue: null };
  }

  const created = await bootstrapProfile(user);
  if ("profile" in created) {
    return { user, profile: created.profile, setupIssue: null };
  }

  const setupIssue =
    "Your profile row is missing from the database and could not be created. " +
    "Run supabase/setup.sql in the Supabase SQL editor, then reload this page.";

  console.error(
    `[auth] ${setupIssue} Reason: ${created.reason}. Serving a degraded workspace for ${user.id}.`
  );

  return { user, profile: buildFallbackProfile(user), setupIssue };
}

export function displayName(
  profile: Pick<Profile, "full_name" | "email"> | null,
  fallback: string
): string {
  const name = profile?.full_name?.trim();
  if (name) return name;
  const email = profile?.email?.trim();
  if (email) return email.split("@")[0];
  return fallback;
}
