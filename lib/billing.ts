import { creditsForPlan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/types/supabase";

/**
 * Mirrors a Stripe subscription onto the profile row.
 */
export async function applySubscriptionPlan(params: {
  userId: string;
  plan: PlanId;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();

  const patch: {
    plan: PlanId;
    stripe_customer_id?: string;
    stripe_subscription_id?: string | null;
  } = { plan: params.plan };

  if (params.customerId) {
    patch.stripe_customer_id = params.customerId;
  }

  if (params.subscriptionId !== undefined) {
    patch.stripe_subscription_id = params.subscriptionId;
  }

  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", params.userId);

  if (error) {
    throw new Error(`Could not sync the subscription: ${error.message}`);
  }
}

/**
 * Adds the plan quota to the credit ledger. `reference` makes the grant
 * idempotent, so Stripe retries never double-credit an account.
 */
export async function grantPlanCredits(params: {
  userId: string;
  plan: PlanId;
  reference: string;
  description: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.rpc("grant_credits", {
    p_user_id: params.userId,
    p_amount: creditsForPlan(params.plan),
    p_type: "purchase",
    p_description: params.description,
    p_metadata: { reference: params.reference, source: "stripe" },
  });

  if (error) {
    throw new Error(`Could not grant credits: ${error.message}`);
  }
}

export async function findUserIdByCustomerId(
  customerId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function findPlan(userId: string): Promise<PlanId | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  return data?.plan ?? null;
}
