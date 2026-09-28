"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CircleCheckBig,
  LoaderCircle,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { createClient } from "@/lib/supabase/client";
import { ROUTES, SIGNUP_BONUS_CREDITS } from "@/lib/routes";
import { signUpSchema, type SignUpValues } from "@/lib/validations";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : ROUTES.dashboard;
  const [pending, setPending] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<
    string | null
  >(null);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpValues) {
    setPending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
          emailRedirectTo: `${window.location.origin}${ROUTES.authCallback}?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        toast.error("Could not create your account", {
          description: error.message,
        });
        return;
      }

      if (!data.session) {
        setAwaitingConfirmation(values.email);
        toast.success("Confirm your email to finish signing up");
        return;
      }

      toast.success(`Account created — ${SIGNUP_BONUS_CREDITS} credits added`);
      router.replace(next);
      router.refresh();
    } catch (error) {
      toast.error("Configuration error", {
        description:
          error instanceof Error
            ? error.message
            : "Check your Supabase environment variables.",
      });
    } finally {
      setPending(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          <CircleCheckBig className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">
            Check your inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">
              {awaitingConfirmation}
            </span>
            . Open it to activate your account and claim your credits.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      className="h-11 pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="h-11 pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="h-11 pl-9"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Include at least one letter and one number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-11 w-full glow-primary"
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <>
                Create account
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <OAuthButtons next={next} />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
