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
      {/* Header */}
      <header className="space-y-3 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
        <h1 className="text-2xl font-semibold">Help &amp; User Guide</h1>
        <p className="max-w-3xl text-sm text-slate-700">
          TempTake replaces paper food safety records with a simple, auditable
          digital system. This guide explains how each section works, how staff
          should use it day-to-day, and how it supports inspections under
          Safer Food, Better Business.
        </p>

        <nav className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            ["dashboard", "Dashboard"],
            ["routines", "Routines"],
            ["allergens", "Allergens"],
            ["cleaning", "Cleaning"],
            ["team", "Team"],
            ["locations", "Locations"],
            ["suppliers", "Suppliers"],
            ["reports", "Reports"],
            ["billing", "Billing"],
            ["settings", "Settings"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 shadow-sm hover:bg-slate-50"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <HelpSection
        id="dashboard"
        title="Dashboard"
        icon="📊"
        intro="The dashboard gives managers and staff a live snapshot of food safety control."
        bullets={[
          "Shows whether temperatures and cleaning tasks have been completed today.",
          "Highlights failed temperature checks so corrective action can be taken immediately.",
          "Training and allergen review indicators warn you before things expire.",
          "Designed to answer one question fast: are we compliant right now?",
        ]}
        imageSrc="/help/dashboard.jpg"
      />

      <HelpSection
        id="routines"
        title="Routines"
        icon="⏱️"
        intro="Routines standardise temperature checks so staff can log quickly without thinking."
        bullets={[
          "Create routines for fridges, freezers, cooking, deliveries, and hot holding.",
          "Each routine defines the item, location, and legal temperature range.",
          "Staff run a routine, enter temperatures, add initials, and save in one action.",
          "This reduces missed checks and keeps logs consistent across shifts.",
        ]}
        imageSrc="/help/routines.jpg"
      />

      <HelpSection
        id="allergens"
        title="Allergens"
        icon="⚠️"
        intro="Your digital allergen matrix replaces printed sheets and folders."
        bullets={[
          "Record allergen content for every menu item in one central place.",
          "Use the safe-foods query to answer customer allergy questions quickly.",
          "Regular reviews are tracked so you can prove allergens are kept up to date.",
          "Printable views are suitable for front-of-house and EHO inspections.",
        ]}
        imageSrc="/help/allergens.jpg"
      />

      <HelpSection
        id="cleaning"
        title="Cleaning rota"
        icon="🧽"
        intro="The cleaning rota ensures tasks are done, signed off, and never back-filled."
        bullets={[
          "Tasks can be daily, weekly, or monthly depending on risk.",
          "Staff complete tasks on their phone with initials recorded automatically.",
          "Managers can see incomplete tasks instantly on the dashboard.",
          "Creates a permanent audit trail replacing wall charts and clipboards.",
        ]}
        imageSrc="/help/cleaning.jpg"
      />

      <HelpSection
        id="team"
        title="Team"
        icon="👥"
        intro="Team records link people to actions, training, and accountability."
        bullets={[
          "Each team member has initials used across temperature and cleaning records.",
          "Training history is stored per person, including expiry dates.",
          "Expiring or overdue training is flagged automatically.",
          "This satisfies SFBB training evidence requirements.",
        ]}
        imageSrc="/help/team.jpg"
      />

      <HelpSection
        id="locations"
        title="Locations"
        icon="📍"
        intro="Locations represent physical sites or kitchens."
        bullets={[
          "Single-site businesses use one location by default.",
          "Multi-site operators can separate logs per venue.",
          "Location selection ensures records are attributed correctly.",
          "Subscription limits control how many locations can be added.",
        ]}
      />

      <HelpSection
        id="suppliers"
        title="Suppliers"
        icon="🚚"
        intro="Supplier records support traceability and due diligence."
        bullets={[
          "Store contact details and product categories per supplier.",
          "Useful during delivery issues, recalls, or EHO questioning.",
          "Keeps supplier information consistent across management staff.",
        ]}
      />

      <HelpSection
        id="reports"
        title="Reports"
        icon="📑"
        intro="Reports turn daily logs into inspection-ready evidence."
        bullets={[
          "Instant audit compiles recent temperature, cleaning, and training records.",
          "Filters allow you to answer specific inspection questions quickly.",
          "Reports can be printed or exported for EHOs and internal audits.",
          "Designed to align with SFBB record-keeping expectations.",
        ]}
        imageSrc="/help/reports.jpg"
      />

      <HelpSection
        id="billing"
        title="Billing & subscription"
        icon="💳"
        intro="Subscription controls features and location limits."
        bullets={[
          "Plans are managed securely via Stripe.",
          "Upgrading unlocks additional locations immediately.",
          "Invoices and payment methods are handled in the billing portal.",
        ]}
        imageSrc="/help/billing.jpg"
      />

      <HelpSection
        id="settings"
        title="Settings"
        icon="⚙️"
        intro="Organisation-wide configuration options."
        bullets={[
          "Set your company name as it appears across the app.",
          "Default location speeds up daily logging.",
          "Additional configuration options will expand over time.",
        ]}
      />

      <footer className="border-t pt-4 text-xs text-slate-500">
        Need help beyond this guide?{" "}
        <Link href="mailto:info@temptake.com" className="underline">
          Contact support
        </Link>{" "}
        or speak to your manager.
      </footer>
    </div>
  );
}
