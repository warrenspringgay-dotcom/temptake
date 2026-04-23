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

const sectorLinks = [
  { href: "/takeaway-food-safety-app", label: "Takeaways" },
  { href: "/cafe-food-safety-app", label: "Cafés" },
  { href: "/restaurant-food-safety-app", label: "Restaurants" },
  { href: "/pub-food-safety-app", label: "Pubs serving food" },
  { href: "/fish-and-chip-shop-food-safety-app", label: "Fish & chip shops" },
  { href: "/mobile-catering-food-safety-app", label: "Mobile caterers" },
];

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
            A kitchen cleaning rota is one of the first things an Environmental Health Officer will
            ask to see. Not because they love paperwork, but because it proves your kitchen is
            cleaned <strong>consistently</strong>, not just when someone remembers or when inspection
            week magically appears.
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

        <section>
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-700">
              Stop relying on paper cleaning sheets
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">
              Use one system for cleaning tasks, accountability and audit trail
            </h2>
            <p className={p}>
              If your kitchen cleaning rota still lives on paper, TempTake gives you a cleaner way
              to keep tasks visible, record completion in real time and show what was actually done
              when someone asks.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/demo" className={ctaPrimary}>
                View live demo
              </Link>
              <Link href="/signup" className={ctaSecondary}>
                Start free trial
              </Link>
              <Link href="/food-hygiene-app" className={ctaSecondary}>
                See the software
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className={box}>
            <h2 className="text-base font-extrabold text-slate-900">Quick answer</h2>
            <p className={p}>
              A compliant kitchen cleaning rota in the UK should clearly show what needs cleaning,
              how often it must be done, who is responsible, and when tasks are completed.
              Inspectors expect to see records filled in at the time, with staff initials and
              realistic cleaning frequencies that match how your kitchen actually operates.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>What is a kitchen cleaning rota?</h2>
          <p className={p}>
            A kitchen cleaning rota is a structured cleaning schedule or checklist used in
            restaurants, takeaways, cafés, pubs and commercial kitchens. It shows:
          </p>

          <ul className={ul}>
            <li className={li}><span className={dot} /><span>What needs cleaning</span></li>
            <li className={li}><span className={dot} /><span>How often it must be cleaned</span></li>
            <li className={li}><span className={dot} /><span>Who is responsible</span></li>
            <li className={li}><span className={dot} /><span>When it was completed</span></li>
          </ul>

          <p className={p}>
            In the UK, this forms part of your food safety management system and supports your legal
            duty to keep premises clean under food hygiene regulations.
          </p>
        </section>

        <section>
          <h2 className={h2}>What inspectors expect to see</h2>
          <p className={p}>
            EHOs are not looking for a perfect template. They are looking for <strong>evidence of control</strong>.
          </p>

          <ul className={ul}>
            <li className={li}><span className={dot} /><span>Tasks that match your actual kitchen</span></li>
            <li className={li}><span className={dot} /><span>Clear daily, weekly and monthly structure</span></li>
            <li className={li}><span className={dot} /><span>Records completed at the time</span></li>
            <li className={li}><span className={dot} /><span>Initials or names showing who did the work</span></li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              A spotless kitchen with no records can still fail. A well-kept rota with honest
              records usually passes. That is the game.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>How often should cleaning tasks be done?</h2>

          <h3 className="mt-6 text-base font-bold text-slate-900 sm:text-lg">Daily cleaning tasks</h3>
          <ul className={ul}>
            <li className={li}><span className={dot} /><span>Food prep surfaces</span></li>
            <li className={li}><span className={dot} /><span>Equipment used that day</span></li>
            <li className={li}><span className={dot} /><span>Hand wash basins</span></li>
            <li className={li}><span className={dot} /><span>Floors</span></li>
            <li className={li}><span className={dot} /><span>Bins</span></li>
          </ul>

          <h3 className="mt-6 text-base font-bold text-slate-900 sm:text-lg">Weekly cleaning tasks</h3>
          <ul className={ul}>
            <li className={li}><span className={dot} /><span>Fridges and freezers</span></li>
            <li className={li}><span className={dot} /><span>Shelving</span></li>
            <li className={li}><span className={dot} /><span>Extractor filters</span></li>
            <li className={li}><span className={dot} /><span>Walls and splashbacks</span></li>
          </ul>

          <h3 className="mt-6 text-base font-bold text-slate-900 sm:text-lg">Monthly or periodic tasks</h3>
          <ul className={ul}>
            <li className={li}><span className={dot} /><span>Deep cleans behind equipment</span></li>
            <li className={li}><span className={dot} /><span>Ceilings and vents</span></li>
            <li className={li}><span className={dot} /><span>High-level storage</span></li>
            <li className={li}><span className={dot} /><span>External areas</span></li>
          </ul>

          <p className={p}>
            The exact frequency depends on your operation. If your rota looks generic, inspectors
            assume it is not being used properly.
          </p>
        </section>

        <section>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Where paper usually breaks down
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">
              The problem is not the checklist. It is whether anyone can trust it.
            </h2>
            <p className={p}>
              Paper cleaning rotas often look fine until the kitchen gets busy. Then tasks get
              skipped, sheets go missing, initials get added later, and managers only discover
              gaps after the fact.
            </p>

            <ul className={ul}>
              <li className={li}><span className={dot} /><span>Rotas get filled in after the work should have happened</span></li>
              <li className={li}><span className={dot} /><span>Tasks are signed off without clear accountability</span></li>
              <li className={li}><span className={dot} /><span>Missed cleaning is harder to spot in time</span></li>
              <li className={li}><span className={dot} /><span>Records look weak when inspected closely</span></li>
            </ul>

            <p className={p}>
              TempTake is built to fix that by keeping cleaning tasks visible, recording completion
              in real time and giving managers a clearer view of what is done and what is not.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/demo" className={ctaPrimary}>
                View live demo
              </Link>
              <Link href="/food-hygiene-app" className={ctaSecondary}>
                See the software
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className={h2}>Common mistakes that cause inspection problems</h2>
          <ul className={ul}>
            <li className={li}><span className={dot} /><span>Rotas filled in ahead of time</span></li>
            <li className={li}><span className={dot} /><span>Tasks listed but never signed</span></li>
            <li className={li}><span className={dot} /><span>Frequencies that do not match reality</span></li>
            <li className={li}><span className={dot} /><span>No clear responsibility</span></li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>Paper vs digital cleaning rotas</h2>
          <p className={p}>
            Paper rotas fail quietly. Sheets go missing, signatures get skipped, and everything gets
            filled in at the end of the day when nobody remembers what actually happened.
          </p>

          <p className={p}>Digital systems fix this by recording:</p>

          <ul className={ul}>
            <li className={li}><span className={dot} /><span>Exact completion times</span></li>
            <li className={li}><span className={dot} /><span>Staff initials automatically</span></li>
            <li className={li}><span className={dot} /><span>Missed tasks</span></li>
            <li className={li}><span className={dot} /><span>Full audit history</span></li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              If you still want a manual cleaning rota, paper can work. If you want a cleaner
              day-to-day process, TempTake is built to keep cleaning records easier to complete,
              review and trust.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/templates" className={ctaSecondary}>
                Free templates
              </Link>
              <Link href="/food-hygiene-app" className={ctaPrimary}>
                See the software
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className={h2}>Find the right version of TempTake for your business</h2>
          <p className={p}>
            Different food businesses run cleaning differently. Choose the version that matches how
            your kitchen actually works.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {sectorLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                {item.label} →
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className={h2}>Useful related pages</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/guides/food-hygiene-temperature-logs-uk"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Temperature logs guide
            </Link>
            <Link
              href="/guides/allergen-matrix-uk"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Allergen matrix guide
            </Link>
            <Link
              href="/templates"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Free cleaning rota templates
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              TempTake pricing
            </Link>
          </div>
        </section>

        <section>
          <h2 className={h2}>How TempTake helps</h2>
          <p className={p}>
            TempTake gives you a structured cleaning rota with real accountability. Tasks are
            completed in real time, recorded properly and easier to review, so you are not relying
            on memory or end-of-day guesswork.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/demo" className={ctaPrimary}>
              View live demo
            </Link>
            <Link href="/food-hygiene-app" className={ctaSecondary}>
              See the software
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}