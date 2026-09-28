import { NextResponse } from "next/server";

import { getSiteUrl } from "@/lib/env";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { HTTP_STATUS_BY_ERROR_CODE, apiFailure } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      apiFailure("UNAUTHORIZED", "Sign in to manage your subscription."),
      { status: HTTP_STATUS_BY_ERROR_CODE.UNAUTHORIZED }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      apiFailure(
        "INVALID_INPUT",
        "You do not have a billing account yet. Subscribe to a plan first."
      ),
      { status: HTTP_STATUS_BY_ERROR_CODE.INVALID_INPUT }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getSiteUrl()}${ROUTES.billing}`,
    });

    return NextResponse.json({ ok: true, data: { url: session.url } });
  } catch (error) {
    return NextResponse.json(
      apiFailure(
        "PROVIDER_ERROR",
        error instanceof Error
          ? error.message
          : "Could not open the billing portal."
      ),
      { status: HTTP_STATUS_BY_ERROR_CODE.PROVIDER_ERROR }
    );
  }
}
