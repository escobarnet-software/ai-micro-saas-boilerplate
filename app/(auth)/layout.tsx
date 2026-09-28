import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { ROUTES } from "@/lib/routes";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade opacity-40"
      />

      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border/80 bg-card/40 p-12 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 size-[28rem] rounded-full bg-primary/20 blur-[120px]"
        />
        <Logo />

        <div className="relative max-w-md space-y-6">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            The boring parts of an AI SaaS,{" "}
            <span className="text-gradient">already handled</span>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Auth sessions, credit ledger, Stripe webhooks and an OpenAI route —
            wired, typed and ready to ship.
          </p>
          <ul className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            {[
              "Row level security",
              "Atomic credits",
              "Idempotent webhooks",
              "Streaming ready",
            ].map((item) => (
              <li
                key={item}
                className="rounded-lg border border-border/80 bg-background/40 px-3 py-2"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-[11px] text-muted-foreground">
          Secure sessions via Supabase Auth
        </p>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Logo className="lg:hidden" />
          <Link
            href={ROUTES.home}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
