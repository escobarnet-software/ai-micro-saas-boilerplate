"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { IconType } from "@/lib/site";

interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
    description: "Credits and activity",
  },
  {
    label: "Generator",
    href: ROUTES.generator,
    icon: WandSparkles,
    description: "Create with AI",
  },
  {
    label: "Billing",
    href: ROUTES.billing,
    icon: CreditCard,
    description: "Plan and invoices",
  },
  {
    label: "Settings",
    href: ROUTES.settings,
    icon: Settings,
    description: "Profile details",
  },
];

export interface AccountSummary {
  name: string;
  email: string;
  avatarUrl: string | null;
  plan: string;
  credits: number;
}

interface SidebarProps {
  account: AccountSummary;
  onNavigate?: () => void;
}

function SidebarContent({ account, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Dashboard">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === ROUTES.dashboard
              ? pathname === ROUTES.dashboard
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                active
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-border/80 bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Zap className="size-3.5 text-primary" />
            Credits
          </span>
          <span className="font-mono text-sm font-semibold">
            {account.credits.toLocaleString("en-US")}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-gradient transition-all duration-500"
            style={{
              width: `${Math.min(Math.max((account.credits / 2000) * 100, 4), 100)}%`,
            }}
          />
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3 w-full">
          <Link href={ROUTES.billing} onClick={onNavigate}>
            Manage plan
          </Link>
        </Button>
      </div>

      <UserMenu
        name={account.name}
        email={account.email}
        avatarUrl={account.avatarUrl}
        plan={account.plan}
      />
    </div>
  );
}
interface DashboardShellProps {
  account: AccountSummary;
  children: React.ReactNode;
}

export function DashboardShell({ account, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="relative flex min-h-dvh">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-grid mask-fade opacity-30"
      />

      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-border/80 bg-card/30 backdrop-blur-xl lg:block">
        <SidebarContent account={account} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[19rem] border-r border-border/80 bg-card shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              className="absolute right-3 top-4"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </Button>
            <SidebarContent account={account} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-background/70 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:block">
              {NAV_ITEMS.find((item) =>
                item.href === ROUTES.dashboard
                  ? pathname === ROUTES.dashboard
                  : pathname.startsWith(item.href)
              )?.label ?? "Workspace"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1.5 font-mono text-xs">
              <Zap className="size-3.5 text-primary" />
              {account.credits.toLocaleString("en-US")}
            </span>
            <Button asChild size="sm" className="glow-primary hidden sm:inline-flex">
              <Link href={ROUTES.generator}>
                <WandSparkles className="size-4" />
                New generation
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
