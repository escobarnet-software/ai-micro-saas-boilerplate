"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(80, "That name is too long"),
});

export interface ProfileActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function updateProfileAction(
  _previous: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted field.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You are not signed in." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { status: "error", message: "Could not save your profile." };
  }

  if (!data) {
    return {
      status: "error",
      message:
        "Your profile row is missing from the database: run supabase/setup.sql, then try again.",
    };
  }

  revalidatePath(ROUTES.settings);
  revalidatePath(ROUTES.dashboard);

  return { status: "success", message: "Profile updated." };
}
