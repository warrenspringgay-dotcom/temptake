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
            ["suppliers", "Suppliers"],
            ["reports", "Reports"],
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
          "Log new food temperatures straight from the dashboard.",
          "See entries today, last 7 days and any failures so you can act quickly.",
          "Review today’s cleaning tasks and see how many are complete vs still open.",
          "Tap into individual entries if you need to check who logged what and when.",
        ]}
        imageSrc="/help/dashboard.jpg"
      />

      {/* Routines */}
      <HelpSection
        id="routines"
        title="Routines"
        icon="⏱️"
        intro="Create prefilled temperature routines so staff only need to enter temps and initials during service."
        bullets={[
          "Set location, item name and target range for each line in the routine.",
          "Load a routine with one tap, enter the temperatures and initials, then press “Save all”.",
          "Use different routines for cooking, fridges/freezers, deliveries, etc.",
          "Keeps logging consistent between team members and across shifts.",
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
          "View and edit allergen information for every menu item.",
          "Search by item name or category (Starter, Main, Side, Dessert, Drink).",
          "Use Allergen Query to show only safe foods for one or more allergens.",
          "Print a clean allergen matrix for front-of-house or EHO visits.",
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
          "Create tasks grouped by shift or area, e.g. Opening checks, Mid shift, Closing down.",
          "Set frequencies to daily, weekly or monthly so the rota stays up to date automatically.",
          "Staff tap Complete in the app so you know exactly who did what and when.",
          "Print a paper version if you want something on the wall while still keeping a digital record.",
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
          "Initials appear in temperature logs and cleaning tasks for quick sign-off.",
          "Track food hygiene training expiry dates and spot who is due for renewal.",
          "Useful evidence for inspections and internal audits.",
        ]}
        imageSrc="/help/team.jpg"
      />

      {/* Suppliers */}
      <HelpSection
        id="suppliers"
        title="Suppliers"
        icon="🚚"
        intro="Keep supplier contact details and product notes in one place."
        bullets={[
          "Record what each supplier provides and their contact details.",
          "Store rep names and any special ordering notes (cut-off times, minimum order, etc.).",
          "Helpful when logging delivery issues or chasing up credit notes.",
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
          "Use custom filters to focus on certain dates, locations, items or staff initials.",
          "Export or print reports and keep them alongside your Food Safety Management System.",
        ]}
        imageSrc="/help/reports.jpg"
      />

      {/* Settings */}
      <HelpSection
        id="settings"
        title="Settings"
        icon="⚙️"
        intro="Control business-level options for your site."
        bullets={[
          "Set your company name – this shows in the top bar so staff know which site they’re in.",
          "Choose a preferred default location to speed up temperature entry.",
          "Future options may include date format, locale and other appearance settings.",
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
