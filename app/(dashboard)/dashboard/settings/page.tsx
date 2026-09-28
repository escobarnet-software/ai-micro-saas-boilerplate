import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { displayName, requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { user, profile } = await requireProfile();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Update how your account appears across the workspace."
      />

      <Card className="bg-card/40">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Your display name is shown in the sidebar and on invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            fullName={displayName(profile, "")}
            email={profile.email ?? user.email ?? ""}
          />
        </CardContent>
      </Card>

      <Card className="bg-card/40">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Read-only details managed by Supabase and Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "User ID", value: user.id },
            { label: "Plan", value: profile.plan },
            {
              label: "Credits",
              value: profile.credits.toLocaleString("en-US"),
            },
            { label: "Member since", value: formatDate(profile.created_at) },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-border/80 bg-background/40 p-3"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {row.label}
              </p>
              <p className="mt-1 truncate font-mono text-sm">{row.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Danger zone</CardTitle>
            <Badge variant="destructive" className="rounded-md text-[10px]">
              irreversible
            </Badge>
          </div>
          <CardDescription>
            Deleting your account removes every generation and credit record.
            Contact support to request deletion — the SQL cascade is already in
            place.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
