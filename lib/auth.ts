import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
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

/**
 * Thrown when an authenticated user has no profile row and it could not be
 * created. Dashboard pages surface this as an error boundary instead of a
 * redirect: an authenticated request must never be sent to an auth route,
 * because the middleware bounces those straight back to `/dashboard` and the
 * two rules cancel out into an endless ERR_TOO_MANY_REDIRECTS loop.
 */
export class ProfileUnavailableError extends Error {
  constructor() {
    super(
      "Your profile is unavailable. Apply the database schema (supabase/setup.sql) and reload this page."
    );
    this.name = "ProfileUnavailableError";
  }
}

/**
 * Mirrors the `handle_new_user` database trigger for accounts that predate it
 * (the trigger only fires on new signups). Runs with the service role, so it is
 * the only place allowed to create the row, and it never redirects: when the
 * schema or the service role key is missing it returns null and the caller
 * fails loudly.
 */
async function createMissingProfile(user: User): Promise<Profile | null> {
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

    // 23505 = unique violation: a signup trigger or a parallel request won the
    // race, which is perfectly fine.
    if (insertError && insertError.code !== "23505") {
      console.error(
        `[auth] could not create the missing profile: ${insertError.message}`
      );
      return null;
    }

    if (!insertError) {
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

    return data ?? null;
  } catch (error) {
    console.error(
      `[auth] profile bootstrap failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
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
 * This never redirects to an auth route on purpose: doing so would fight with
 * the middleware guard (`/login` → `/dashboard` for signed-in users) and loop
 * forever. Callers render an error boundary when the profile really cannot be
 * loaded (for example when the schema has not been applied yet).
 */
export async function requireProfile(): Promise<{
  user: User;
  profile: Profile;
}> {
  const user = await requireUser();

  const existing = await getCurrentProfile();
  if (existing) {
    return { user, profile: existing };
  }

  const created = await createMissingProfile(user);
  if (!created) {
    throw new ProfileUnavailableError();
  }

  return { user, profile: created };
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
