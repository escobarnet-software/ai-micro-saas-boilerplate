import type { Metadata } from "next";
import { Suspense } from "react";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create your free account and get 100 AI credits to start building.",
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

export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Free forever plan with credits included — no card required.
        </p>
      </header>

      <Suspense fallback={<FormSkeleton />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
