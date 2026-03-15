# TempTake – Architecture & App Schematic

This document is the single source of truth for how TempTake is structured. If a new chat starts, this file explains how the app works without needing tribal knowledge.

---

## 1. Core Domains

### Organisations
- Table: `organisations`
- Created during signup bootstrap
- Everything in the app is scoped to an org

### Locations
- Table: `locations`
- An org can have many locations
- A location can represent a shop, van, kitchen, or other operating unit
- Most operational data is location-scoped

### Profiles
- Table: `profiles`
- One row per auth user
- Stores app-level user data such as:
  - `id`
  - `full_name`
  - `email`
  - `org_id`
  - `role`
  - `active_location_id`
- Used for role gating, active location context, and user display data

### Team Members
- Table: `team_members`
- Operational staff records for audits, initials, training, QC, and sign-offs
- May or may not be linked to an auth user
- Separate from `profiles` because not every staff member needs login access

---

## 2. Authentication & Supabase Clients

### Auth Model
- Auth is handled through Supabase Auth
- Session state is shared across client and server
- The app uses separate helpers for browser, server, and admin access

### Browser Client
File:
- `src/lib/supabaseBrowser.ts`

Purpose:
- Client-side authenticated requests
- Used in interactive UI components and pages

### Server Client
File:
- `src/lib/supabaseServer.ts`

Purpose:
- Server Components / Route Handlers
- Reads auth cookies
- Exported helper name is **`getServerSupabase`**
- `getServerSupabaseAction` is kept as a backwards-compatible alias

### Admin Client
File:
- `src/lib/supabaseAdmin.ts`

Purpose:
- Service-role access for trusted server-side operations only
- Never exposed to the browser

### Legacy / Compatibility Browser Helper
File:
- `src/lib/supabaseClient.ts`

Purpose:
- Compatibility helper for files still importing a browser factory or singleton from this path

---

## 3. Signup & Bootstrap Flow

### Signup
1. User signs up via Supabase Auth
2. `/api/signup/bootstrap`
   - Creates org
   - Creates default location
   - Links user to org
   - Creates profile context
   - Creates **trial subscription row** in `billing_subscriptions`

### Login
- Auth via Supabase session cookies
- Org and location are resolved through client/server helpers
- Middleware and protected layouts enforce access rules after login

Files involved:
- `src/app/api/signup/bootstrap/route.ts`
- `src/lib/ensureOrg.ts`
- `src/lib/supabaseServer.ts`

---

## 4. Access Control & Roles

### Profile Roles
Current app roles include:
- `owner`
- `manager`
- `staff`

These roles are used to decide what areas of the app a user can access.

### Route Gating
Protected and management pages are gated by role and auth state.

Examples of management-only areas:
- `/team`
- `/suppliers`
- `/billing`
- `/settings`
- `/manager`

### Middleware
Middleware is responsible for:
- Redirecting unauthenticated users
- Protecting manager/admin-style routes
- Keeping public pages accessible
- Making login/logout state changes reflect properly in navigation

### Cross-Org / Elevated Access
Some internal or elevated access flows may bypass normal org-level visibility for support or super-admin style usage.
This must always be deliberate and never left to accidental client-side filtering.

Rule:
- Normal users only see records allowed by org membership and RLS
- Elevated access must be explicitly handled server-side or via trusted policies

---

## 5. Billing Model

### Subscriptions
- Table: `billing_subscriptions`
- One active billing row per org
- States:
  - `trialing`
  - `active`
  - `past_due`
  - `canceled`

Billing gates **features**, not login.

Client hook:
- `src/hooks/useSubscriptionStatus.ts`

Banner logic:
- `src/components/SubscriptionBanner.tsx`

---

## 6. Onboarding System

### Purpose
Guide new orgs through minimum viable compliance setup.

### Current onboarding checks
| Key | Requirement |
|----|------------|
| locations | At least one active location |
| routines | At least one temp routine |
| cleaning | Cleaning tasks exist for location |
| allergens | Allergen review exists |
| team | Team + training expiry set |

### Snoozing
- Step-level snooze stored per org
- Banner-level dismiss stored in `localStorage`

File:
- `src/components/OnboardingBanner.tsx`

---

## 7. Daily Operations

### Temperature Logs
Tables:
- `temp_logs`
- `temp_routines`

Used for:
- Routine temperature checks
- Quick temperature entries
- Daily operational compliance logging

### Routine Runs
Routine flows are used to guide staff through required checks for the day/location.

Important behaviour:
- Completion state should drive UI indicators
- Routine completion must be recognised separately from quick-temp-only usage

### Cleaning
Tables:
- `cleaning_tasks`
- `cleaning_task_runs`

Used for:
- Scheduled cleaning tasks
- Frequency-based rota completion
- Audit history

### Allergens
Tables:
- `allergen_items`
- `allergen_flags`
- `allergen_matrix`
- `allergen_review`

Used for:
- Allergen management
- Review tracking
- Kitchen/customer reference

### Training
Table:
- `trainings`

Used for:
- Staff training records
- Expiry tracking
- Compliance reminders

### Daily Sign-Offs / QC
Operational sign-off flows are used to capture confirmation that required daily work has been completed.
These should remain auditable and tied to org/location/user context.

---

## 8. Feedback System

### Purpose
Allow users to report issues, bugs, requests, and general feedback from inside the app.

### Feedback Table
Table:
- `feedback_items`

Columns include:
- `id`
- `org_id`
- `user_id`
- `location_id`
- `area`
- `kind`
- `message`
- `page_path`
- `meta`
- `created_at`

### Behaviour
- Feedback is written against the user’s org context
- Feedback can optionally be linked to a location and app area
- It is designed for lightweight issue reporting from inside the product

### Access Expectations
- Standard users should only see the feedback they are allowed to see
- Manager/admin/support-style views must not rely on accidental client-side filtering
- If cross-org visibility is needed, it must be backed by explicit policy/server logic

### UX Notes
- The feedback page should make sending feedback quick
- “Send feedback” actions should be obvious and accessible
- Modal positioning and mobile usability matter because this flow is often used in the middle of real work

---

## 9. Workstation / Operator Flow

### Purpose
Support shared-device use in hospitality environments.

### Behaviour
- App auth and workstation/operator state are related but not identical
- A workstation can be unlocked for operational use while management page access still depends on the logged-in user’s actual permissions
- PIN / operator flows should never silently grant broader management access

### Rule
There are two distinct states:
1. **Authenticated app user**
2. **Unlocked workstation / active operator**

These must stay aligned in the UI so staff are not told they are “unlocked” while still blocked from protected areas without explanation.

---

## 10. Reports & Documents

### Reports
Primary reporting lives in:
- `/reports`

Reports are intended to be:
- Print-friendly
- Audit-friendly
- Readable on mobile and desktop
- Suitable for external review

### Public Template / SEO Pages
The app also includes public-facing compliance resources and downloadable templates.
These pages support:
- Organic traffic
- Lead generation
- Useful free tools for operators

Rule:
- Public downloads must not route users into broken auth pages
- Public assets should remain publicly accessible when intended

---

## 11. Four-Weekly Review

### Purpose
Digital SFBB-style compliance review every ~28 days.

### Logic
- Server aggregates the last 4 weeks
- Counts repeat failures, misses, and review triggers
- Used to surface patterns rather than isolated single-day issues

Endpoint:
- `/four-week-review/summary`

UI:
- `src/app/four-week-review/page.tsx`

Banner shown only when:
- Org age is at least 28 days
- Issues exist or review is due

---

## 12. UI Structure

### Protected Layout
- `src/app/(protected)/layout.tsx`

### Core App Areas
- `/dashboard`
- `/routines`
- `/cleaning-rota`
- `/allergens`
- `/team`
- `/reports`

### Management / Admin Areas
- `/manager`
- feedback/admin management views
- settings/billing/team/suppliers style routes where permitted

### Reusable Components
Reusable components live in:
- `src/components/`

---

## 13. Design & Product Rules

- No silent automation
- Everything important must be auditable
- Dates shown as **DD/MM/YYYY**
- Mobile first
- Shared-device use must be considered in UX decisions
- No UI changes unless explicitly intended
- Access control must not rely on cosmetic client logic
- Public pages and private app flows must stay clearly separated
- Quick actions must remain genuinely quick for shop-floor use

---

## 14. Change Discipline

Whenever you:
- Add a table
- Change a flow
- Add a banner or gate
- Change access rules
- Add a public SEO/template page
- Change feedback/reporting behaviour

You **update this file**.

This keeps future sessions fast and prevents re-learning the system.