import type { Metadata } from "next";

import { GenerationHistory } from "@/components/dashboard/generation-history";
import { Generator } from "@/components/dashboard/generator";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireProfile } from "@/lib/auth";
import { getRecentGenerations } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Generator",
};

export default async function GeneratorPage() {
  const { user, profile } = await requireProfile();
  const generations = await getRecentGenerations(user.id, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI generator"
        description="Describe what you need, spend one credit and get copy you can ship."
      />

      <Generator credits={profile.credits} />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">History</h2>
            <p className="text-sm text-muted-foreground">
              The eight most recent runs for your account.
            </p>
          </div>
        </div>
        <GenerationHistory generations={generations} />
      </section>
    </div>
  );
}
