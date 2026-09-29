import Stripe from "stripe";

import { getStripeConfig } from "@/lib/env";
import {
  PLAN_CREDITS,
  PLAN_PRICE,
  PAID_PLAN_IDS,
  creditsForPlan,
  isPaidPlan,
  type PaidPlanId,
} from "@/lib/plans";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const { secretKey } = getStripeConfig();
  cached = new Stripe(secretKey, {
    maxNetworkRetries: 2,
    timeout: 20_000,
  });

  return cached;
}

export function priceIdForPlan(plan: PaidPlanId): string {
  return getStripeConfig().priceIds[plan];
}

export function planForPriceId(priceId: string): PaidPlanId | null {
  const { priceIds } = getStripeConfig();

  for (const plan of PAID_PLAN_IDS) {
    if (priceIds[plan] === priceId) return plan;
  }

  return null;
}

/**
 * Any subscription of this user that still grants access, found through our own
 * `metadata.user_id` instead of the customer id.
 *
 * This is the reliable lookup when a user ends up with more than one Stripe
 * customer (a retried checkout before the first one could be persisted, for
 * example): the customer-based list would miss the other subscription and
 * wrongly downgrade a paying user.
 */
export async function findActiveSubscriptionForUser(
  userId: string,
  exceptSubscriptionId?: string
): Promise<Stripe.Subscription | null> {
  try {
    const found = await getStripe().subscriptions.search({
      query: `metadata['user_id']:'${userId}' AND status:'active'`,
      limit: 10,
    });

    return found.data.find((s) => s.id !== exceptSubscriptionId) ?? null;
  } catch {
    // Search can lag behind recent writes: let the caller fall back.
    return null;
  }
}

export async function findActiveSubscriptionForCustomer(
  customerId: string,
  exceptSubscriptionId?: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();
  let startingAfter: string | undefined;

  // Paginate: a customer rarely has many subs, but don't miss one on page 2.
  for (let page = 0; page < 5; page++) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 20,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    const found = list.data.find((s) => s.id !== exceptSubscriptionId);
    if (found) return found;
    if (!list.has_more || list.data.length === 0) return null;
    startingAfter = list.data[list.data.length - 1].id;
  }

  return null;
}

export function planSummary(plan: PaidPlanId) {
  return {
    id: plan,
    credits: PLAN_CREDITS[plan],
    price: PLAN_PRICE[plan],
  };
}

export { creditsForPlan, isPaidPlan };
export type { PaidPlanId };
