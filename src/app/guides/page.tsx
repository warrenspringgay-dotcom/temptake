import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";

export const metadata: Metadata = {
  title: "Guides · TempTake",
  description:
    "Practical guides for food safety logging, kitchen compliance, cleaning rotas, allergens, and staff training. Built for busy kitchens using TempTake.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Guides · TempTake",
    description:
      "Practical guides for food safety logging, kitchen compliance, cleaning rotas, allergens, and staff training.",
    url: "/guides",
    type: "website",
  },
};

const CARD =
  "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur hover:bg-white transition";

type Guide = {
  title: string;
  description: string;
  href: string;
  readTime?: string;
  tag?: string;
};

const GUIDES: Guide[] = [
  {
    title: "Food hygiene temperature logs (UK): what to record and how often",
    description:
      "A practical UK-focused guide to daily temperature checks, what to write down, and what inspectors typically expect.",
    href: "/guides/food-hygiene-temperature-logs-uk",
    readTime: "6 min",
    tag: "Food safety",
  },
  {
    title: "Kitchen cleaning rota (UK): what it must include and how to keep it compliant",
    description:
      "What a compliant kitchen cleaning rota looks like in the UK, how often tasks should be done, and how to record them properly.",
    href: "/guides/kitchen-cleaning-rota-uk",
    readTime: "7 min",
    tag: "Cleaning",
  },
  {
    title: "Allergen matrix (UK): how often to review it and what inspectors expect",
    description:
      "How allergen matrices should be reviewed, what EHOs look for, and how to prove you’re in control.",
    href: "/guides/allergen-matrix-uk",
    readTime: "5 min",
    tag: "Allergens",
  },
  {
    title: "Food hygiene training expiry (UK): who needs what level and when",
    description:
      "Understand UK food hygiene training expectations, renewal timelines, and how to track staff training properly.",
    href: "/guides/food-hygiene-training-expiry-uk",
    readTime: "5 min",
    tag: "Training",
  },
  {
    title: "Safer Food Better Business logs: what you must keep vs what’s optional",
    description:
      "Avoid unnecessary paperwork by understanding which SFBB records inspectors actually expect to see.",
    href: "/guides/safer-food-better-business-logs",
    readTime: "6 min",
    tag: "Compliance",
  },
];

export default function GuidesIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
      {/* PostHog tracking (client component) */}
      <GuidesAnalytics slug="index" />

      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold leading-tight">Guides</h1>
        <p className="max-w-2xl text-sm text-slate-700">
          Short, practical guides for running a compliant kitchen without
          drowning in paperwork. Written for the UK and mapped to how TempTake
          actually works day to day.
        </p>
      </header>

      {/* Quick filters (static for now) */}
      <section className="mt-6 flex flex-wrap gap-2 text-xs">
        {["All", "Food safety", "Cleaning", "Allergens", "Training", "Compliance"].map(
          (label) => (
            <span
              key={label}
              className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold text-slate-700"
            >
              {label}
            </span>
          )
        )}
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={CARD}
            data-ph-guide-card="1"
            data-guide-href={g.href}
            data-guide-title={g.title}
            data-guide-tag={g.tag ?? ""}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-extrabold text-slate-900">
                {g.title}
              </h2>
              {g.readTime && (
                <span className="shrink-0 rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  {g.readTime}
                </span>
              )}
            </div>

            {g.tag && (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {g.tag}
                </span>
              </div>
            )}

            <p className="mt-2 text-sm text-slate-700">{g.description}</p>

            <div className="mt-3 text-xs font-bold text-emerald-700">
              Read guide →
            </div>
          </Link>
        ))}
      </section>

      {/* SEO: internal links */}
      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-5 backdrop-blur">
        <h3 className="text-sm font-extrabold text-slate-900">
          New to TempTake?
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          Start with your{" "}
          <Link href="/locations" className="underline font-semibold">
            locations
          </Link>
          , then set up{" "}
          <Link href="/routines" className="underline font-semibold">
            routines
          </Link>{" "}
          and your{" "}
          <Link href="/cleaning-rota" className="underline font-semibold">
            cleaning rota
          </Link>
          <BackToGuides />
          .
        </p>
      </section>
    </main>
  );
}
