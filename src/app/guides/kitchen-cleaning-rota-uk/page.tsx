// src/app/guides/kitchen-cleaning-rota-uk/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";

const SITE_URL = "https://temptake.com";
const SLUG = "kitchen-cleaning-rota-uk";
const CANONICAL = `${SITE_URL}/guides/${SLUG}`;

export const metadata: Metadata = {
  title:
    "Kitchen Cleaning Rota (UK) | Template, Tasks, Frequencies & EHO Expectations",
  description:
    "A complete UK guide to kitchen cleaning rotas: what tasks to include, how often to clean, what EHOs expect, and how to keep cleaning records compliant and inspection-ready.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "kitchen cleaning rota UK",
    "cleaning rota template kitchen",
    "kitchen cleaning schedule UK",
    "restaurant cleaning rota",
    "food hygiene cleaning schedule",
    "cleaning rota EHO requirements",
    "kitchen cleaning checklist UK",
    "daily weekly monthly cleaning rota",
  ],
  openGraph: {
    title:
      "Kitchen cleaning rota (UK): what it must include and how to keep it compliant",
    description:
      "Learn what a compliant kitchen cleaning rota looks like, what tasks to include, and how to pass inspection.",
    url: CANONICAL,
    type: "article",
  },
};

const container = "mx-auto max-w-4xl px-4 py-8 text-slate-900";
const card =
  "rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur-sm sm:p-7";
const h1 =
  "text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900";
const lead = "mt-3 text-sm sm:text-base text-slate-700 leading-relaxed";
const h2 = "mt-10 text-xl font-extrabold text-slate-900 sm:text-2xl";
const p = "mt-3 text-sm text-slate-700 leading-7";
const ul = "mt-3 space-y-2 text-sm text-slate-700";
const li = "flex gap-3";
const dot = "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500";
const box =
  "mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4";
const pill =
  "inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700";
const ctaPrimary =
  "rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-black";
const ctaSecondary =
  "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50";

export default function CleaningRotaGuide() {
  const published = "2026-03-25";

  return (
    <main className={container}>
      <article className={card}>
        <GuidesAnalytics slug="kitchen-cleaning-rota-uk" />

        <div className="mb-4">
          <BackToGuides />
        </div>

        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={pill}>UK guide</span>
            <span className={pill}>Cleaning rota</span>
            <span className={pill}>Food safety</span>
            <span className={pill}>EHO-ready</span>
          </div>

          <h1 className={h1}>
            Kitchen cleaning rota (UK): what it must include and how to keep it compliant
          </h1>

          <p className={lead}>
            A kitchen cleaning rota is one of the first things an Environmental Health Officer will ask to see. Not because they love paperwork, but because it proves your kitchen is cleaned <strong>consistently</strong>, not just when someone remembers or when inspection week magically appears.
          </p>

          <p className={lead}>
            This guide covers <strong>what a compliant cleaning rota looks like</strong>,{" "}
            <strong>what tasks to include</strong>,{" "}
            <strong>how often cleaning should be done</strong>, and{" "}
            <strong>what inspectors actually expect to see</strong>.
          </p>

          <div className="mt-3 text-xs text-slate-500">
            Last updated: <time dateTime={published}>{published}</time>
          </div>
        </header>

        {/* Quick answer */}
        <section>
          <div className={box}>
            <h2 className="text-base font-extrabold text-slate-900">Quick answer</h2>
            <p className={p}>
              A compliant kitchen cleaning rota in the UK should clearly show what needs cleaning, how often it must be done (daily, weekly, monthly), who is responsible, and when tasks are completed. Inspectors expect to see records filled in at the time, with staff initials and realistic cleaning frequencies that match how your kitchen actually operates.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>What is a kitchen cleaning rota?</h2>
          <p className={p}>
            A kitchen cleaning rota is a structured cleaning schedule or checklist used in restaurants, takeaways, cafés, and commercial kitchens. It shows:
          </p>

          <ul className={ul}>
            <li className={li}><span className={dot} />What needs cleaning</li>
            <li className={li}><span className={dot} />How often it must be cleaned</li>
            <li className={li}><span className={dot} />Who is responsible</li>
            <li className={li}><span className={dot} />When it was completed</li>
          </ul>

          <p className={p}>
            In the UK, this forms part of your food safety management system and supports your legal duty to keep premises clean under food hygiene regulations.
          </p>
        </section>

        <section>
          <h2 className={h2}>What inspectors expect to see</h2>
          <p className={p}>
            EHOs are not looking for a perfect template. They are looking for{" "}
            <strong>evidence of control</strong>.
          </p>

          <ul className={ul}>
            <li className={li}><span className={dot} />Tasks that match your actual kitchen</li>
            <li className={li}><span className={dot} />Clear daily, weekly, and monthly structure</li>
            <li className={li}><span className={dot} />Records completed at the time</li>
            <li className={li}><span className={dot} />Initials or names showing who did the work</li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700">
              A spotless kitchen with no records can still fail. A well-kept rota with honest records usually passes. That’s the game.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>How often should cleaning tasks be done?</h2>

          <h3 className="mt-6 font-bold">Daily cleaning tasks</h3>
          <ul className={ul}>
            <li className={li}><span className={dot} />Food prep surfaces</li>
            <li className={li}><span className={dot} />Equipment used that day</li>
            <li className={li}><span className={dot} />Hand wash basins</li>
            <li className={li}><span className={dot} />Floors</li>
            <li className={li}><span className={dot} />Bins</li>
          </ul>

          <h3 className="mt-6 font-bold">Weekly cleaning tasks</h3>
          <ul className={ul}>
            <li className={li}><span className={dot} />Fridges and freezers</li>
            <li className={li}><span className={dot} />Shelving</li>
            <li className={li}><span className={dot} />Extractor filters</li>
            <li className={li}><span className={dot} />Walls and splashbacks</li>
          </ul>

          <h3 className="mt-6 font-bold">Monthly or periodic tasks</h3>
          <ul className={ul}>
            <li className={li}><span className={dot} />Deep cleans behind equipment</li>
            <li className={li}><span className={dot} />Ceilings and vents</li>
            <li className={li}><span className={dot} />High-level storage</li>
            <li className={li}><span className={dot} />External areas</li>
          </ul>

          <p className={p}>
            The exact frequency depends on your operation. If your rota looks generic, inspectors assume it is not being used properly.
          </p>
        </section>

        <section>
          <h2 className={h2}>Common mistakes that cause inspection problems</h2>
          <ul className={ul}>
            <li className={li}><span className={dot} />Rotas filled in ahead of time</li>
            <li className={li}><span className={dot} />Tasks listed but never signed</li>
            <li className={li}><span className={dot} />Frequencies that don’t match reality</li>
            <li className={li}><span className={dot} />No clear responsibility</li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>Paper vs digital cleaning rotas</h2>
          <p className={p}>
            Paper rotas fail quietly. Sheets go missing, signatures get skipped, and everything gets filled in at the end of the day when nobody remembers what actually happened.
          </p>

          <p className={p}>Digital systems fix this by recording:</p>

          <ul className={ul}>
            <li className={li}><span className={dot} />Exact completion times</li>
            <li className={li}><span className={dot} />Staff initials automatically</li>
            <li className={li}><span className={dot} />Missed tasks</li>
            <li className={li}><span className={dot} />Full audit history</li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>Useful related pages</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/guides/food-hygiene-temperature-logs-uk" className="rounded-2xl border p-4 text-sm font-semibold">
              Temperature logs guide
            </Link>
            <Link href="/guides/allergen-matrix-uk" className="rounded-2xl border p-4 text-sm font-semibold">
              Allergen matrix guide
            </Link>
            <Link href="/templates" className="rounded-2xl border p-4 text-sm font-semibold">
              Free cleaning rota templates
            </Link>
            <Link href="/pricing" className="rounded-2xl border p-4 text-sm font-semibold">
              TempTake pricing
            </Link>
          </div>
        </section>

        <section>
          <h2 className={h2}>How TempTake helps</h2>
          <p className={p}>
            TempTake gives you a structured cleaning rota with real accountability. Tasks are assigned, completed in real time, and recorded automatically so you are not relying on memory or end-of-day guesswork.
          </p>

          <div className="mt-4 flex gap-2">
            <Link href="/cleaning-rota" className={ctaPrimary}>
              Build your cleaning rota
            </Link>
            <Link href="/launch" className={ctaSecondary}>
              See TempTake
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}