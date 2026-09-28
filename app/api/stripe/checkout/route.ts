import { NextResponse, type NextRequest } from "next/server";

import { getSiteUrl } from "@/lib/env";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceIdForPlan } from "@/lib/stripe";
import { isPaidPlan } from "@/lib/plans";
import { HTTP_STATUS_BY_ERROR_CODE, apiFailure } from "@/types/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckoutBody {
  plan?: unknown;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      apiFailure("UNAUTHORIZED", "Sign in to start a subscription."),
      { status: HTTP_STATUS_BY_ERROR_CODE.UNAUTHORIZED }
    );
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json(
      apiFailure("INVALID_INPUT", "Request body must be JSON."),
      { status: HTTP_STATUS_BY_ERROR_CODE.INVALID_INPUT }
    );
  }

  const plan = typeof body.plan === "string" ? body.plan : "";
  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      apiFailure("INVALID_INPUT", "Choose the starter or pro plan."),
      { status: HTTP_STATUS_BY_ERROR_CODE.INVALID_INPUT }
    );
  }

  try {
    const stripe = getStripe();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const siteUrl = getSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: user.id,
      subscription_data: {
        metadata: { user_id: user.id, plan },
      },
      metadata: { user_id: user.id, plan },
      success_url: `${siteUrl}${ROUTES.dashboard}/billing?checkout=success`,
      cancel_url: `${siteUrl}${ROUTES.dashboard}/billing?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        apiFailure("PROVIDER_ERROR", "Stripe did not return a checkout URL."),
        { status: HTTP_STATUS_BY_ERROR_CODE.PROVIDER_ERROR }
      );
    }

    return NextResponse.json({ ok: true, data: { url: session.url } });
  } catch (error) {
    return NextResponse.json(
      apiFailure(
        "PROVIDER_ERROR",
        error instanceof Error
          ? error.message
          : "Could not start checkout."
      ),
      { status: HTTP_STATUS_BY_ERROR_CODE.PROVIDER_ERROR }
    );
  }
}
