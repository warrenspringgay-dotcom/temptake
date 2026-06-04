import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TempTake Redcar | Inspection-Ready Food Hygiene Records",
  description:
    "A local TempTake setup offer for Redcar food businesses. Replace paper temperature logs, cleaning records, allergen checks, training reminders and incident records with inspection-ready digital records.",
  alternates: {
    canonical: "/redcar",
  },
  openGraph: {
    title: "Are you ready for your next EHO inspection? | TempTake Redcar",
    description:
      "Free personal TempTake setup for selected Redcar food businesses. Sack the paperwork and keep food hygiene records inspection-ready.",
    url: "https://temptake.com/redcar",
    siteName: "TempTake",
    type: "website",
    images: [
      {
        url: "https://temptake.com/temptake-tablet-allergens.jpg",
        width: 1200,
        height: 1600,
        alt: "TempTake running on a tablet in a food business kitchen",
      },
    ],
  },
};

const CONTACT_EMAIL = "info@temptake.com";
const IMAGE_SRC = "/temptake-tablet-allergens.jpg";
const LOGO_SRC = "/icon.png";
const SIGNUP_HREF = "/signup?source=redcar&utm_source=leaflet&utm_medium=direct_mail&utm_campaign=redcar_setup_offer";

const setupMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Redcar TempTake setup offer"
)}&body=${encodeURIComponent(
  "Hi TempTake,\n\nI run a food business in/around Redcar and would like to discuss the Redcar setup offer.\n\nBusiness name:\nBest contact name:\nBest contact number:\n\nThanks"
)}`;

const inspectionPainPoints = [
  "One missed temperature log.",
  "One incomplete cleaning record.",
  "One training expiry nobody noticed.",
];

const features = [
  {
    title: "Temperature monitoring",
    text: "Record fridge, freezer, hot-holding and cooked-food temperatures in seconds.",
    icon: "🌡️",
  },
  {
    title: "Cleaning schedules",
    text: "See what is due, what is done and what has been missed before it becomes a problem.",
    icon: "🧼",
  },
  {
    title: "Allergen management",
    text: "Keep allergen information clear, reviewed and easier for staff to access.",
    icon: "🥜",
  },
  {
    title: "Incident tracking",
    text: "Log issues, corrective actions and follow-up records in one place.",
    icon: "⚠️",
  },
  {
    title: "Staff training",
    text: "Track training, expiry dates and review points without relying on memory.",
    icon: "🎓",
  },
  {
    title: "Remote compliance",
    text: "Monitor compliance across one or more locations without being in the kitchen.",
    icon: "☁️",
  },
];

const ehoRecords = [
  "Temperature logs",
  "Cleaning records",
  "Allergen reviews",
  "Training expiry dates",
  "Incident and corrective action logs",
  "Four-weekly compliance reviews",
];

const setupSteps = [
  "We set up your business location",
  "We add your checks, routines and cleaning tasks",
  "We help add allergen and training records",
  "We show you how to use it day-to-day",
];

const proofPoints = [
  "Replace paper logs with digital records",
  "See missed checks before inspection day",
  "Keep records consistent across staff",
  "Access key compliance records quickly",
];

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 ring-1 ring-orange-100">
        <img
          src={LOGO_SRC}
          alt="TempTake logo"
          className="h-8 w-8 object-contain"
        />
      </div>
      <div>
        <div
          className={
            compact
              ? "text-lg font-black tracking-tight text-slate-950"
              : "text-2xl font-black tracking-tight text-slate-950"
          }
        >
          TempTake
        </div>
        {!compact ? (
          <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            Food safety made simple
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-black text-white shadow-sm">
      ✓
    </span>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-black uppercase tracking-[0.2em] text-orange-600">
      {children}
    </div>
  );
}

export default function RedcarLandingPage() {
  return (
    <main className="min-h-screen bg-[#fffaf4] text-slate-950">
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.20),transparent_34%),linear-gradient(90deg,#ffffff_0%,#ffffff_44%,rgba(255,247,237,0.78)_100%)]" />

        <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <BrandLogo compact />
            <a
              href={setupMailto}
              className="hidden rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 sm:inline-flex"
            >
              Request setup
            </a>
          </div>
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:pb-20 lg:pt-8">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-extrabold text-orange-900 shadow-sm">
              <span className="text-lg">🍔🌡️</span>
              TempTake for Redcar food businesses
            </div>

            <h1 className="text-5xl font-black leading-[0.92] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Are you ready for your next{" "}
              <span className="text-orange-600">inspection?</span>
            </h1>

            <p className="mt-6 max-w-xl text-xl font-medium leading-8 text-slate-700">
              EHO inspections can happen any day. TempTake helps you keep clear,
              consistent and inspection-ready food hygiene records without piles of
              paper.
            </p>

            <div className="mt-6 space-y-3 text-lg font-bold text-slate-900">
              {inspectionPainPoints.map((point) => (
                <div key={point} className="flex items-center gap-3">
                  <CheckIcon />
                  {point}
                </div>
              ))}
              <div className="flex items-center gap-3">
                <CheckIcon />
                That is all it takes to create avoidable inspection stress.
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={setupMailto}
                className="inline-flex items-center justify-center rounded-2xl bg-orange-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-700"
              >
                Request free Redcar setup
              </a>
              <Link
                href={SIGNUP_HREF}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-black text-slate-950 shadow-sm transition hover:border-slate-950"
              >
                Start a TempTake account
              </Link>
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-500">
              No obligation. Selected Redcar businesses only while the local setup
              offer is running.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-orange-500/10 blur-2xl" />
            <div className="relative min-h-[440px] overflow-hidden rounded-[2rem] border border-orange-100 bg-slate-950 shadow-2xl shadow-slate-900/20 lg:min-h-[560px]">
              <img
                src={IMAGE_SRC}
                alt="TempTake app running on a tablet in a food business kitchen"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-5 pt-24">
                <div className="rounded-2xl border border-white/20 bg-slate-950/86 p-4 text-white shadow-xl backdrop-blur">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-orange-300">
                    Monitor compliance remotely
                  </div>
                  <div className="mt-1 text-sm font-medium text-white/86">
                    Check temperatures, cleaning, allergens, training and incidents
                    from anywhere.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.86fr] lg:px-10">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.2em] text-orange-400">
              Sack the paperwork
            </div>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              TempTake gives you complete control over food safety records.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Monitor, manage and prove compliance from one clean dashboard. When
              an Environmental Health Officer asks for records, you should not be
              hunting through loose sheets, stained folders or half-filled
              checklists.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-500/50 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <BrandLogo />
            <h3 className="mt-6 text-2xl font-black text-white">
              Built for real kitchens, not office theory.
            </h3>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Designed for chip shops, cafés, takeaways, restaurants, pubs,
              kiosks and small multi-site operators that need food safety records
              done properly without making the day harder.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <SectionKicker>What TempTake helps you control</SectionKicker>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              The records an inspector is likely to care about.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The point is not more admin. The point is being able to prove the
              basics are being done consistently.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf4] py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10">
          <div>
            <SectionKicker>Inspection-ready records</SectionKicker>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Stop hoping the folder is up to date.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              If an inspection happens tomorrow, you need to know where the key
              records are and whether the team has kept them updated. TempTake
              puts those records in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ehoRecords.map((record) => (
              <div
                key={record}
                className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-5 text-base font-black shadow-sm"
              >
                <CheckIcon />
                {record}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-orange-600 py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
          <div>
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-4xl">
              🤝
            </div>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
              A personal setup offer for selected Redcar businesses.
            </h2>
            <p className="mt-5 text-lg font-semibold leading-8 text-orange-50">
              We will personally help set up TempTake for your business and show
              your team how to use it. No obligation. Just better food safety
              records.
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-6 text-slate-950 shadow-2xl">
            <h3 className="text-2xl font-black">What the free setup includes</h3>
            <div className="mt-6 grid gap-4">
              {setupSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl bg-orange-50 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div className="text-base font-bold text-slate-900">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <SectionKicker>Why change from paper?</SectionKicker>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Paper logs fail quietly until someone asks to see them.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              TempTake is not about adding admin. It is about making sure the daily
              records are done, visible and ready when they matter.
            </p>
          </div>

          <div className="grid gap-3">
            {proofPoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-[#fffaf4] p-5 text-lg font-black shadow-sm"
              >
                <CheckIcon />
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white">
        <div className="mx-auto max-w-5xl px-5 text-center sm:px-8 lg:px-10">
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <div className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-orange-400">
            Redcar local pilot
          </div>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            Let&apos;s get your business inspection-ready.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Email TempTake to request your free local setup. We will arrange a
            quick call, confirm whether the app is a good fit, then help configure
            it for your kitchen.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={setupMailto}
              className="inline-flex items-center justify-center rounded-2xl bg-orange-600 px-7 py-4 text-base font-black text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-700"
            >
              Email info@temptake.com
            </a>
            <Link
              href={SIGNUP_HREF}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white px-7 py-4 text-base font-black text-slate-950 transition hover:bg-orange-50"
            >
              Create account
            </Link>
          </div>

          <div className="mt-8 text-sm font-semibold text-slate-400">
            TempTake · info@temptake.com · temptake.com/redcar
          </div>
        </div>
      </section>
    </main>
  );
}
