# 🚀 AI Micro-SaaS Boilerplate
### _by **Escobar NET**_

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ecf8e?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Stripe-Billing-635bff?style=for-the-badge&logo=stripe" alt="Stripe" />
  <img src="https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge" alt="Groq AI" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT" />
</p>

> **Production-grade starter to launch a paid AI micro-SaaS in a weekend.**
> Premium marketing site + Supabase Auth + atomic credit ledger + Stripe subscriptions (Checkout, Portal, idempotent webhooks) + multi-provider AI pipeline (Groq / Gemini / OpenAI) — fully typed end-to-end.
>
> 🛠️ Created and maintained by **[Escobar NET](https://github.com)** — we build SaaS that ships.

---

## 📑 Table of Contents

- [✨ Demo & Screenshots](#-demo--screenshots)
- [🎯 What You Get](#-what-you-get)
- [🧱 Tech Stack](#-tech-stack)
- [💳 Plans & Pricing](#-plans--pricing)
- [⚡ Quick Start](#-quick-start)
- [🔑 Environment Variables](#-environment-variables)
- [🗄️ Supabase Setup](#️-supabase-setup)
- [💠 Stripe Setup](#-stripe-setup)
- [🧪 Test Purchases](#-test-purchases-test-card)
- [🤖 AI Provider Setup](#-ai-provider-setup)
- [🪝 Webhooks in Localhost](#-webhooks-in-localhost)
- [📁 Project Structure](#-project-structure)
- [🪙 How Credits Work](#-how-credits-work)
- [🔌 API Reference](#-api-reference)
- [🎨 Customising](#-customising)
- [☁️ Deployment](#️-deployment)
- [🧰 Scripts](#-scripts)
- [👨‍💻 Author — Escobar NET](#-author--escobar-net)
- [📄 License](#-license)

---

## ✨ Demo & Screenshots

| Page | Route | Description |
|------|-------|-------------|
| 🏠 Landing | `/` | Dark-first glassy hero, animated grid, product mock, features, pricing, FAQ |
| 🔐 Login / Signup | `/login` · `/signup` | Email+password with Zod, GitHub OAuth, PKCE callback |
| 📊 Dashboard | `/dashboard` | Credits, generations, spend, recent activity |
| ✍️ Generator | `/dashboard/generator` | Prompt box, examples, skeleton loading, copy, history + delete |
| 💳 Billing | `/dashboard/billing` | Current plan, credits, subscription id, upgrades, portal |
| ⚙️ Settings | `/dashboard/settings` | Profile editing via Server Action |

> Run `npm run dev` and open **http://localhost:3000**.

---

## 🎯 What You Get

**Marketing**
- Dark-first glassy landing: gradient hero, animated grid, product mock, feature grid, how-it-works, 3-tier pricing, FAQ, CTA.
- Light/dark toggle via `next-themes` (dark by default). SEO + OG/Twitter cards, sticky navbar.
- Auth-aware navbar CTA (client-side session check, `/` stays static).

**Accounts**
- Email + password sign-up/in with Zod + inline errors. GitHub OAuth (swap for Google/Discord).
- PKCE callback, cookie SSR sessions, middleware refresh, protected `/dashboard/*` with `?next=` redirect.

**AI Product**
- `POST /api/generate`: auth, Zod validation, 10 req/min per-user rate limit, credit debit, AI call, auto-refund on failure, audit rows.

**Billing**
- Stripe Checkout + Billing Portal. Idempotent webhook (`checkout.session.completed`, `customer.subscription.*`, `invoice.paid` / `invoice.payment_succeeded`) syncs `profiles.plan` and grants credits — safe under retries.
- Self-healing: if checkout event failed once, the next invoice re-syncs the plan from the subscription.
- Plan gating lives in Postgres, not in the UI.

**Engineering**
- Strict TypeScript, zero `any`, typed Supabase schema, `ApiSuccess | ApiFailure` envelope with one status map.
- RLS on every table. Server secrets behind `lib/env.ts` accessors that fail loudly.
---

## 🧱 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, Server Components, Route Handlers, Node runtime for APIs) |
| Language | TypeScript (strict, `target: ES2022`) |
| Styling | Tailwind CSS 3 + shadcn/ui + `tailwindcss-animate` |
| Auth & DB | Supabase (Postgres, Auth, RLS) via `@supabase/ssr` + `@supabase/supabase-js` |
| Payments | Stripe Checkout, Billing Portal, Webhooks (`stripe` SDK v22) |
| AI | Groq by default (`openai/gpt-oss-120b`), switchable to Gemini or OpenAI |
| Forms | React Hook Form + Zod (client), Server Actions (server) |
| UX | `sonner` toasts, `lucide-react` icons, `next-themes` |

---

## 💳 Plans & Pricing

Defined once in `lib/plans.ts` — pricing, billing and webhook all read from it.

| Plan | Price | Credits / month | For |
|------|-------|-----------------|-----|
| **Free** | $0 forever | 100 | Try it out, first flow |
| **Starter** ⭐ | $19 / month | 2,000 | Indie builders getting real usage |
| **Pro** | $49 / month | 10,000 | Scale a paid product |

Stripe Price IDs are mapped via env (`STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`). The webhook resolves plan by **price id first, `metadata.plan` second**.

---

## ⚡ Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local     # Windows: copy .env.example .env.local

# 3. Apply the database migrations (see "Supabase Setup")

# 4. Run
npm run dev                    # http://localhost:3000
```

Health check tells you exactly what is missing:

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/health?probe=1"   # also pings the AI provider
```

---

## 🔑 Environment Variables

```bash
# --- Supabase (Project Settings -> API) ---
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Server only! Bypasses RLS. Webhook + checkout need it.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# --- AI (Groq default: free tier, no card) ---
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your-groq-api-key
# GEMINI_API_KEY=AIza_...        # only if AI_PROVIDER=gemini
# OPENAI_API_KEY=sk-...          # only if AI_PROVIDER=openai

# --- Stripe (dashboard.stripe.com/apikeys + /webhooks) ---
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-signing-secret
STRIPE_PRICE_ID_STARTER=price_your-starter-price-id
STRIPE_PRICE_ID_PRO=price_your-pro-price-id

# --- App ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> ⚠️ **Most common bug:** leaving `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key` as placeholder → webhook returns `Could not sync the subscription: Invalid API key` and the plan never changes. Paste the real `service_role` secret and **restart `npm run dev`**.

---

## 🗄️ Supabase Setup
---

## 🧪 Test Purchases (Test Card)

> No real money is charged in **test mode**. Use this official Stripe test card:

```
+----------------------------------------------+
|  STRIPE TEST CARD — TEST MODE ONLY           |
|  Number:    4242 4242 4242 4242              |
|  Expiry:    12 / 30  (any future date)       |
|  CVC:       123     (any 3 digits)           |
|  Name/ZIP:  anything                         |
+----------------------------------------------+
```

1. Sign up at `http://localhost:3000/signup`, log in.
2. **Dashboard → Billing** → **Upgrade to Starter** (or Pro).
3. Pay with the card above.
4. Redirect to `/dashboard/billing?checkout=success`.
5. Wait a few seconds → refresh → **Plan: starter**, **Credits +2,000**.

| Number | Scenario |
|--------|----------|
| `4242 4242 4242 4242` | ✅ Succeeds |
| `4000 0000 0000 9995` | ❌ Declined |
| `4000 0025 0000 3155` | 🔐 3D Secure |

Full list: https://stripe.com/docs/testing

---

## 🤖 AI Provider Setup

Default **Groq** (free tier, no card): https://console.groq.com/keys → `gsk_...` → `AI_PROVIDER=groq` + `GROQ_API_KEY`. Switch with `AI_PROVIDER=gemini` or `openai`. Code: `lib/ai/provider.ts`.

---

## 🪝 Webhooks in Localhost

```powershell
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook -e checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.paid
```
---

## 📁 Project Structure

```
app/(dashboard)/dashboard/   overview, generator, billing, settings
app/api/generate|health      AI generation, diagnostics
app/api/stripe/*             checkout, portal, webhook
lib/billing.ts               applySubscriptionPlan, grantPlanCredits
lib/stripe.ts                getStripe, priceId<->plan, finders
lib/plans.ts                 prices + quotas (single source of truth)
lib/site.ts                  brand, nav, tiers, FAQs
supabase/migrations/*.sql    schema, RLS, RPCs, triggers
middleware.ts                session refresh + route guard
```

---

## 🪙 How Credits Work

1. **Signup** → `profiles` (`plan='free'`) + 100 credits.
2. **Generation** → `consume_credits()` atomically; `402` if broke.
3. **Failure** → `fail_generation()` + refund `refund:<id>` (net zero).
4. **Subscription** → `grant_credits(quota, reference)` exactly-once.

---

## 🔌 API Reference

| Method | Route | Auth | Codes |
|--------|-------|------|-------|
| `GET` | `/api/health` | none | `200` |
| `POST` | `/api/generate` | session | `200`, `401`, `402`, `422`, `429`, `502` |
| `POST` | `/api/stripe/checkout` | session | `200`, `401`, `422`, `502` |
| `POST` | `/api/stripe/portal` | session | `200`, `401`, `422`, `502` |
| `POST` | `/api/stripe/webhook` | Stripe sig | `200`, `400`, `500` |

---

## 🎨 Customising

| Change | Where |
|--------|-------|
| Brand, nav, footer | `lib/site.ts` |
| Colours, fonts | `app/globals.css` + `tailwind.config.ts` |
| Landing sections | `components/landing/*` |
| Plans, quotas | `lib/plans.ts` |
| Model, prompt | `lib/ai/provider.ts` |

---

## ☁️ Deployment

1. Push to GitHub → **Vercel → Import**.
2. Add vars from `.env.example` (`NEXT_PUBLIC_SITE_URL` = prod).
3. Supabase → add `https://your-domain.com/auth/callback`.
4. Stripe → webhook `https://your-domain.com/api/stripe/webhook` → `whsec_...`.
5. Deploy.

---

## 🧰 Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm start        # serve production build
npm run lint     # eslint
```

---

## 👨‍💻 Author — Escobar NET

Crafted with ❤️ by **Escobar NET** — indie studio shipping AI SaaS, boilerplates and automation.

- 🌐 Website: https://escobarnet.com
- 💼 GitHub: https://github.com
- ✉️ Contact: hello@escobarnet.com

> If this boilerplate saved you a weekend, leave a ⭐ — it keeps us building.

---

## 📄 License

MIT — use it, ship it, sell it. © Escobar NET.


| Event | Effect |
|-------|--------|
| `checkout.session.completed` | plan → starter/pro + first credits |
| `subscription.created/updated` | re-sync plan from price id |
| `subscription.deleted` | reconcile → `free` if no active sub |
| `invoice.paid` / `payment_succeeded` | self-heal plan + renewal credits |


1. Create a free project at https://supabase.com/dashboard.
2. **SQL Editor → New query** → run every file in `supabase/migrations/*.sql` in order (tables `profiles`, `generations`, `credit_transactions`, RPCs `consume_credits`, `grant_credits`, `fail_generation`, RLS policies, triggers for auto-profile + free credits on signup).
3. **Authentication → Providers:** enable Email + GitHub (callback `https://your-project-ref.supabase.co/auth/v1/callback`).
4. **Authentication → URL Configuration:** add `http://localhost:3000/auth/callback` (plus prod domain later).
5. **Settings → API:** copy URL, `anon public`, `service_role secret` into `.env.local`.
6. Verify: `Table Editor → profiles` gains a row per signup (`plan='free'`, `credits=100`).

---

## 💠 Stripe Setup

1. https://dashboard.stripe.com/test/apikeys → copy **Secret key** (`sk_test_...`).
2. **Product catalog → Products:** create **Starter $19/mo** and **Pro $49/mo** recurring → copy each **Price ID** (`price_...`).
3. **Developers → Webhooks → Add endpoint (test mode):** URL `https://your-domain.com/api/stripe/webhook`, events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded` → copy `whsec_...`.
4. Paste the 4 values into `.env.local` and restart dev.
5. Checkout sets `subscription_data.metadata = { user_id, plan }` so the webhook always resolves the buyer.

