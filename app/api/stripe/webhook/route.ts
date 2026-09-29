import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import {
  applySubscriptionPlan,
  findPlan,
  findUserIdByCustomerId,
  grantPlanCredits,
} from "@/lib/billing";
import { getStripeConfig } from "@/lib/env";
import type { PaidPlanId } from "@/lib/plans";
import {
  findActiveSubscriptionForCustomer,
  findActiveSubscriptionForUser,
  getStripe,
  planForPriceId,
} from "@/lib/stripe";

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
      case "invoice.payment_succeeded":
        await onInvoicePaid(event.data.object);
        break;
      case "customer.subscription.created":
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

  if (!userId) {
    console.warn(`[webhook] checkout.session.completed ${session.id}: no user resolved`);
    return;
  }

  const plan = session.metadata?.plan;
  if (plan !== "starter" && plan !== "pro") {
    console.warn(`[webhook] checkout.session.completed ${session.id}: missing/invalid plan metadata (${String(plan)})`);
    return;
  }

  console.log(`[webhook] checkout.session.completed ${session.id}: applying ${plan} to user ${userId}`);

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
  const userId = await resolveUserId(
    invoice.parent?.subscription_details?.metadata?.user_id,
    invoice.customer
  );
  if (!userId) {
    console.warn(`[webhook] invoice.paid ${invoice.id}: no user resolved`);
    return;
  }

  // Self-heal: if checkout.session.completed failed (e.g. bad service-role
  // key at the time), the profile may still be on "free". Sync the plan from
  // the subscription before granting credits so the purchase is not lost.
  const rawInvoice = invoice as unknown as Record<string, unknown>;
  const subscriptionId =
    readId(rawInvoice["subscription"]) ??
    readId(
      (rawInvoice["parent"] as Record<string, unknown> | undefined)?.[
        "subscription_details"
      ],
    ) ??
    readId(
      (
        (rawInvoice["parent"] as Record<string, unknown> | undefined)?.[
          "subscription_details"
        ] as Record<string, unknown> | undefined
      )?.["subscription"],
    );
  if (subscriptionId) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const implied = planFromSubscription(subscription);
      if (implied) {
        const current = (await findPlan(userId)) ?? "free";
        if (current !== implied) {
          console.log(`[webhook] invoice.paid ${invoice.id}: healing plan ${current} -> ${implied} for user ${userId}`);
          await applySubscriptionPlan({
            userId,
            plan: implied,
            customerId: readId(invoice.customer),
            subscriptionId: subscription.id,
          });
        }
      }
    } catch (error) {
      console.warn(`[webhook] invoice.paid ${invoice.id}: plan heal failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // The first invoice is credited by checkout.session.completed to avoid
  // double-granting (grant_credits is idempotent by reference, but keep it clean).
  if (invoice.billing_reason === "subscription_create") return;

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

  const active =
    subscription.status === "active" || subscription.status === "trialing";

  // An inactive subscription may be one of several: only downgrade when nothing
  // else is still granting access.
  if (!active) {
    await reconcilePlans({
      userId,
      customerId: readId(subscription.customer),
      endedSubscriptionId: subscription.id,
    });
    return;
  }

  await applySubscriptionPlan({
    userId,
    plan: planFromSubscription(subscription) ?? "free",
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

  await reconcilePlans({
    userId,
    customerId: readId(subscription.customer),
    endedSubscriptionId: subscription.id,
  });
}

/** Plan a subscription implies: the price id first, the metadata second. */
function planFromSubscription(subscription: Stripe.Subscription): PaidPlanId | null {
  const priceId = readId(subscription.items.data[0]?.price);
  const planFromPrice = priceId ? planForPriceId(priceId) : null;
  if (planFromPrice) return planFromPrice;

  const fromMetadata = subscription.metadata?.plan;
  return fromMetadata === "starter" || fromMetadata === "pro"
    ? fromMetadata
    : null;
}

/**
 * Keeps the account on the best plan it is still paying for. Without this, a
 * customer holding two subscriptions (an upgrade, or a second checkout) would be
 * downgraded to `free` the moment either of them ends.
 */
async function reconcilePlans(params: {
  userId: string;
  customerId: string | null;
  endedSubscriptionId: string;
}): Promise<void> {
  // Prefer the metadata lookup: it survives a user having several Stripe
  // customers. Fall back to the customer's subscription list.
  const remaining =
    (await findActiveSubscriptionForUser(
      params.userId,
      params.endedSubscriptionId
    )) ??
    (params.customerId
      ? await findActiveSubscriptionForCustomer(
          params.customerId,
          params.endedSubscriptionId
        )
      : null);

  if (remaining) {
    await applySubscriptionPlan({
      userId: params.userId,
      plan: planFromSubscription(remaining) ?? "free",
      customerId: params.customerId,
      subscriptionId: remaining.id,
    });
    return;
  }

  await applySubscriptionPlan({
    userId: params.userId,
    plan: "free",
    subscriptionId: null,
  });
}
