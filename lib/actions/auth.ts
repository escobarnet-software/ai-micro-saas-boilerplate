"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.home);
}
