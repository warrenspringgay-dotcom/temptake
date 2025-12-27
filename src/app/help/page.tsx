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

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-900">
      {/* Page header */}
      <header className="space-y-3 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            Help &amp; Quick Guide
          </h1>
          <p className="max-w-2xl text-sm text-slate-700">
            TempTake keeps your daily food safety paperwork in one simple app.
            This page explains what each section does and how to use it in a
            busy kitchen.
          </p>
        </div>

        <nav className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            ["dashboard", "Dashboard"],
            ["routines", "Routines"],
            ["allergens", "Allergens"],
            ["cleaning", "Cleaning rota"],
            ["team", "Team"],
            ["locations", "Locations"],
            ["suppliers", "Suppliers"],
            ["reports", "Reports"],
            ["billing", "Billing & subscription"],
            ["settings", "Settings"],
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

      {/* Dashboard */}
      <HelpSection
        id="dashboard"
        title="Dashboard"
        icon="📊"
        intro="Your daily control panel for temperature logging, cleaning progress and quick checks."
        bullets={[
          "See entries today, failures in the last 7 days and whether you’re ‘in control’ at a glance.",
          "Use the quick actions to log new food temperatures or jump straight into the cleaning rota.",
          "KPI tiles show allergen review and staff training status so you know what’s coming up.",
          "Tap into sections to drill down into logs, who did what, and when it was completed.",
        ]}
        imageSrc="/help/dashboard.jpg"
      />

      {/* Routines */}
      <HelpSection
        id="routines"
        title="Routines"
        icon="⏱️"
        intro="Create pre-filled temperature routines so staff only need to enter temps and initials during service."
        bullets={[
          "Set location, item name and target range for each line in a routine (e.g. ‘Walk-in fridge – ready-to-eat’).",
          "Load a routine with one tap, enter the temperatures and initials, then save everything in one go.",
          "Use different routines for cooking, fridges/freezers, deliveries and hot hold so nothing is missed.",
          "Keeps logging consistent between team members and across shifts, and speeds up busy services.",
        ]}
        imageSrc="/help/routines.jpg"
      />

      {/* Allergens */}
      <HelpSection
        id="allergens"
        title="Allergens"
        icon="⚠️"
        intro="Keep a live allergen matrix for your menu and quickly answer guest allergy questions."
        bullets={[
          "View and edit allergen information for every menu item in one place.",
          "Search by item name or category (Starter, Main, Side, Dessert, Drink) to find things quickly.",
          "Use the allergen filter / query view to show only suitable dishes for one or more allergens.",
          "Print a clean allergen matrix for front-of-house or Environmental Health Officer (EHO) visits.",
        ]}
        imageSrc="/help/allergens.jpg"
      />

      {/* Cleaning rota */}
      <HelpSection
        id="cleaning"
        title="Cleaning rota"
        icon="🧽"
        intro="Plan and record daily, weekly and monthly cleaning tasks."
        bullets={[
          "Create tasks grouped by area or shift, e.g. Opening checks, Mid-shift, Closing down, Front of house.",
          "Set frequencies to daily, weekly or monthly so tasks automatically appear when they’re due.",
          "On phones, staff can swipe / tap to complete tasks – TempTake records who did it and when.",
          "You can still print a paper view for the wall while keeping a full digital history for audits.",
        ]}
        imageSrc="/help/cleaning.jpg"
      />

      {/* Team */}
      <HelpSection
        id="team"
        title="Team"
        icon="👥"
        intro="Store team details, initials and training information."
        bullets={[
          "Add team members with their name, initials, role and contact details.",
          "Initials appear in temperature logs and cleaning tasks so you always know who signed things off.",
          "Track food hygiene training expiry dates and see who is due for renewal at a glance.",
          "Useful evidence for inspections and internal audits – everything is in one place.",
        ]}
        imageSrc="/help/team.jpg"
      />

      {/* Locations */}
      <HelpSection
        id="locations"
        title="Locations"
        icon="📍"
        intro="Manage which physical sites are linked to your TempTake account."
        bullets={[
          "Each location represents a real kitchen, site or venue using TempTake.",
          "You can rename locations so staff clearly see which site they’re logging for in the top bar.",
          "If you’re on a single-site plan, the Add location button will be greyed out until you upgrade your subscription.",
          "Multi-site groups can add extra locations once the Stripe plan has been moved to the correct band.",
        ]}
        imageSrc="/help/locations.jpg"
      />

      {/* Suppliers */}
      <HelpSection
        id="suppliers"
        title="Suppliers"
        icon="🚚"
        intro="Keep supplier contact details and product notes in one place."
        bullets={[
          "Record what each supplier provides and their main contact details.",
          "Store rep names and any special ordering notes (cut-off times, minimum order, delivery days, etc.).",
          "Helpful when logging delivery issues, chasing credit notes or managing recalls.",
        ]}
      />

      {/* Reports */}
      <HelpSection
        id="reports"
        title="Reports"
        icon="📑"
        intro="Quickly pull together the data you need for audits and checks."
        bullets={[
          "Run an Instant audit to compile around 90 days of recent logs into one report.",
          "Filter by date range, location, equipment or staff initials to answer specific questions.",
          "Export or print reports and keep them alongside your Food Safety Management System (Safer Food, Better Business, HACCP, etc.).",
        ]}
        imageSrc="/help/reports.jpg"
      />

      {/* Billing & subscription */}
      <HelpSection
        id="billing"
        title="Billing & subscription"
        icon="💳"
        intro="Manage your TempTake subscription and pricing band."
        bullets={[
          "See your current subscription status (trial, active, past due) and how many locations your band covers.",
          "Start a new subscription or change band via the Stripe checkout – all payments are handled securely by Stripe.",
          "If you need more locations, upgrade your band in Stripe first; once that’s active, the Add location button will unlock.",
          "Use the Stripe billing portal to update card details, download invoices or cancel your plan.",
        ]}
        imageSrc="/help/billing.jpg"
      />

      {/* Settings */}
      <HelpSection
        id="settings"
        title="Settings"
        icon="⚙️"
        intro="Control core options for your organisation."
        bullets={[
          "Set your company name – this shows in the top bar so staff always know which site/organisation they’re in.",
          "Choose a preferred default location to speed up temperature entry for most users.",
          "Future options may include date format, locale and appearance settings as the product grows.",
        ]}
      />

      {/* Small footer note */}
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