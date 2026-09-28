import { Button } from "@/components/ui/button";
import { features, secondaryFeatures } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Features
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a paid AI product needs
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Skip the boilerplate treadmill. Auth, billing, credits and AI are
            already connected and typed.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-xl border border-border/80 bg-card/40 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/70"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="relative inline-flex size-10 items-center justify-center rounded-lg border border-border/80 bg-background/60 text-primary">
                <feature.icon className="size-5" />
              </span>
              <h3 className="relative mt-5 text-base font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>

        <div
          id="product"
          className="mt-16 overflow-hidden rounded-2xl border border-border/80 bg-card/40 p-8 sm:p-10"
        >
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                How it works
              </p>
              <h3 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                From prompt to paid in three steps
              </h3>
              <ol className="mt-8 space-y-6">
                {[
                  {
                    step: "01",
                    title: "Sign up and get credits",
                    body: "Supabase creates the account and a Postgres trigger grants the starter balance.",
                  },
                  {
                    step: "02",
                    title: "Generate with your own prompt",
                    body: "The API route authenticates, validates with Zod and debits credits atomically.",
                  },
                  {
                    step: "03",
                    title: "Charge with Stripe",
                    body: "Checkout sessions and webhooks top up credits and flip the subscription plan.",
                  },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background/60 font-mono text-[11px] text-primary">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <Button asChild className="mt-8">
                <a href="#pricing">View plans</a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {secondaryFeatures.map((item, index) => (
                <div
                  key={item.title}
                  className={cn(
                    "rounded-xl border border-border/80 bg-background/50 p-4",
                    index === secondaryFeatures.length - 1 &&
                      "sm:col-span-2"
                  )}
                >
                  <item.icon className="size-5 text-primary" />
                  <p className="mt-3 text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
