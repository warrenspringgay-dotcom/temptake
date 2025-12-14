// src/app/help/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TempTake Help & Quick Guide | Temperature Logs, Cleaning Rota, Allergens",
  description:
    "Learn how to use TempTake for food temperature logs, cleaning rotas, allergen matrices, team training records, reports, and voice logging. Quick setup tips and troubleshooting.",
  alternates: {
    canonical: "/help",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "TempTake Help & Quick Guide",
    description:
      "How to use TempTake for temperature logging, cleaning rotas, allergen management, team training and audit-ready reports.",
    url: "/help",
    type: "article",
  },
};

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
            <span className="text-xl" aria-hidden="true">
              {icon}
            </span>
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
              alt={`${title} help screenshot`}
              fill
              className="object-cover"
              sizes="224px"
              priority={false}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function FAQ() {
  // Keep this aligned with the JSON-LD below.
  const faqs = [
    {
      q: "How do I log temperatures quickly in a busy kitchen?",
      a: "Use Quick Temp Log from the floating + button, or build a routine so staff only enter initials and temperatures. Routines reduce errors and keep logs consistent across shifts.",
    },
    {
      q: "How does voice temperature logging work?",
      a: "Tap the microphone button in the quick temp log, speak naturally (item + location + temperature + initials), then review the fields before saving. Voice entry is designed to speed up logging during service.",
    },
    {
      q: "Why is voice logging not working?",
      a: "Check microphone permissions in your browser/phone settings, make sure you’re using a supported browser, and confirm your device isn’t in a restricted mode. If you’re using the app as a home-screen install, allow mic access for that app instance.",
    },
    {
      q: "How do I prove cleaning tasks were completed for an audit?",
      a: "Complete tasks in the Cleaning rota. TempTake records who completed each task and the date. Use Reports to filter by date range and export evidence for inspections.",
    },
    {
      q: "Can I print an allergen matrix?",
      a: "Yes. Use the Allergens section to maintain the matrix and print it for front-of-house or inspection use.",
    },
  ];

  return (
    <section id="faq" className={CARD}>
      <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
      <p className="mt-1 text-sm text-slate-700">
        Common questions from kitchens trying to stay audit-ready without adding
        more paperwork.
      </p>

      <div className="mt-4 space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="rounded-2xl border border-slate-200 bg-white/80 p-3"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              {f.q}
            </summary>
            <p className="mt-2 text-sm text-slate-700">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function HelpPage() {
  // FAQ schema for rich results.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I log temperatures quickly in a busy kitchen?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use Quick Temp Log from the floating + button, or build a routine so staff only enter initials and temperatures. Routines reduce errors and keep logs consistent across shifts.",
        },
      },
      {
        "@type": "Question",
        name: "How does voice temperature logging work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tap the microphone button in the quick temp log, speak naturally (item + location + temperature + initials), then review the fields before saving. Voice entry is designed to speed up logging during service.",
        },
      },
      {
        "@type": "Question",
        name: "Why is voice logging not working?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Check microphone permissions in your browser/phone settings, make sure you’re using a supported browser, and confirm your device isn’t in a restricted mode. If you’re using the app as a home-screen install, allow mic access for that app instance.",
        },
      },
      {
        "@type": "Question",
        name: "How do I prove cleaning tasks were completed for an audit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Complete tasks in the Cleaning rota. TempTake records who completed each task and the date. Use Reports to filter by date range and export evidence for inspections.",
        },
      },
      {
        "@type": "Question",
        name: "Can I print an allergen matrix?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Use the Allergens section to maintain the matrix and print it for front-of-house or inspection use.",
        },
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-900">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Page header */}
      <header className="space-y-3 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            TempTake Help &amp; Quick Guide
          </h1>
          <p className="max-w-3xl text-sm text-slate-700">
            TempTake helps kitchens stay compliant with less admin:{" "}
            <strong>food temperature logs</strong>,{" "}
            <strong>cleaning rotas</strong>,{" "}
            <strong>allergen matrices</strong>, and{" "}
            <strong>team training records</strong> in one place. Use this guide
            to set up your account and train staff fast.
          </p>
          <p className="max-w-3xl text-xs text-slate-600">
            Looking for the fastest start? Add a{" "}
            <a className="underline" href="#locations">
              location
            </a>
            , build{" "}
            <a className="underline" href="#routines">
              routines
            </a>
            , then set your{" "}
            <a className="underline" href="#cleaning">
              cleaning rota
            </a>
            .
          </p>
        </div>

        <nav className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            ["voice", "Voice logging"],
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
            ["faq", "FAQ"],
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

      {/* Voice logging */}
      <HelpSection
        id="voice"
        title="Voice temperature logging"
        icon="🎙️"
        intro="Log temperatures hands-free during service. Speak the key info, review it, then save."
        bullets={[
          "Open Quick Temp Log (floating + button) and tap the microphone.",
          "Say the item + location + temperature + initials (natural speech is fine). Example: “Walk-in fridge ready-to-eat four degrees, AB.”",
          "Check the fields it filled in, then press Save. You stay in control, not the microphone.",
          "If it fails: allow microphone permissions, check the device isn’t muted/restricted, and try again on a supported browser.",
          "Tip: routines + voice together is the fastest flow. Routine sets item/location, voice captures temp/initials.",
        ]}
        imageSrc="/help/voice.jpg"
      />

      {/* Dashboard */}
      <HelpSection
        id="dashboard"
        title="Dashboard"
        icon="📊"
        intro="Your daily control panel for temperature logging, cleaning progress and quick checks."
        bullets={[
          "See entries today, failures in the last 7 days and whether you’re ‘in control’ at a glance.",
          "Use quick actions to log temperatures or jump into the cleaning rota.",
          "KPI tiles highlight allergen review and staff training status so you know what’s due.",
          "Tap into sections to drill down into logs, who did what, and when it was completed.",
        ]}
        imageSrc="/help/dashboard.jpg"
      />

      {/* Routines */}
      <HelpSection
        id="routines"
        title="Routines"
        icon="⏱️"
        intro="Create pre-filled temperature routines so staff only enter temperatures and initials."
        bullets={[
          "Set the location, item name and target range for each routine line.",
          "Load a routine with one tap, enter temperatures and initials, then save in one go.",
          "Use different routines for fridges/freezers, deliveries, cooking and hot hold.",
          "Routines make logs consistent and faster, especially with new staff.",
        ]}
        imageSrc="/help/routines.jpg"
      />

      {/* Allergens */}
      <HelpSection
        id="allergens"
        title="Allergens"
        icon="⚠️"
        intro="Maintain an allergen matrix and answer guest questions quickly."
        bullets={[
          "Store allergen information for every menu item in one place.",
          "Search by item name or category to find things quickly.",
          "Filter/query view helps you identify suitable dishes for specific allergens.",
          "Print a clean allergen matrix for FOH and inspections.",
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
          "Create tasks grouped by area or shift (opening, mid-shift, close-down).",
          "Set frequency so tasks appear automatically when they’re due.",
          "Staff can tap/swipe to complete tasks. TempTake records who did it and when.",
          "Use Reports for audit evidence when you need it, not when you want it.",
        ]}
        imageSrc="/help/cleaning.jpg"
      />

      {/* Team */}
      <HelpSection
        id="team"
        title="Team"
        icon="👥"
        intro="Store team details, initials and training records."
        bullets={[
          "Add team members with name, initials, role and contact details.",
          "Initials appear in temperature logs and cleaning tasks for accountability.",
          "Track training and expiry dates so you don’t get caught out at inspection time.",
          "Invite by email or add manually, depending on how your business operates.",
        ]}
        imageSrc="/help/team.jpg"
      />

      {/* Locations */}
      <HelpSection
        id="locations"
        title="Locations"
        icon="📍"
        intro="Manage the physical sites linked to your TempTake account."
        bullets={[
          "Each location represents a real kitchen, site or venue.",
          "Rename locations so staff always log to the correct place.",
          "Multi-site teams can add more locations depending on subscription band.",
        ]}
        imageSrc="/help/locations.jpg"
      />

      {/* Suppliers */}
      <HelpSection
        id="suppliers"
        title="Suppliers"
        icon="🚚"
        intro="Keep supplier contact details and ordering notes in one place."
        bullets={[
          "Store what each supplier provides and key contact details.",
          "Save ordering rules (cut-off times, delivery days, minimum order).",
          "Useful for delivery issues, product recalls, and chasing credits.",
        ]}
        imageSrc="/help/suppliers.jpg"
      />

      {/* Reports */}
      <HelpSection
        id="reports"
        title="Reports"
        icon="📑"
        intro="Pull together audit-ready evidence for inspections and internal checks."
        bullets={[
          "Run an Instant audit to compile recent logs into one report.",
          "Filter by date range, location, equipment or staff initials.",
          "Export/print reports and store alongside your food safety system (HACCP/SFBB).",
        ]}
        imageSrc="/help/reports.jpg"
      />

      {/* Billing & subscription */}
      <HelpSection
        id="billing"
        title="Billing & subscription"
        icon="💳"
        intro="Manage your subscription and location allowances."
        bullets={[
          "See your subscription status and how many locations your plan covers.",
          "Upgrade/downgrade via checkout. Download invoices via the billing portal.",
          "If you need more locations, upgrade your plan before adding sites.",
        ]}
        imageSrc="/help/billing.jpg"
      />

      {/* Settings */}
      <HelpSection
        id="settings"
        title="Settings"
        icon="⚙️"
        intro="Update your account details and password."
        bullets={[
          "Update your profile name and keep your password secure.",
          "Use strong passwords and avoid sharing logins across staff.",
        ]}
      />

      <FAQ />

      {/* Footer */}
      <footer className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Need help or want to report an issue?{" "}
        <Link href="mailto:info@temptake.com" className="underline">
          Contact support
        </Link>
        .
      </footer>
    </div>
  );
}
