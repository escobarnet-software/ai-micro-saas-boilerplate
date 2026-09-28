import type { Metadata } from "next";
import { CircleAlert, CircleCheckBig, Zap } from "lucide-react";

import { CheckoutButton } from "@/components/dashboard/checkout-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { PortalButton } from "@/components/dashboard/portal-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { isPaidPlan } from "@/lib/plans";
import { pricingTiers } from "@/lib/site";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing",
};

interface BillingPageProps {
  searchParams: { checkout?: string };
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { profile } = await requireProfile();
  const checkoutStatus = searchParams.checkout;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Manage your plan, credits and payment details."
        action={
          profile.stripe_customer_id ? <PortalButton /> : undefined
        }
      />

      {checkoutStatus === "success" ? (
        <p className="flex items-center gap-2 rounded-xl border border-[hsl(152_69%_45%/0.4)] bg-[hsl(152_69%_45%/0.1)] px-4 py-3 text-sm">
          <CircleCheckBig className="size-4 text-[hsl(152_69%_45%)]" />
          Payment received. Your credits are applied as soon as Stripe confirms
          the invoice (usually a few seconds).
        </p>
      ) : null}

      {checkoutStatus === "cancelled" ? (
        <p className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
          <CircleAlert className="size-4" />
          Checkout cancelled — nothing was charged.
        </p>
      ) : null}

      <Card className="bg-card/40">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">Current plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/80 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
            <p className="mt-1 text-lg font-semibold capitalize">
              {profile.plan}
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Credits
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-lg font-semibold">
              <Zap className="size-4 text-primary" />
              {profile.credits.toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Subscription
            </p>
            <p className="mt-1 truncate font-mono text-xs">
              {profile.stripe_subscription_id ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-5 lg:grid-cols-3">
        {pricingTiers.map((tier) => {
          const current = tier.id === profile.plan;

          return (
            <Card
              key={tier.id}
              className={cn(
                "flex flex-col bg-card/40",
                current ? "border-primary/50 shadow-glow" : "border-border/80"
              )}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{tier.name}</CardTitle>
                  {current ? (
                    <Badge className="rounded-md bg-brand-gradient text-white">
                      Current
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight">
                    ${tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tier.interval === "forever" ? "forever" : "/ month"}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {tier.credits.toLocaleString("en-US")} credits / month
                </p>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-primary/80" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <div className="p-6 pt-0">
                {current ? (
                  <div className="invisible h-10" aria-hidden="true" />
                ) : isPaidPlan(tier.id) ? (
                  <CheckoutButton
                    plan={tier.id}
                    label={`Upgrade to ${tier.name}`}
                    featured={tier.highlighted}
                  />
                ) : (
                  <div className="invisible h-10" aria-hidden="true" />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
