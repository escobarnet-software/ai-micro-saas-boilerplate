import {
  Blocks,
  ChartColumn,
  CodeXml,
  Cpu,
  Gauge,
  Globe,
  KeyRound,
  Layers,
  ShieldCheck,
  WandSparkles,
  Zap,
} from "lucide-react";

import { PLAN_CREDITS, PLAN_PRICE } from "@/lib/plans";

export type IconType = React.ComponentType<{ className?: string }>;

export interface NavLink {
  label: string;
  href: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: IconType;
}

export type PlanId = "free" | "starter" | "pro";

export interface PricingTier {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  interval: "month" | "forever";
  credits: number;
  highlighted: boolean;
  cta: string;
  href: string;
  features: string[];
}

export const siteConfig = {
  name: "Nebula AI",
  domain: "nebula.ai",
  tagline: "Ship your AI SaaS this weekend.",
  description:
    "Production-grade AI micro-SaaS boilerplate with Next.js 14, Supabase auth, Stripe billing and credit-based AI generation.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "hello@nebula.ai",
  github: "https://github.com",
  x: "https://x.com",
  linkedin: "https://linkedin.com",
} as const;

export const mainNav: NavLink[] = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const footerNav: ReadonlyArray<{ title: string; items: NavLink[] }> = [
  {
    title: "Product",
    items: mainNav,
  },
  {
    title: "Account",
    items: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

export const features: Feature[] = [
  {
    title: "Credit based billing",
    description:
      "Atomic credit consumption with an auditable ledger. Charge per generation and never oversell.",
    icon: Gauge,
  },
  {
    title: "Supabase auth wired",
    description:
      "Email + password flows, SSR cookie sessions and route protection already implemented for you.",
    icon: KeyRound,
  },
  {
    title: "OpenAI ready",
    description:
      "Typed API route with retries, timeout control, streaming-ready output and safe error surfaces.",
    icon: Cpu,
  },
  {
    title: "Stripe subscriptions",
    description:
      "Checkout, customer portal and idempotent webhooks that grant credits on payment.",
    icon: ChartColumn,
  },
  {
    title: "Design system first",
    description:
      "shadcn/ui primitives, dark mode by default and a landing page that converts out of the box.",
    icon: Layers,
  },
  {
    title: "Type safe end to end",
    description:
      "Strict TypeScript, generated database types and discriminated API responses across the app.",
    icon: CodeXml,
  },
];

export const secondaryFeatures: Feature[] = [
  { title: "Row level security", description: "Policies scoped to auth.uid().", icon: ShieldCheck },
  { title: "Middleware guards", description: "Private routes protected at the edge.", icon: Blocks },
  { title: "Edge deployable", description: "Zero-config on Vercel.", icon: Globe },
  { title: "Instant onboarding", description: "New accounts get a starter credit grant.", icon: Zap },
  { title: "Composable prompts", description: "Swap models and prompts in one module.", icon: WandSparkles },
];

export const pricingTiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    description: "Kick the tires and ship your first flow.",
    price: PLAN_PRICE.free,
    interval: "forever",
    credits: PLAN_CREDITS.free,
    highlighted: false,
    cta: "Start for free",
    href: "/signup",
    features: [
      "100 credits / month",
      "1 workspace",
      "Community support",
      "OpenAI GPT-4o mini",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For indie builders getting real usage.",
    price: PLAN_PRICE.starter,
    interval: "month",
    credits: PLAN_CREDITS.starter,
    highlighted: true,
    cta: "Upgrade to Starter",
    href: "/signup?plan=starter",
    features: [
      "2,000 credits / month",
      "Unlimited generations",
      "Generation history",
      "Email support",
      "Usage analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Scale a paid product without limits.",
    price: PLAN_PRICE.pro,
    interval: "month",
    credits: PLAN_CREDITS.pro,
    highlighted: false,
    cta: "Upgrade to Pro",
    href: "/signup?plan=pro",
    features: [
      "10,000 credits / month",
      "Priority model routing",
      "Team seats (coming soon)",
      "Webhooks & API keys",
      "Priority support",
    ],
  },
];

export const faqs: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "Do I need a Supabase project?",
    answer:
      "Yes. Create a free project, run the SQL migration in supabase/migrations and paste the keys into .env.local. Auth, credits and RLS are already wired.",
  },
  {
    question: "How do credits work?",
    answer:
      "Every generation debits an atomic counter through a Postgres function. Insufficient balance returns a 402 and the request never reaches OpenAI.",
  },
  {
    question: "Is Stripe required to start?",
    answer:
      "No. The dashboard and the AI generator work with the free plan. Add Stripe keys when you want to sell subscriptions.",
  },
  {
    question: "Can I use another LLM provider?",
    answer:
      "Yes. The provider lives in lib/ai and is the only place that talks to OpenAI, so swapping models is a single file change.",
  },
];
