import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import {
  GitHubIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/shared/brand-icons";
import { footerNav, siteConfig } from "@/lib/site";

const socials = [
  { label: "GitHub", href: siteConfig.github, Icon: GitHubIcon },
  { label: "X", href: siteConfig.x, Icon: XIcon },
  { label: "LinkedIn", href: siteConfig.linkedin, Icon: LinkedInIcon },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/80 bg-card/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="container relative py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>
            <div className="flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border/80 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Icon className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          {footerNav.map((group) => (
            <div key={group.title} className="space-y-4">
              <h3 className="text-sm font-semibold tracking-tight">
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={`${group.title}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/80 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="font-mono">
            Next.js 14 · Supabase · Stripe · OpenAI
          </p>
        </div>
      </div>
    </footer>
  );
}
