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

export function planSummary(plan: PaidPlanId) {
  return {
    id: plan,
    credits: PLAN_CREDITS[plan],
    price: PLAN_PRICE[plan],
  };
}

export { creditsForPlan, isPaidPlan };
export type { PaidPlanId };
