import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pricingTiers } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-10 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px]"
      />
      <div className="container relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple credit based pricing
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Start free. Upgrade when your users start generating. Cancel anytime
            from the Stripe portal.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.id}
              className={cn(
                "relative flex flex-col overflow-hidden bg-card/40 transition-all duration-300",
                tier.highlighted
                  ? "border-primary/50 shadow-glow lg:-mt-3 lg:mb-3"
                  : "border-border/80 hover:border-border"
              )}
            >
              {tier.highlighted ? (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-primary/20 blur-3xl"
                  />
                  <Badge className="absolute right-4 top-4 gap-1 rounded-full bg-brand-gradient text-white">
                    <Sparkles className="size-3" />
                    Most popular
                  </Badge>
                </>
              ) : null}

              <CardHeader className="relative">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">
                    ${tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tier.interval === "forever" ? "forever" : "/ month"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {tier.credits.toLocaleString("en-US")} credits included
                </p>
              </CardHeader>

              <CardContent className="relative flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          tier.highlighted ? "text-primary" : "text-primary/70"
                        )}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="relative">
                <Button
                  asChild
                  className={cn(
                    "w-full",
                    tier.highlighted ? "glow-primary" : ""
                  )}
                  variant={tier.highlighted ? "default" : "outline"}
                >
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prices in USD. Taxes calculated at checkout by Stripe.
        </p>
      </div>
    </section>
  );
}
