import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { ROUTES } from "@/lib/routes";
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

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  return user;
}

export async function requireProfile(): Promise<{
  user: User;
  profile: Profile;
}> {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(`${ROUTES.login}?error=${encodeURIComponent("Profile is unavailable.")}`);
  }

  return { user, profile };
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

export function getInitials(value: string): string {
  const parts = value
    .replace(/[@._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
