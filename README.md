# AI Micro-SaaS Boilerplate

A production-grade starting point for paid AI micro-SaaS products: a premium
marketing site, Supabase auth, an atomic credit ledger, Stripe subscriptions and
an OpenAI generation pipeline — all typed end to end.

Built with **Next.js 14 (App Router)**, **TypeScript (strict)**, **Tailwind CSS**,
**shadcn/ui**, **Supabase**, **Stripe** and **OpenAI**.

---

## Table of contents

- [What you get](#what-you-get)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Stripe setup](#stripe-setup)
- [OpenAI setup](#openai-setup)
- [Project structure](#project-structure)
- [How credits work](#how-credits-work)
- [API reference](#api-reference)
- [Customising](#customising)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## What you get

**Marketing**
- Dark-first, glassy landing page with a gradient hero, animated grid backdrop,
  a product mock, a feature grid, "how it works", three-tier pricing, FAQ and a
  closing CTA.
- Light / dark theme toggle powered by `next-themes` (dark by default).
- SEO metadata, Open Graph and Twitter cards, sticky responsive navbar.
- Auth-aware navbar CTA (detects the session client-side, so `/` stays static).

**Accounts**
- Email + password sign up / sign in with Zod validation and inline errors.
- GitHub OAuth (swap the provider id for Google, Discord, …).
- PKCE callback route, cookie-based SSR sessions, session refresh in middleware.
- Protected `/dashboard/*` routes with `?next=` redirect preservation.
- Profile editing with a server action.

**AI product**
- `/dashboard` overview: credits, generations, spend, ledger activity.
- `/dashboard/generator`: prompt box with examples, loading skeleton, copy to
  clipboard, generation history with delete.
- `POST /api/generate` — auth, Zod validation, per-user rate limiting, credit
  debit, OpenAI call, automatic refund on failure, audit rows.

**Billing**
- Stripe Checkout for subscriptions, Billing Portal for self-serve changes.
- Idempotent webhook that syncs plans and grants credits — safe under retries.
- Plan gating lives in the database, not in the UI.

**Engineering**
- `strict` TypeScript, no `any`, typed Supabase schema, discriminated API
  response envelope (`ApiSuccess | ApiFailure`) with one status map.
- Row Level Security on every table; users can only read their own rows.
- Server-only secrets isolated behind `lib/env.ts` accessors that fail loudly.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router, Server Components, Route Handlers) |
| Language | TypeScript (strict, `target: ES2022`) |
| Styling | Tailwind CSS 3 + shadcn/ui + `tailwindcss-animate` |
| Auth & DB | Supabase (Postgres, Auth, RLS) via `@supabase/ssr` |
| Payments | Stripe Checkout, Billing Portal, Webhooks |
| AI | OpenAI Node SDK (`gpt-4o-mini` by default) |
| Forms | React Hook Form + Zod on the client, Server Actions on the server |
| UX | `sonner` toasts, `lucide-react` icons |

---

## Quick start

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env.local     # Windows: copy .env.example .env.local

# 3. apply the database migrations (see "Supabase setup")
# 4. run
npm run dev                    # http://localhost:3000
```

The app boots without any keys — the landing page renders and `/dashboard`
redirects to `/login`. Fill in the environment variables to unlock auth, AI and
billing.

---

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | auth, dashboard | Project URL from Supabase settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | auth, dashboard | Public anon key (safe in the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe webhook | **Server only** — never expose it |
| `OPENAI_API_KEY` | generation | `sk-…` |
| `OPENAI_MODEL` | generation | Defaults to `gpt-4o-mini` |
| `OPENAI_MAX_TOKENS` | generation | Defaults to `1024` |
| `STRIPE_SECRET_KEY` | billing | `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | billing | `whsec_…` from the webhook endpoint |
| `STRIPE_PRICE_ID_STARTER` | billing | Price for the $19 plan |
| `STRIPE_PRICE_ID_PRO` | billing | Price for the $49 plan |
| `NEXT_PUBLIC_SITE_URL` | billing, emails | `http://localhost:3000` or your domain |

All access goes through `lib/env.ts`, which throws a descriptive
`MissingEnvError` instead of returning `undefined`:

```ts
import { getOpenAIConfig } from "@/lib/env";

const { apiKey, model } = getOpenAIConfig(); // throws if unset
```

---

## Supabase setup

1. **Create a project** at [database.new](https://database.new).
2. **Create the schema.** Fastest path: open *SQL Editor → New query*, paste
   [`supabase/setup.sql`](./supabase/setup.sql) and press **Run**. It is
   idempotent (safe to run twice), applies everything below, and also backfills
   profile rows for accounts that signed up before the trigger existed.

   Prefer the CLI? Run `supabase link` then `supabase db push` to apply the four
   versioned migrations in order:

   | File | Creates |
   | --- | --- |
   | `supabase/migrations/0001_init.sql` | `profiles`, `credit_transactions`, `generations`, indexes, `updated_at` trigger |
   | `supabase/migrations/0002_credit_functions.sql` | `grant_credits`, `consume_credits`, `refund_credits` + idempotency index |
   | `supabase/migrations/0003_new_user_trigger.sql` | Profile row + 100 bonus credits on sign up |
   | `supabase/migrations/0004_rls_policies.sql` | Row Level Security for every table |
   | `supabase/migrations/0005_bootstrap_profile.sql` | `bootstrap_profile()` RPC: creates a missing profile row for the signed-in user |

3. **Copy the keys** from *Project settings → API* into `.env.local`.
4. **Auth settings** (*Authentication → Providers*):
   - Enable **Email** and (optionally) **GitHub**.
   - Add `http://localhost:3000/auth/callback` and
     `https://your-domain.com/auth/callback` to *Redirect URLs*.
   - For local testing without an inbox, turn **Confirm email** off; sign up then
     logs the user straight in. With it on, `/signup` shows a "check your inbox"
     state.

> The credit functions are `security definer` and revoked from `anon`. Only
> `consume_credits` is callable by `authenticated`; grants and refunds run with
> the service role from trusted server code.

---

## Stripe setup

1. Create two recurring **products/prices**: a $19 Starter and a $49 Pro plan
   (monthly). Copy the price ids into `STRIPE_PRICE_ID_STARTER` and
   `STRIPE_PRICE_ID_PRO`.
2. Add your secret key to `STRIPE_SECRET_KEY`.
3. Configure the **Customer portal** (*Settings → Billing → Customer portal*)
   so "Manage subscription" works.
4. Forward webhooks locally:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`. In production create
   an endpoint for `https://your-domain.com/api/stripe/webhook`.

Handled events:

| Event | Effect |
| --- | --- |
| `checkout.session.completed` | Links customer + subscription, sets the plan, grants the first quota |
| `invoice.paid` | Grants the renewal quota (skips `subscription_create`) |
| `customer.subscription.updated` | Syncs the plan, downgrades on `past_due` / `unpaid` |
| `customer.subscription.deleted` | Downgrades the account to `free` |

Credit grants are idempotent: each event stores a `reference`
(`checkout:cs_…` / `invoice:in_…`) and `grant_credits` refuses to credit the
same reference twice, so Stripe retries can never double-credit an account.

---

## OpenAI setup

1. Create a key at [platform.openai.com](https://platform.openai.com/api-keys)
   and set `OPENAI_API_KEY`.
2. Adjust `OPENAI_MODEL` / `OPENAI_MAX_TOKENS` if you prefer another model.
3. Swap providers in a single file — `lib/ai/provider.ts` is the only module
   that talks to a model:

```ts
const result = await generateCompletion({ prompt, temperature: 0.4 });
// { content, model, tokensUsed }
```

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `ERR_TOO_MANY_REDIRECTS` on `/dashboard` | Historical: the guard sent signed-in users without a profile row to `/login`, and the middleware then sent them straight back to `/dashboard`. `requireProfile()` no longer redirects — it creates the missing row (`createMissingProfile`) — and the middleware skips its "signed in, go to the dashboard" bounce whenever the URL carries `error` or `next`. If it still happens, run `supabase/setup.sql` (idempotent) and confirm your account exists in `public.profiles`. |
| "This page could not be loaded" | The error boundary in `app/error.tsx` catching a server failure. Open **`/api/health`**: it reports exactly which table, RPC or environment variable is missing, with the fix. In development the page also prints the raw error and the terminal logs an `[auth] …` line. |
| The dashboard is empty right after setup | Expected: the signup trigger only fires for new accounts, and `supabase/setup.sql` backfills the ones that already existed. |
| Logged out on every reload | Session cookies are refreshed by the middleware, which now copies them onto its redirects. Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present in the environment that **builds** the app (Next inlines them). |
| Generation fails with 402 | Out of credits: `consume_credits` raised `insufficient_credits`. Top up with the SQL snippet at the end of `supabase/setup.sql`, or subscribe. |
| `?next=` misbehaving | Every `next` value goes through `safeRedirectPath()` (`lib/routes.ts`), which rejects absolute URLs, `//evil.com` and the auth routes themselves. |

---

## Project structure

```
app/
  (marketing)/            # public site: navbar + footer shell
    page.tsx              # landing page
  (auth)/                 # split-screen auth shell
    login|signup/page.tsx
  (dashboard)/            # protected shell, force-dynamic
    dashboard/            # overview | generator | billing | settings
  api/
    generate/route.ts     # POST — credits + OpenAI
    stripe/
      checkout/route.ts   # POST — subscription checkout session
      portal/route.ts     # POST — billing portal session
      webhook/route.ts    # POST — signature-verified Stripe events
  auth/callback/route.ts  # PKCE code exchange
components/
  landing/                # hero, features, pricing, faq, cta
  layout/                 # navbar, footer
  auth/                   # sign in / sign up forms, oauth, sign out
  dashboard/              # shell, generator, history, forms, cards
  ui/                     # shadcn/ui primitives
  theme-provider.tsx      theme-toggle.tsx
lib/
  ai/provider.ts          # the only module that calls a model
  actions/                # server actions (auth, profile, generations)
  supabase/               # client | server | admin | middleware clients
  auth.ts                 # getCurrentUser / requireProfile helpers
  billing.ts              # Stripe → profile + credit sync
  stripe.ts               # Stripe client and price/plan mapping
  plans.ts                # single source of truth for plan quotas
  env.ts                  # typed, fail-fast environment access
  rate-limit.ts           # per-user sliding window limiter
  routes.ts               # route constants and credit costs
  validations.ts          # shared Zod schemas
  site.ts                 # marketing copy: nav, features, pricing, faqs
supabase/migrations/      # schema, credit functions, RLS
types/
  supabase.ts             # generated-style database types
  api.ts                  # ApiResponse envelope + status mapping
middleware.ts             # session refresh + protected route guard
```

---

## How credits work

Every account holds an integer balance in `profiles.credits`. Money never
touches the balance directly — the append-only `credit_transactions` table is the
ledger.

1. **Sign up** → the `on_auth_user_created` trigger writes the profile row and
   grants the starter quota (100 credits).
2. **Generation** → `POST /api/generate` calls `consume_credits(1)`. The function
   is a single atomic `UPDATE … WHERE credits >= amount`, so two parallel
   requests can never overdraw the account. It returns `insufficient_credits`
   when the balance is too low and the API answers `402`.
3. **Failure** → if OpenAI errors or times out, the route inserts a `failed`
   generation row and calls `refund_credits`, so users never pay for nothing.
4. **Subscription** → Stripe webhooks call `grant_credits(plan quota, reference)`
   with a unique reference. Replays are ignored, guaranteeing exactly-once
   crediting.

Adjust the cost per run with `CREDIT_COST_PER_GENERATION` in `lib/routes.ts` and
the quotas in `lib/plans.ts`.

---

## API reference

All JSON endpoints answer with the same envelope:

```jsonc
// success
{ "ok": true, "data": { /* … */ } }

// failure
{ "ok": false, "error": { "code": "INSUFFICIENT_CREDITS", "message": "…", "details": {} } }
```

| Method | Route | Auth | Body | Status codes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | none | — | `200` (booleans only: env, tables, functions, profile) |
| `POST` | `/api/generate` | session cookie | `{ prompt, temperature? }` | `200`, `401`, `402`, `422`, `429`, `502` |
| `POST` | `/api/stripe/checkout` | session cookie | `{ plan: "starter" \| "pro" }` | `200`, `401`, `422`, `502` |
| `POST` | `/api/stripe/portal` | session cookie | — | `200`, `401`, `422`, `502` |
| `POST` | `/api/stripe/webhook` | Stripe signature | raw Stripe event | `200`, `400`, `500` |

`lib/rate-limit.ts` allows 10 generations per user per minute. It is in-memory:
swap the `Map` for Upstash/Redis when you run more than one instance.

---

## Customising

| Change | Where |
| --- | --- |
| Brand name, tagline, nav, footer | `lib/site.ts` |
| Colours, radii, fonts | `app/globals.css` + `tailwind.config.ts` |
| Landing sections | `components/landing/*` |
| Plans, prices, quotas | `lib/plans.ts` (pricing + billing pages read from it) |
| Model, system prompt | `lib/ai/provider.ts` |
| Generation cost, protected routes | `lib/routes.ts` |
| Validation rules | `lib/validations.ts` |

Because the design tokens live in CSS custom properties, switching the accent
colour is a two-line change:

```css
--primary: 262 83% 58%;         /* light */
.dark { --primary: 262 83% 68%; }
```

---

## Deployment

1. Push the repository to GitHub and import it in Vercel.
2. Add every variable from `.env.example` to the Vercel project (set
   `NEXT_PUBLIC_SITE_URL` to the production domain).
3. Add `https://your-domain.com/auth/callback` to Supabase redirect URLs.
4. Create the Stripe webhook endpoint and copy its signing secret.
5. Deploy — `middleware.ts` runs on the edge, dashboard and API routes stay on
   the Node.js runtime because they use cookies, the OpenAI SDK and Stripe.

---

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build (type-checks + lints)
npm start        # serve the production build
npm run lint     # eslint
```

---

## License

MIT — use it, ship it, sell it.
