import type { PlanId } from "@/types/supabase";

export const PLAN_IDS: readonly PlanId[] = ["free", "starter", "pro"];

export type PaidPlanId = Exclude<PlanId, "free">;

/** Credits granted on every successful invoice payment (or on signup for free). */
export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 100,
  starter: 2000,
  pro: 10000,
};

/** Monthly price in whole dollars, mirroring the Stripe price objects. */
export const PLAN_PRICE: Record<PlanId, number> = {
  free: 0,
  starter: 19,
  pro: 49,
};

export const PAID_PLAN_IDS: readonly PaidPlanId[] = ["starter", "pro"];

export function isPaidPlan(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as readonly string[]).includes(value);
}

export function creditsForPlan(plan: PlanId): number {
  return PLAN_CREDITS[plan];
}
