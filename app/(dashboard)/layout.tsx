import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { displayName, requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s · Dashboard",
  },
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile } = await requireProfile();

  return (
    <DashboardShell
      account={{
        name: displayName(profile, "Builder"),
        email: profile.email ?? user.email ?? "",
        avatarUrl: profile.avatar_url,
        plan: profile.plan,
        credits: profile.credits,
      }}
    >
      {children}
    </DashboardShell>
  );
}
