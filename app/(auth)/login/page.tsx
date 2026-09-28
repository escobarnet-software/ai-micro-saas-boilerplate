import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your workspace and keep generating.",
};

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to keep building.
        </p>
      </header>

      <Suspense fallback={<FormSkeleton />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
