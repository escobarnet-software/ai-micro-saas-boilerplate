import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/supabase";

/**
 * Service-role client. Bypasses RLS: only use it from trusted server code
 * such as webhooks and background jobs. Never import it in a client component.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
