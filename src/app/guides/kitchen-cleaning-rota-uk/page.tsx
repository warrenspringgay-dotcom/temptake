// src/app/guides/kitchen-cleaning-rota-uk/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";
export const metadata: Metadata = {
  title: "Kitchen cleaning rota (UK): what it must include and how to keep it compliant",
  description:
    "A practical UK guide to kitchen cleaning rotas: what tasks to include, how often to clean, what inspectors expect, and how to keep records without paperwork chaos.",
  alternates: { canonical: "/guides/kitchen-cleaning-rota-uk" },
  openGraph: {
    title: "Kitchen cleaning rota (UK): what it must include and how to keep it compliant",
    description:
      "Learn what a compliant kitchen cleaning rota looks like in the UK, how often tasks should be done, and how to record them properly.",
    url: "/guides/kitchen-cleaning-rota-uk",
    type: "article",
  },
};

export default function CleaningRotaGuide() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 text-slate-900">
      {/* PostHog tracking */}
      <GuidesAnalytics slug="kitchen-cleaning-rota-uk" />
<BackToGuides />
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold leading-tight">
          Kitchen cleaning rota (UK): what it must include and how to keep it compliant
        </h1>
        <p className="text-sm text-slate-600">
          Updated for UK food businesses · Written for real kitchens, not textbooks
        </p>
      </header>

      <section className="prose prose-slate max-w-none mt-6">
        <p>
          A cleaning rota is one of the first things an Environmental Health
          Officer (EHO) will ask to see. Not because they enjoy clipboards, but
          because it proves your kitchen is cleaned <em>consistently</em>, not
          just when someone remembers.
        </p>

        <p>
          This guide explains what a compliant kitchen cleaning rota looks like
          in the UK, how often tasks should be done, and how to record cleaning
          without drowning in paperwork.
        </p>

        <h2>What is a kitchen cleaning rota?</h2>
        <p>
          A cleaning rota is a planned schedule of cleaning tasks that shows:
        </p>
        <ul>
          <li>what needs cleaning</li>
          <li>how often it must be cleaned</li>
          <li>who is responsible</li>
          <li>when it was completed</li>
        </ul>

        <p>
          In the UK, cleaning rotas are part of your food safety management
          system (for example <em>Safer Food, Better Business</em>) and support
          your legal duty to keep premises clean under food hygiene law.
        </p>

        <h2>What inspectors expect to see</h2>
        <p>
          EHOs are not looking for perfection. They are looking for{" "}
          <strong>evidence of control</strong>.
        </p>

        <ul>
          <li>Tasks appropriate to your kitchen (not a generic template)</li>
          <li>Daily, weekly and monthly cleaning clearly separated</li>
          <li>Records filled in at the time, not retrospectively</li>
          <li>Initials or names showing who completed each task</li>
        </ul>

        <p>
          A spotless kitchen with no records can still fail an inspection.
          A good rota with honest records usually passes.
        </p>

        <h2>How often should cleaning tasks be done?</h2>

        <h3>Daily cleaning tasks</h3>
        <ul>
          <li>Food preparation surfaces</li>
          <li>Cooking equipment used that day</li>
          <li>Hand wash basins and taps</li>
          <li>Floors (especially after service)</li>
          <li>Bins and waste areas</li>
        </ul>

        <h3>Weekly cleaning tasks</h3>
        <ul>
          <li>Fridges and freezer interiors</li>
          <li>Dry storage shelving</li>
          <li>Extractor hoods and filters (where applicable)</li>
          <li>Walls and splashbacks</li>
        </ul>

        <h3>Monthly or periodic tasks</h3>
        <ul>
          <li>Deep cleans behind equipment</li>
          <li>Ceilings and vents</li>
          <li>High-level storage areas</li>
          <li>External waste areas</li>
        </ul>

        <p>
          The exact frequency depends on your menu, volume, and risk level. The
          key is that your rota reflects <em>your</em> operation.
        </p>

        <h2>Paper rotas vs digital cleaning rotas</h2>
        <p>
          Paper rotas are still common, but they come with problems:
        </p>
        <ul>
          <li>missed signatures</li>
          <li>lost sheets</li>
          <li>completed after the fact</li>
          <li>no audit trail</li>
        </ul>

        <p>
          A digital cleaning rota solves this by recording:
        </p>
        <ul>
          <li>exact completion dates</li>
          <li>staff initials automatically</li>
          <li>missed or overdue tasks</li>
          <li>history for inspections and audits</li>
        </ul>

        <p>
          Many kitchens now keep a printed view on the wall for staff, while the
          digital version stores the real record.
        </p>

        <h2>Common mistakes that cause inspection problems</h2>
        <ul>
          <li>Rotas that are filled in ahead of time</li>
          <li>Tasks listed but never signed</li>
          <li>Cleaning frequencies that don’t match reality</li>
          <li>No evidence of who completed tasks</li>
        </ul>

        <p>
          These are easy to fix once the system is set up properly.
        </p>

        <h2>How TempTake helps</h2>
        <p>
          TempTake’s cleaning rota lets you:
        </p>
        <ul>
          <li>Create daily, weekly and monthly tasks</li>
          <li>Assign them to real kitchen areas</li>
          <li>Let staff complete tasks on their phones</li>
          <li>Keep a full inspection-ready history</li>
        </ul>

        <p>
          You can still print a wall rota if you want one, but the compliance
          evidence lives safely in the app.
        </p>

        <h2>Next steps</h2>
        <p>
          If you’re setting up your cleaning system, start here:
        </p>
        <ul>
          <li>
            <Link href="/locations" className="underline font-semibold">
              Add your location
            </Link>
          </li>
          <li>
            <Link href="/cleaning-rota" className="underline font-semibold">
              Build your cleaning rota
            </Link>
          </li>
          <li>
            <Link href="/team" className="underline font-semibold">
              Add staff initials
            </Link>{" "}
            so records are properly signed
          </li>
        </ul>

        <p>
          This setup alone removes a huge amount of inspection stress.
        </p>
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Written for UK food businesses. Not legal advice, but aligned with common
        Environmental Health expectations.
      </footer>
    </article>
  );
}
