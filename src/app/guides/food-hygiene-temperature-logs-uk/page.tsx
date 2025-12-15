// src/app/guides/food-hygiene-temperature-logs-uk/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import BackToGuides from "@/components/BackToGuides";

const SITE_URL = "https://temptake.app";
const SLUG = "food-hygiene-temperature-logs-uk";
const CANONICAL = `${SITE_URL}/guides/${SLUG}`;

export const metadata: Metadata = {
  title: "Food Hygiene Temperature Logs (UK) | What to Record + EHO Expectations",
  description:
    "A practical UK guide to food temperature logs: what to record, how often, safe ranges, corrective actions, and what EHOs expect during inspections.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "article",
    url: CANONICAL,
    title: "Food Hygiene Temperature Logs in UK Restaurants",
    description:
      "What to record, how often, safe ranges, corrective actions, and what EHOs expect to see.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Hygiene Temperature Logs in UK Restaurants",
    description:
      "What to record, how often, safe ranges, corrective actions, and what EHOs expect to see.",
  },
};

const container = "mx-auto max-w-3xl px-4 py-8 text-slate-900";
const card =
  "rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl backdrop-blur-sm";
const h1 =
  "text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900";
const lead = "mt-3 text-sm sm:text-base text-slate-700";
const h2 = "mt-8 text-xl font-extrabold text-slate-900";
const h3 = "mt-5 text-base font-bold text-slate-900";
const p = "mt-2 text-sm text-slate-700 leading-relaxed";
const ul = "mt-2 space-y-2 text-sm text-slate-700";
const li = "flex gap-2";
const dot = "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400";
const pill =
  "inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700";

export default function GuideFoodHygieneTempLogsUKPage() {
  const published = "2025-12-14";

  return (
    <main className={container}>
      <article className={card}>
        {/* Back navigation */}
        <div className="mb-4">
          <BackToGuides />
        </div>

        {/* Header */}
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={pill}>UK guide</span>
            <span className={pill}>Food safety</span>
            <span className={pill}>EHO-ready</span>
          </div>

          <h1 className={h1}>
            Food Hygiene Temperature Logs in UK Restaurants
          </h1>

          <p className={lead}>
            Keeping accurate food temperature records is a legal requirement for
            UK food businesses. More importantly, it’s one of the first things an
            Environmental Health Officer (EHO) will ask to see during an
            inspection.
          </p>

          <div className="mt-3 text-xs text-slate-500">
            Last updated:{" "}
            <time dateTime={published}>{published}</time>
          </div>
        </header>

        {/* Intro */}
        <section>
          <p className={p}>
            This guide explains <strong>what temperature checks you must
            record</strong>, <strong>how often to log them</strong>, and{" "}
            <strong>what inspectors expect to see</strong>. It’s written for
            restaurants, cafés, takeaways, pubs, and commercial kitchens in the
            UK.
          </p>
        </section>

        {/* Why */}
        <section>
          <h2 className={h2}>Why temperature logging matters</h2>
          <p className={p}>
            Food poisoning bacteria grow fastest between{" "}
            <strong>5°C and 63°C</strong>. UK food safety law requires businesses
            to control this risk by monitoring and recording temperatures at key
            points.
          </p>
          <ul className={ul}>
            <li className={li}><span className={dot} />Lower hygiene ratings</li>
            <li className={li}><span className={dot} />Improvement notices</li>
            <li className={li}><span className={dot} />Follow-up inspections</li>
          </ul>
        </section>

        {/* Product tie-in */}
        <section>
          <h2 className={h2}>How TempTake helps</h2>
          <p className={p}>
            TempTake is designed around what EHOs actually look for: pre-built
            routines, staff initials, clear audit trails, and fast reporting.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/launch"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-black"
            >
              See TempTake
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
            >
              Pricing
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
