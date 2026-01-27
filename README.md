# TempTake – Application Architecture & System Map

_Last updated: Billing refactor, location gating, Stripe upgrade flows_

---

## 1. Overview

TempTake is a UK-focused food safety compliance platform designed to replace SFBB paperwork with a fast, auditable digital system.

Core goals:
- Inspection-ready records
- Minimal friction for staff
- Predictable, enforceable billing rules
- No auth-breaking “clever” caching
- UK GDPR / PECR compliant by default

---

## 2. Tech stack

- **Next.js (App Router, v16+)**
- **Supabase** (Auth, Database, RLS)
- **Stripe** (Subscriptions & Billing Portal)
- **PostHog (EU)** – consent gated
- **Vercel** (Hosting)
- **PWA** with safe service worker rules

---

## 3. Authentication

### Providers
- Email + password (Supabase)
- Google OAuth (Supabase)

### Routes
- `/login`
- `/signup`
- `/auth/callback`

### Flow
1. User signs in
2. Supabase issues session cookies
3. OAuth callbacks exchanged in `/auth/callback`
4. User redirected to `next` or `/dashboard`

Analytics is **never** fired from server routes.

---

## 4. Organisation bootstrap

On first successful login:
- Organisation created
- Default location created
- Trial subscription inserted
- User linked to organisation

Endpoints:
- `/api/org/ensure`
- `/api/signup/bootstrap`

Every authenticated user always has a valid org and billing context.

---

## 5. Routing & access control

### Public routes
- `/`
- `/pricing`
- `/guides`
- `/guides/*`
- `/demo-wall`
- `/login`
- `/signup`
- `/privacy`
- `/terms`
- `/cookies`

### Protected routes
All other app routes.

Enforced in:
- `middleware.ts`

---

## 6. Onboarding system

Component:
- `OnboardingBanner.tsx`

Features:
- Step-based progress
- Step snoozing
- Banner-level dismissal
- Auto-clears completed steps
- Client-side only

State stored in `localStorage`.

---

## 7. Analytics (PostHog)

### Provider
- `src/components/PosthogProvider.tsx`

### Rules
- Disabled by default
- No tracking before consent
- Explicit opt-in required
- EU PostHog host

### Consent storage
`localStorage: tt_consent_v1`
```json
{
  "analytics": true
}
```

### Events
- `$pageview`
- `user_logged_in`
- `user_signed_up`

---

## 8. Cookie & privacy compliance (UK)

Implemented:
- Explicit analytics consent
- No cookies before consent
- Privacy Policy
- Terms of Service
- Cookie Policy

Links shown on:
- Login
- Signup
- Help
- Footer

---

## 9. PWA & service worker

File:
- `/public/sw.js`

Rules:
- Network-first for navigation
- Cache-first for static assets
- Never cache auth or API routes

Cache versioning:
```js
const VERSION = "v7";
```

---

## 10. Billing & subscription architecture

### Core principle
**The server is the source of truth.**  
The client never infers plan limits.

### Stripe model
- Subscription-based billing
- Monthly & annual plans
- Location-count–based pricing
- Custom pricing for 6+ locations

### Tables
- `billing_subscriptions`
- `billing_customers`

### Billing lifecycle
- Trial → Active → Past Due → Cancelled
- Stripe customer created only when required
- Trial rows are auto-healed if missing

---

### Billing status API (authoritative)

Endpoint:
- `GET /api/billing/status`

Responsibilities:
- Authenticate user
- Resolve organisation
- Read latest subscription (admin, RLS-safe)
- Auto-create 14-day trial if missing
- Derive:
  - `priceId`
  - `planName` (UI only)
  - `maxLocations` (**authoritative gating value**)
  - `hasValid`, `active`, `onTrial`

Returned fields include:
- `priceId`
- `maxLocations`
- `planName`
- `trialEndsAt`
- `currentPeriodEnd`

No client-side plan parsing.

---

### Location gating

Locations are gated by **server-derived `maxLocations`**, not plan names.

Enforced in:
- `LocationsManager.tsx`
- `/api/stripe/upgrade-from-limit`

Behaviour:
- Users can add locations up to their plan limit
- Once at limit:
  - UI disables creation
  - Upgrade banner shown
  - Upgrade flow is deterministic

---

### Upgrade flow (single entry point)

Endpoint:
- `POST /api/stripe/upgrade-from-limit`

Logic:
- Determines desired location count
- Selects correct Stripe tier
- Routes user to:
  - Stripe Billing Portal (existing subscriptions)
  - Stripe Checkout (trial / new subscriptions)
  - Contact flow (custom / 6+ locations)

Return handled via `returnUrl`.

---

## 11. Design constraints (intentional)

- No offline auth
- No cached HTML
- No server-side analytics
- No silent consent
- No plan-name-based gating
- No shared staff accounts

These are deliberate decisions.
