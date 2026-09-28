"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function deleteGenerationAction(
  id: string
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You are not signed in." };
  }

  const { error } = await supabase
    .from("generations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "Could not delete that generation." };
  }

  revalidatePath(ROUTES.generator);
  revalidatePath(ROUTES.dashboard);
  return { ok: true };
}
