// src/app/guides/food-hygiene-temperature-logs-uk/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

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

const container =
  "mx-auto max-w-3xl px-4 py-8 text-slate-900";
const card =
  "rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl backdrop-blur-sm";
const h1 =
  "text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900";
const lead =
  "mt-3 text-sm sm:text-base text-slate-700";
const h2 =
  "mt-8 text-xl font-extrabold text-slate-900";
const h3 =
  "mt-5 text-base font-bold text-slate-900";
const p =
  "mt-2 text-sm text-slate-700 leading-relaxed";
const ul =
  "mt-2 space-y-2 text-sm text-slate-700";
const li =
  "flex gap-2";
const dot =
  "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400";
const pill =
  "inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700";

export default function GuideFoodHygieneTempLogsUKPage() {
  const published = "2025-12-14"; // keep stable for SEO; change only when meaningfully updated

  return (
    <main className={container}>
      <article className={card}>
        {/* Breadcrumbs */}
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="opacity-60">/</span>
          <Link href="/guides" className="hover:underline">Guides</Link>
          <span className="opacity-60">/</span>
          <span className="font-semibold text-slate-900">
            Food hygiene temperature logs (UK)
          </span>
        </nav>

        {/* Title */}
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
            Keeping accurate food temperature records is a legal requirement for UK food
            businesses. More importantly, it’s one of the first things an Environmental
            Health Officer (EHO) will ask to see during an inspection.
          </p>

          <div className="mt-3 text-xs text-slate-500">
            Last updated: <time dateTime={published}>{published}</time>
          </div>
        </header>

        {/* Intro */}
        <section>
          <p className={p}>
            This guide explains <strong>what temperature checks you must record</strong>,
            <strong> how often to log them</strong>, and <strong>what inspectors expect to see</strong>.
            It’s written for restaurants, cafés, takeaways, pubs, and commercial kitchens in the UK.
          </p>
        </section>

        {/* Why */}
        <section>
          <h2 className={h2}>Why temperature logging matters</h2>
          <p className={p}>
            Food poisoning bacteria grow fastest between <strong>5°C and 63°C</strong>.
            UK food safety law requires businesses to control this risk by monitoring and recording
            temperatures at key points.
          </p>
          <p className={p}>
            If you cannot show records, EHOs will usually assume checks are not happening
            consistently, problems are not being corrected, and controls aren’t being verified.
          </p>
          <ul className={ul}>
            <li className={li}><span className={dot} />Lower hygiene ratings</li>
            <li className={li}><span className={dot} />Improvement notices</li>
            <li className={li}><span className={dot} />Follow-up inspections</li>
          </ul>
        </section>

        {/* What to record */}
        <section>
          <h2 className={h2}>What temperature checks you must record</h2>
          <p className={p}>
            There is no single government template, but EHOs expect evidence you’re checking the areas
            below (where relevant to your operation).
          </p>

          <h3 className={h3}>1) Fridge and freezer temperatures</h3>
          <p className={p}>
            You should record:
          </p>
          <ul className={ul}>
            <li className={li}><span className={dot} /><strong>Fridges:</strong> 0°C to 5°C</li>
            <li className={li}><span className={dot} /><strong>Freezers:</strong> −18°C or colder</li>
          </ul>
          <p className={p}>
            Most kitchens log these <strong>once or twice daily</strong> (opening/closing).
            Higher-risk or heavily used equipment may need more frequent checks.
          </p>

          <h3 className={h3}>2) Cooking temperatures</h3>
          <p className={p}>
            When cooking raw food, you must ensure it reaches a safe core temperature.
            Common benchmarks include <strong>75°C for 30 seconds</strong> (or equivalent).
          </p>
          <p className={p}>
            You don’t need to log every portion, but you should check and record at least one item
            per batch or service period, and record corrective action if it fails.
          </p>

          <h3 className={h3}>3) Hot holding</h3>
          <p className={p}>
            If food is kept hot before service, it must be held at <strong>63°C or above</strong>.
          </p>
          <p className={p}>
            If it drops below this, you have a limited time window to reheat to 75°C or discard.
            Logs should show temperature, time, and action taken.
          </p>

          <h3 className={h3}>4) Deliveries (where relevant)</h3>
          <p className={p}>
            For chilled or frozen deliveries, record delivery temperatures and condition.
            This protects you if unsafe stock arrives and is especially relevant for higher-risk foods.
          </p>
        </section>

        {/* Frequency */}
        <section>
          <h2 className={h2}>How often should temperatures be logged?</h2>
          <p className={p}>
            EHOs don’t expect constant logging. They expect <strong>reasonable, consistent checks</strong>.
          </p>
          <ul className={ul}>
            <li className={li}><span className={dot} />Fridges/freezers: once or twice daily</li>
            <li className={li}><span className={dot} />Cooking: per batch or per service</li>
            <li className={li}><span className={dot} />Hot holding: periodic checks during service</li>
            <li className={li}><span className={dot} />Deliveries: each delivery</li>
          </ul>
          <p className={p}>
            Consistency matters. Random gaps or identical numbers every day are obvious red flags.
          </p>
        </section>

        {/* What acceptable looks like */}
        <section>
          <h2 className={h2}>What makes a record acceptable to an EHO</h2>
          <p className={p}>A good record shows:</p>
          <ul className={ul}>
            <li className={li}><span className={dot} />Date</li>
            <li className={li}><span className={dot} />Time</li>
            <li className={li}><span className={dot} />Item or location</li>
            <li className={li}><span className={dot} />Temperature</li>
            <li className={li}><span className={dot} />Staff initials</li>
            <li className={li}><span className={dot} />Corrective action (if needed)</li>
          </ul>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-800">
            <div className="font-semibold">Believable example</div>
            <div className="mt-1 font-mono text-xs">
              Walk-in fridge – 3.4°C – 08:15 – JS
            </div>
            <div className="mt-3 font-semibold">Weak example</div>
            <div className="mt-1 font-mono text-xs">
              Fridge OK
            </div>
          </div>
        </section>

        {/* Failures */}
        <section>
          <h2 className={h2}>What to do when a temperature is out of range</h2>
          <p className={p}>
            The failure isn’t the biggest issue. The missing corrective action is.
          </p>
          <p className={p}>
            Your record should show the failed temperature, what you did, and confirmation the issue
            was resolved.
          </p>
          <ul className={ul}>
            <li className={li}><span className={dot} />Adjusted thermostat and rechecked</li>
            <li className={li}><span className={dot} />Moved food to an alternative fridge</li>
            <li className={li}><span className={dot} />Discarded affected food</li>
          </ul>
        </section>

        {/* Paper vs digital */}
        <section>
          <h2 className={h2}>Paper logs vs digital logs</h2>
          <p className={p}>
            Paper logs are acceptable, but they’re easy to lose, hard to review, and often filled in
            retrospectively.
          </p>
          <p className={p}>
            Digital logs can timestamp entries, record who completed them, and make audits faster.
            EHOs generally welcome clear digital records provided they’re accessible during inspections.
          </p>
        </section>

        {/* Mistakes */}
        <section>
          <h2 className={h2}>Common mistakes that cause problems</h2>
          <ul className={ul}>
            <li className={li}><span className={dot} />Missing days with no explanation</li>
            <li className={li}><span className={dot} />Identical temperatures recorded every time</li>
            <li className={li}><span className={dot} />No initials or unreadable handwriting</li>
            <li className={li}><span className={dot} />No corrective action recorded</li>
            <li className={li}><span className={dot} />Logs that don’t match actual equipment</li>
          </ul>
        </section>

        {/* Product tie-in */}
        <section>
          <h2 className={h2}>How TempTake helps</h2>
          <p className={p}>
            TempTake is designed around what EHOs actually look for: pre-built routines, staff initials,
            clear audit trails, and fast reporting. You still control the checks. TempTake removes the
            friction.
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

        {/* Footer */}
        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div>
            More guides:{" "}
            <Link href="/guides" className="underline">
              /guides
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
