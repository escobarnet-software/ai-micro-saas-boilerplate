import Link from "next/link";
import { Activity, Coins, TrendingUp, WandSparkles, Zap } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { displayName, requireProfile } from "@/lib/auth";
import {
  getDashboardStats,
  getRecentGenerations,
  getRecentTransactions,
} from "@/lib/dashboard-data";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/utils";

export default async function DashboardOverviewPage() {
  const { user, profile } = await requireProfile();
  const [stats, generations, transactions] = await Promise.all([
    getDashboardStats(user.id),
    getRecentGenerations(user.id),
    getRecentTransactions(user.id),
  ]);

  const name = displayName(profile, "Builder");

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${name.split(" ")[0]}`}
        description="Track your credits, review recent generations and keep shipping."
        action={
          <Button asChild className="glow-primary">
            <Link href={ROUTES.generator}>
              <WandSparkles className="size-4" />
              New generation
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Credits available"
          value={profile.credits.toLocaleString("en-US")}
          hint={`${profile.plan} plan`}
          icon={Zap}
        />
        <StatCard
          label="Total generations"
          value={stats.totalGenerations.toLocaleString("en-US")}
          hint="All time"
          icon={WandSparkles}
        />
        <StatCard
          label="This month"
          value={stats.generationsThisMonth.toLocaleString("en-US")}
          hint="Successful runs"
          icon={TrendingUp}
        />
        <StatCard
          label="Credits spent"
          value={stats.creditsSpentThisMonth.toLocaleString("en-US")}
          hint="Current billing month"
          icon={Coins}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="bg-card/40">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Recent generations</CardTitle>
              <CardDescription>
                Your latest prompts and their status.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href={ROUTES.generator}>Open generator</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {generations.length === 0 ? (
              <EmptyState
                icon={WandSparkles}
                title="Nothing generated yet"
                description="Run your first prompt to see it here with token usage and status."
                action={
                  <Button asChild size="sm">
                    <Link href={ROUTES.generator}>Try the generator</Link>
                  </Button>
                }
              />
            ) : (
              generations.map((generation) => (
                <article
                  key={generation.id}
                  className="rounded-lg border border-border/80 bg-background/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm">{generation.prompt}</p>
                    <Badge
                      variant={
                        generation.status === "succeeded"
                          ? "secondary"
                          : "destructive"
                      }
                      className="shrink-0 rounded-md text-[10px]"
                    >
                      {generation.status}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {generation.model} · {generation.tokens_used} tokens ·{" "}
                    {formatDate(generation.created_at)}
                  </p>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">Credit activity</CardTitle>
            <CardDescription>
              Every ledger entry for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Grants, debits and refunds will show up here."
              />
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-background/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm capitalize">
                      {transaction.type}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {transaction.description ?? "—"}
                    </p>
                  </div>
                  <span
                    className={
                      transaction.amount > 0
                        ? "font-mono text-sm text-[hsl(152_69%_50%)]"
                        : "font-mono text-sm text-muted-foreground"
                    }
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
