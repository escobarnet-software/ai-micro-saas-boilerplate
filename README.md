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
| AI | Groq by default (`openai/gpt-oss-120b`), switchable to Google Gemini or OpenAI |
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
| `AI_PROVIDER` | generation | `groq` (default) \| `gemini` \| `openai` |
| `GROQ_API_KEY` | generation | `gsk_…` — free tier, no card |
| `GEMINI_API_KEY` | generation | `AIza…` — only when `AI_PROVIDER=gemini` |
| `OPENAI_API_KEY` | generation | `sk-…` — only when `AI_PROVIDER=openai` |
| `AI_MODEL` | generation | Optional: overrides the provider default |
| `AI_MAX_TOKENS` | generation | Defaults to `2048` (reasoning models spend part of it thinking) |
| `AI_TIMEOUT_MS` | generation | Defaults to `45000` |
| `STRIPE_SECRET_KEY` | billing | `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | billing | `whsec_…` from the webhook endpoint |
| `STRIPE_PRICE_ID_STARTER` | billing | Price for the $19 plan |
| `STRIPE_PRICE_ID_PRO` | billing | Price for the $49 plan |
| `NEXT_PUBLIC_SITE_URL` | billing, emails | `http://localhost:3000` or your domain |

All access goes through `lib/env.ts`, which throws a descriptive
`MissingEnvError` instead of returning `undefined`:

```ts
import { getAiConfig } from "@/lib/env";

const { provider, apiKey, model } = getAiConfig(); // throws if the key is unset
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
   | `supabase/migrations/0006_fail_generation_refund.sql` | `fail_generation()` RPC: atomic refund when a generation fails (debits carry a `generation:<id>` reference) |

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

## AI provider setup

Groq is the default: it has a **free tier that needs no credit card**, and its
API is OpenAI-compatible.

### Groq (recommended, free)

1. Create a key at [console.groq.com/keys](https://console.groq.com/keys).
2. Put it in `.env.local`:

   ```bash
   AI_PROVIDER=groq
   GROQ_API_KEY=gsk_...
   ```

3. Default model: `openai/gpt-oss-120b`. Verified against a live Groq account,
   the chat models available on the free tier are `openai/gpt-oss-120b`,
   `openai/gpt-oss-20b` (faster, cheaper), `qwen/qwen3.8-27b` and `allam-2-7b`
   — the `llama-*` models are enterprise-only and return `404` on free keys.
   Override with `AI_MODEL`.
4. **They are reasoning models**: part of `AI_MAX_TOKENS` is spent thinking
   (a one-word answer cost 178 tokens), so a very low limit yields no content at
   all and the API says so explicitly. Default is `2048`.
5. Free-tier limits are per minute: if you hit them, the API answers `429` and
   the message tells you to wait (the credits are refunded automatically).
6. Check your key without spending tokens: **`GET /api/health?probe=1`** lists
   the provider's models and confirms the key and `AI_MODEL` are valid.

### Google Gemini

1. Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY=AIza...`.
3. Default model: `gemini-3.8-flash`. Any id from the
   [model list](https://ai.google.dev/gemini-api/docs/models) works via `AI_MODEL`.

### OpenAI

Set `AI_PROVIDER=openai` and `OPENAI_API_KEY=sk-...` (default `gpt-4o-mini`).
An account with no balance answers `429 insufficient_quota`; the API turns that
into *"the account is out of credit"* rather than a rate-limit message.

### How it is wired

`lib/ai/provider.ts` is the only module that talks to a model, and it uses plain
`fetch` (no vendor SDK) so every provider shares one timeout and error path:

```ts
const result = await generateCompletion({ prompt, temperature: 0.4 });
// { content, model, tokensUsed }
```

Provider metadata (key variable, base URL, default model, docs link) lives in
`AI_PROVIDERS` in `lib/env.ts`: adding one is an entry there plus a branch in the
provider module. `"AI_PROVIDER is \"groq\" but GROQ_API_KEY is unset…"` is what
you get from `/api/health` when the key is missing.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `ERR_TOO_MANY_REDIRECTS` on `/dashboard` | Historical: the guard sent signed-in users without a profile row to `/login`, and the middleware then sent them straight back to `/dashboard`. `requireProfile()` no longer redirects — it creates the missing row (`bootstrapProfile`) — and the middleware skips its "signed in, go to the dashboard" bounce whenever the URL carries `error` or `next`. |
| An amber **"Database setup incomplete"** banner over the dashboard | The app is running in degraded mode: the `profiles` row could not be read *or* created. Run `supabase/setup.sql`, then reload — the banner disappears on its own. `/api/health` says exactly which piece is missing. |
| "This page could not be loaded" | The error boundary in `app/error.tsx` catching a server failure. Open **`/api/health`**: it reports exactly which table, RPC or environment variable is missing, with the fix. In development the page also prints the raw error and the terminal logs an `[auth] …` line. |
| The dashboard is empty right after setup | Expected: the signup trigger only fires for new accounts, and `supabase/setup.sql` backfills the ones that already existed. |
| Logged out on every reload | Session cookies are refreshed by the middleware, which now copies them onto its redirects. Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present in the environment that **builds** the app (Next inlines them). |
| Generation fails with 402 | Out of credits: `consume_credits` raised `insufficient_credits`. Top up with the SQL snippet at the end of `supabase/setup.sql`, or subscribe. |
| Activity shows `-1` with no matching `+1` | Fixed in `fail_generation()`: the refund used to run through the service role, whose PostgREST error was returned as data and never checked, so it failed silently whenever `SUPABASE_SERVICE_ROLE_KEY` was missing. Re-run `supabase/setup.sql` and check the terminal for `CREDIT NOT REFUNDED` if a refund ever fails again. |
| Generation says **"account is out of credit (quota exceeded)"** | Your provider has no balance. This is not a rate limit: switch `AI_PROVIDER=groq` (free tier) or add billing. |
| Generation says **"rate limiting requests (429)"** | You are hitting the provider's per-minute limit. Wait a few seconds; credits are refunded on every failure. |
| Generation says **"API key was rejected (401)"** | The key for the *selected* provider is missing, truncated or revoked. `/api/health` shows which variable it expects and the placeholder it found. |
| Generation says **"model was not found (404)"** | `AI_MODEL` does not exist for the selected provider. Remove it to use the default, or run `/api/health?probe=1` to see the models your key can actually use (the `llama-*` models on Groq are enterprise-only). |
| Generation says **"schema is out of date: consume_credits() exists without the p_metadata parameter"** | Migration 0006 changed that function's signature, so the copy in your database is the old one. Re-run `supabase/setup.sql` — it drops the two-argument version and installs the new one — and confirm with the query below. |
| Generation says **"produced no answer within N tokens"** | The model is a reasoning one and spent the budget thinking. Raise `AI_MAX_TOKENS` (default `2048`) or switch `AI_MODEL`. |
| The SQL script appears to apply only its first half | The idempotency index used to be written with the `?` operator, which some editors read as a parameter placeholder and abort on. It now uses `IS NOT NULL`, and every risky statement (the `auth.users` trigger, the index) runs inside a `DO` block that emits a `WARNING` instead of killing the rest of the script. Re-run it and look for `WARNING` lines in the editor output. |
| `/dashboard` feels slow | Measure with `npm run build && npm start`: `next dev` compiles each route on first hit, and every dashboard render costs one session verification plus the profile and page queries against your Supabase region. See [Performance notes](#performance-notes). |

### Verifying the database schema

```sql
-- Expected: 5 rows, including consume_credits(p_amount, p_description, p_metadata)
-- and fail_generation(p_generation_id, p_prompt, p_model, p_error).
select p.proname as function, pg_get_function_arguments(p.oid) as arguments
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('consume_credits', 'fail_generation', 'bootstrap_profile',
                     'grant_credits', 'refund_credits')
 order by p.proname;
```

`GET /api/health` reports the same thing (`functions[].state`) together with the
tables, the environment variables and the active AI provider.

---

## Performance notes

- Measure with `npm run build && npm start`: `npm run dev` compiles each route on
  first hit, which is what makes navigation feel slow the first time.
- **Unstyled flashes / a page that reloads itself are dev-mode symptoms**: Next
  restarts the dev server when `.env` or a config file changes, and forces a full
  reload when a module cannot be hot-swapped. During that reload the route's CSS
  chunk is rebuilt on demand, so the page paints without styles for a moment.
  Confirm it by looking at the terminal (`Compiling…` / `Restarting…`) and at the
  browser console (`[Fast Refresh] reloading`); the same app served by
  `npm start` does not do it.
- `app/(dashboard)/loading.tsx` gives every `/dashboard/*` navigation an immediate
  skeleton, so the shell (and its CSS) stays mounted while the server renders.
- The middleware only talks to Supabase for `/dashboard/*` and the auth pages, so
  a public request (landing, `/auth/callback`, `/api/*`) costs **zero** auth round
  trips.
- `/dashboard` verifies the session once per request (the Supabase SSR pattern),
  reads the profile once, and fetches the page data in a single parallel batch.
- The generation call is the slow part by nature: a reasoning model such as
  `openai/gpt-oss-120b` takes from a few seconds to tens of seconds. The UI shows
  a skeleton meanwhile and the browser aborts after 60s (`AI_TIMEOUT_MS`, default
  `45000`, caps it server-side). `AI_MODEL=openai/gpt-oss-20b` is about twice as
  fast.
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
    generate/route.ts     # POST — credits + AI provider
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
2. **Reservation** → `POST /api/generate` mints the generation id and calls
   `consume_credits(1, prompt, { reference: 'generation:<id>' })`. The function is
   a single atomic `UPDATE … WHERE credits >= amount`, so parallel requests can
   never overdraw the account, and the reference ties the debit to that specific
   generation. It raises `insufficient_credits` when the balance is too low, and
   the API answers `402`. The provider key is validated *before* this point, so a
   misconfigured installation never touches the balance.
3. **Failure** → the provider error is handled by one call to
   `fail_generation(<id>, prompt, model, error)`, which stores the `failed` row
   **and** refunds the reservation with a `refund:<id>` reference in the same
   transaction. The refund amount is read from the recorded debit (never from the
   caller), the unique reference index makes it happen exactly once, and it runs
   with the user's own session — no service-role key required. The activity list
   therefore shows a `-1` / `+1` pair for failed runs (net zero), while the
   `failed` row keeps `credits_used = 0` so the spend metric only counts
   successful runs. If the refund call itself fails, the route logs
   `CREDIT NOT REFUNDED for generation …` rather than swallowing it.
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
   the Node.js runtime because they use cookies, outbound AI calls and Stripe.

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
