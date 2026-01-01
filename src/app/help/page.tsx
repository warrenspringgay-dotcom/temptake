// src/app/help/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

const CARD =
  "rounded-3xl border border-slate-200 bg-white/80 shadow-xl p-4 md:p-5 backdrop-blur-sm";

type HelpSectionProps = {
  id: string;
  title: string;
  icon: string;
  intro: string;
  bullets: string[];
  imageSrc?: string;
};

function HelpSection({
  id,
  title,
  icon,
  intro,
  bullets,
  imageSrc,
}: HelpSectionProps) {
  return (
    <section id={id} className={CARD}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-1 space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="text-xl">{icon}</span>
            <span>{title}</span>
          </h2>
          <p className="text-sm text-slate-700">{intro}</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {imageSrc && (
          <div className="relative mt-2 h-32 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 md:mt-0 md:h-32 md:w-56">
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover"
              sizes="224px"
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** Small “step card” blocks without changing overall UI style */
function StepCard({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
      <div className="space-y-1">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <div className="text-sm text-slate-700">{subtitle}</div>
      </div>
      <ol className="mt-3 space-y-2 text-sm text-slate-700">
        {steps.map((s, idx) => (
          <li key={s} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-800">
              {idx + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MiniCallout({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
        {items.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-900">
      {/* Page header */}
      <header className="space-y-3 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            Help &amp; Full Setup Guide
          </h1>
          <p className="max-w-3xl text-sm text-slate-700">
            TempTake replaces paper food safety records with a simple, auditable
            digital system. If you set it up properly, day-to-day logging becomes
            fast and consistent, and inspections become boring (which is the dream).
          </p>
        </div>

        <nav className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            ["setup", "First-time setup"],
            ["day1", "Day 1 workflow"],
            ["dashboard", "Dashboard"],
            ["routines", "Routines"],
            ["allergens", "Allergens"],
            ["cleaning", "Cleaning rota"],
            ["team", "Team"],
            ["locations", "Locations"],
            ["suppliers", "Suppliers"],
            ["reports", "Reports"],
            ["billing", "Billing"],
            ["settings", "Settings"],
            ["troubleshooting", "Troubleshooting"],
            ["glossary", "Glossary"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-slate-800 shadow-sm hover:bg-slate-50"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* FIRST TIME SETUP */}
      <section id="setup" className="space-y-4">
        <StepCard
          title="First-time setup (do this once)"
          subtitle="This is the sequence that prevents 90% of issues later. Don’t skip it."
          steps={[
            "Create your account and sign in (use a manager/admin login, not a shared staff account).",
            "Set up your organisation name in Settings so the team sees the correct business name.",
            "Create (or confirm) your Location(s) so logs are always tied to a real site/kitchen.",
            "Add your Team members (name + initials). Initials are your digital ‘signature’.",
            "Build your Temperature Routines (fridges/freezers, cooking, hot holding, deliveries). This is what makes daily logging quick.",
            "Set up your Cleaning rota tasks (daily/weekly/monthly). Make them realistic, not fantasy.",
            "Create or import your Allergen matrix (menu items + allergens). Then set review interval and mark it reviewed.",
            "Run a test day: log a few temperatures, complete a few cleaning tasks, and generate a report to confirm everything shows up.",
          ]}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MiniCallout
            title="What ‘good setup’ looks like"
            items={[
              "Every routine matches a real check your team already does (or should be doing).",
              "Initials list matches real staff and doesn’t include random duplicates like ‘AA’, ‘A.A.’, ‘Aa’.",
              "Cleaning tasks are split by frequency (daily/weekly/monthly) so daily isn’t overloaded.",
              "Allergen matrix is complete enough that front-of-house can trust it.",
            ]}
          />
          <MiniCallout
            title="Avoid these predictable mistakes"
            items={[
              "Leaving routines empty and expecting staff to freestyle temperature targets (they won’t).",
              "Not adding the team first, then wondering why initials aren’t available everywhere.",
              "Creating 50 daily cleaning tasks and then acting shocked no one finishes them.",
              "Not reviewing allergens and having no proof you maintain the matrix.",
            ]}
          />
        </div>
      </section>

      {/* DAY 1 */}
      <section id="day1" className="space-y-4">
        <StepCard
          title="Day 1 workflow (what staff actually do)"
          subtitle="This is the standard operating rhythm. Print it mentally and enforce it."
          steps={[
            "Open TempTake at the start of shift and check the Dashboard: anything overdue, failed, or incomplete is now the priority.",
            "Log required temperature checks using Routines (fridges/freezers first, then service checks during the day).",
            "If a temperature fails, take corrective action immediately and re-check (don’t ‘fix it later’).",
            "Complete Cleaning tasks as you go. Don’t batch them at the end unless you enjoy chaos.",
            "Before close: check Dashboard again to confirm today’s cleaning and temperature records are complete.",
            "Managers: once per week, review training expiry + allergen review status and update anything due.",
          ]}
        />

        <MiniCallout
          title="If you want compliance to stick"
          items={[
            "Make it part of the shift handover: ‘temps + cleaning done?’ is a normal question now.",
            "Don’t let staff share initials. That kills accountability and audit value.",
            "Use routines so entries are consistent (same wording, same targets, fewer mistakes).",
          ]}
        />
      </section>

      {/* Dashboard */}
      <HelpSection
        id="dashboard"
        title="Dashboard"
        icon="📊"
        intro="Your daily control panel. If something’s wrong, it should show here first."
        bullets={[
          "Use the dashboard as a shift-start and shift-end checklist: are temps logged and cleaning done?",
          "Watch failures: a failed temp is a risk signal and should trigger corrective action and re-check.",
          "KPI tiles highlight due/overdue items (training and allergen reviews) so nothing quietly expires.",
          "Managers should treat this as the ‘single source of truth’ for daily compliance status.",
          "Operational tip: if the dashboard is green, you’re defensible in an inspection. If it’s red, you’re gambling.",
        ]}
        imageSrc="/help/dashboard.jpg"
      />

      {/* Routines */}
      <HelpSection
        id="routines"
        title="Routines"
        icon="⏱️"
        intro="Routines make temperature logging fast and consistent, which is the whole point."
        bullets={[
          "Build routines for each real-world process: fridges/freezers, deliveries, cooking core temps, hot holding, cooling, etc.",
          "Each routine line should include a clear location and item name (e.g. ‘Walk-in fridge – Ready-to-eat shelf’).",
          "Targets should match your policy/SFBB controls (e.g. chilled storage, hot holding, cooking limits).",
          "When staff use a routine, they’re basically completing a pre-defined checklist. Less thinking, fewer errors.",
          "Manager best practice: review routines quarterly or when equipment/menu changes.",
          "If you have multiple sites, keep routine naming consistent across sites (standardisation = easier reporting).",
        ]}
        imageSrc="/help/routines.jpg"
      />

      {/* Allergens */}
      <HelpSection
        id="allergens"
        title="Allergens"
        icon="⚠️"
        intro="Your allergen matrix is only useful if it’s accurate and reviewed."
        bullets={[
          "Record allergen content for each menu item (starter/main/side/dessert/drink) so staff can find it quickly.",
          "Use consistent naming (e.g. don’t have ‘Chips’ and ‘Fries’ unless they are actually different products).",
          "Use the safe-food query to find items that do NOT include selected allergens (helpful for customer questions).",
          "Set a review interval that matches your reality (monthly is common; adjust if menu changes frequently).",
          "When you mark reviewed, you create a dated audit trail showing maintenance of allergen controls.",
          "Practical: print the matrix for FOH if you want belt-and-braces, but treat the app as your live master copy.",
        ]}
        imageSrc="/help/allergens.jpg"
      />

      {/* Cleaning rota */}
      <HelpSection
        id="cleaning"
        title="Cleaning rota"
        icon="🧽"
        intro="Cleaning records need to be real, timely, and attributable. That’s what this rota enforces."
        bullets={[
          "Create tasks grouped by category or shift (Opening, Mid-shift, Close, FOH, Weekly, Monthly).",
          "Set frequency correctly: daily tasks should be the minimum required; weekly/monthly catch deeper cleans.",
          "Staff should complete tasks as they’re done (not end-of-day mass ticking). The timestamp matters.",
          "Each completion should have initials so you can prove who did what (accountability and training gaps).",
          "Manager routine: check weekly/monthly tasks don’t silently drift incomplete (they always do without oversight).",
          "If tasks aren’t being completed, the fix is usually: reduce volume, improve clarity, and enforce standards. Not more nagging.",
        ]}
        imageSrc="/help/cleaning.jpg"
      />

      {/* Team */}
      <HelpSection
        id="team"
        title="Team"
        icon="👥"
        intro="The Team area is where accountability and training records live."
        bullets={[
          "Add every staff member who will log temps or complete cleaning tasks. No ghost users.",
          "Initials are the ‘signature’ used across the app. Keep them unique and consistent.",
          "Use training records to track food hygiene certifications and expiry dates.",
          "If you have frequent staff changes, update this monthly so your initials list stays clean.",
          "Manager use-case: training due soon = schedule refresh training before you’re non-compliant.",
          "Inspection reality: being able to show training status per staff member is a big credibility win.",
        ]}
        imageSrc="/help/team.jpg"
      />

      {/* Locations */}
      <HelpSection
        id="locations"
        title="Locations"
        icon="📍"
        intro="Locations represent your physical site(s). They keep records separated and correctly attributed."
        bullets={[
          "Single-site: keep one clear location name (e.g. ‘Main Kitchen’).",
          "Multi-site: create a location per venue so reports don’t blend unrelated operations.",
          "If staff can’t tell which site they’re logging for, your data becomes messy fast.",
          "Location limits are controlled by your subscription band (upgrade to add more).",
          "Best practice: standardise naming conventions across sites (e.g. ‘Site A’, ‘Site B’).",
        ]}
        imageSrc="/help/locations.jpg"
      />

      {/* Suppliers */}
      <HelpSection
        id="suppliers"
        title="Suppliers"
        icon="🚚"
        intro="Supplier records support traceability and due diligence when something goes wrong."
        bullets={[
          "Record supplier name, contact, phone, email and product categories supplied.",
          "Use notes for ordering quirks (cut-off times, minimum order, delivery days).",
          "Helpful for delivery disputes, credit notes, and recalls (and yes, those do happen).",
          "If an EHO asks about sourcing, being able to pull supplier details quickly looks organised.",
        ]}
        imageSrc="/help/suppliers.jpg"
      />

      {/* Reports */}
      <HelpSection
        id="reports"
        title="Reports"
        icon="📑"
        intro="Reports turn day-to-day logging into inspection-ready evidence."
        bullets={[
          "Use reports to compile temperature logs, cleaning records, and training evidence for a chosen period.",
          "Instant audit gives a ready-made pack for managers and inspections (useful before an EHO visit).",
          "Filters let you answer targeted questions: specific date range, location, equipment, or staff initials.",
          "Operational: generate a report weekly and spot patterns (repeat failures, missed checks, weak shifts).",
          "If you’re doing everything right but can’t prove it, it doesn’t count. Reports are the proof.",
        ]}
        imageSrc="/help/reports.jpg"
      />

      {/* Billing */}
      <HelpSection
        id="billing"
        title="Billing & subscription"
        icon="💳"
        intro="Stripe handles payments. TempTake controls access based on your subscription status."
        bullets={[
          "Check your plan status (trial, active, past due) in the billing area.",
          "Upgrade your band to unlock additional locations where applicable.",
          "Use Stripe billing portal to update payment method and download invoices.",
          "If billing is past due, some features may be limited. Fix it early, not on payroll day.",
        ]}
        imageSrc="/help/billing.jpg"
      />

      {/* Settings */}
      <HelpSection
        id="settings"
        title="Settings"
        icon="⚙️"
        intro="Organisation-level configuration. Set it once, then only touch when something changes."
        bullets={[
          "Set your company/organisation name so staff know they’re in the correct account.",
          "Choose default location to speed up logging and reduce wrong-location entries.",
          "As the product grows, more settings will land here (formatting, audit controls, and workflow defaults).",
        ]}
        imageSrc="/help/settings.jpg"
      />

      {/* TROUBLESHOOTING */}
      <HelpSection
        id="troubleshooting"
        title="Troubleshooting"
        icon="🛠️"
        intro="The boring but necessary part. Here’s what usually goes wrong and how to fix it."
        bullets={[
          "Initials missing in dropdowns: confirm the staff member is added in Team and has initials set.",
          "Too many duplicate initials: standardise initials (uppercase, no dots) and remove duplicates from Team.",
          "Routines not being used: routines are only useful if they match real checks. Update routine items to match actual equipment and process.",
          "Cleaning not getting completed: reduce daily volume, improve task clarity (what/where/how), and assign responsibility by shift.",
          "Allergen matrix doesn’t feel trusted: enforce a review cadence and make one person accountable for updates when menu changes.",
          "Reports missing data: confirm you’re filtering the correct date range and location, and that entries are being saved under the right site.",
        ]}
      />

      {/* GLOSSARY */}
      <HelpSection
        id="glossary"
        title="Glossary"
        icon="📚"
        intro="Quick definitions so staff don’t interpret things creatively."
        bullets={[
          "Initials: the staff member’s signature used to attribute actions (temps, cleaning, sign-offs).",
          "Routine: a pre-built checklist of temperature checks (items + targets) that staff run quickly.",
          "Target range: acceptable temperature range for a check (used to determine pass/fail).",
          "Pass/Fail: whether a logged temperature meets the target range (fail should trigger corrective action).",
          "Review interval: how often allergen information should be confirmed and marked reviewed.",
          "Audit trail: dated evidence of what was done, when, and by whom (what EHOs care about).",
        ]}
      />

      {/* Footer */}
      <footer className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Need more help or want to suggest a new feature?{" "}
        <Link href="mailto:info@temptake.com" className="underline">
          Contact support
        </Link>{" "}
        or speak to your manager.
      </footer>
    </div>
  );
}
