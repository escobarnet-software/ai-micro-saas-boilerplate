import Link from "next/link";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

interface LogoProps {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 outline-none",
        className
      )}
      aria-label={siteConfig.name}
    >
      <span className="relative inline-flex size-8 items-center justify-center overflow-hidden rounded-lg bg-brand-gradient shadow-glow">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-4 text-white"
        >
          <path
            d="M12 2.5 14.4 9.6 21.5 12l-7.1 2.4L12 21.5 9.6 14.4 2.5 12l7.1-2.4L12 2.5Z"
            fill="currentColor"
          />
        </svg>
        <span className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" />
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight">
          {siteConfig.name}
        </span>
      ) : null}
    </Link>
  );
}
