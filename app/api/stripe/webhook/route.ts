import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import {
  applySubscriptionPlan,
  findPlan,
  findUserIdByCustomerId,
  grantPlanCredits,
} from "@/lib/billing";
import { getStripeConfig } from "@/lib/env";
import { getStripe, planForPriceId } from "@/lib/stripe";
import type { PlanId } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
}

async function resolveUserId(
  metadataUserId: string | undefined,
  customer: unknown
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;
  const customerId = readId(customer);
  if (!customerId) return null;
  return findUserIdByCustomerId(customerId);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  let webhookSecret: string;
  let stripe: Stripe;
  try {
    webhookSecret = getStripeConfig().webhookSecret;
    stripe = getStripe();
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Stripe is unconfigured.",
      },
      { status: 500 }
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid webhook signature.",
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "invoice.paid":
        await onInvoicePaid(event.data.object);
        break;
      case "customer.subscription.updated":
        await onSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    // Returning 500 lets Stripe retry with exponential backoff.
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook handler failed.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId =
    session.client_reference_id ??
    (await resolveUserId(session.metadata?.user_id, session.customer));

  if (!userId) return;

  const plan = session.metadata?.plan;
  if (plan !== "starter" && plan !== "pro") return;

  await applySubscriptionPlan({
    userId,
    plan,
    customerId: readId(session.customer),
    subscriptionId: readId(session.subscription),
  });

  await grantPlanCredits({
    userId,
    plan,
    reference: `checkout:${session.id}`,
    description: `${plan} plan activated`,
  });
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  // The first invoice is credited by checkout.session.completed.
  if (invoice.billing_reason === "subscription_create") return;

  const userId = await resolveUserId(
    invoice.parent?.subscription_details?.metadata?.user_id,
    invoice.customer
  );
  if (!userId) return;

  const plan = (await findPlan(userId)) ?? "free";
  if (plan === "free") return;

  await grantPlanCredits({
    userId,
    plan,
    reference: `invoice:${invoice.id}`,
    description: `${plan} plan renewal`,
  });
}

async function onSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = await resolveUserId(
    subscription.metadata?.user_id,
    subscription.customer
  );
  if (!userId) return;

  const priceId = readId(subscription.items.data[0]?.price);
  const planFromPrice = priceId ? planForPriceId(priceId) : null;
  const planFromMetadata = subscription.metadata?.plan;
  const resolved =
    planFromPrice ??
    (planFromMetadata === "starter" || planFromMetadata === "pro"
      ? planFromMetadata
      : null);

  const active =
    subscription.status === "active" || subscription.status === "trialing";

  const plan: PlanId = active && resolved ? resolved : "free";

  await applySubscriptionPlan({
    userId,
    plan,
    customerId: readId(subscription.customer),
    subscriptionId: subscription.id,
  });
}

async function onSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await resolveUserId(
    subscription.metadata?.user_id,
    subscription.customer
  );
  if (!userId) return;

  await applySubscriptionPlan({
    userId,
    plan: "free",
    subscriptionId: null,
  });
}
