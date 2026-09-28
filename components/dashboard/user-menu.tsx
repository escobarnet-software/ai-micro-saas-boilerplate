"use client";

import Link from "next/link";
import { CreditCard, LayoutDashboard, Settings } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  plan: string;
  className?: string;
}

export function UserMenu({
  name,
  email,
  avatarUrl,
  plan,
  className,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-3 px-2 py-2 text-left",
            className
          )}
        >
          <Avatar className="size-9 border border-border/80">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-brand-gradient text-xs font-medium text-white">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs capitalize text-muted-foreground">
              {plan} plan
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2">
          <Link href={ROUTES.dashboard}>
            <LayoutDashboard className="size-4" />
            Overview
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2">
          <Link href={ROUTES.billing}>
            <CreditCard className="size-4" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2">
          <Link href={ROUTES.settings}>
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SignOutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
