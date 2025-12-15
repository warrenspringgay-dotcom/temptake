// src/app/guides/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guides · TempTake",
  description:
    "Practical food safety, HACCP and kitchen compliance guides for UK hospitality teams. Temperature logs, cleaning rotas, allergen management and audits.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "TempTake Guides",
    description:
      "Practical food safety and compliance guides for UK kitchens using TempTake.",
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
  tags: string[];
};

const guides: Guide[] = [
  {
    title: "Daily Food Temperature Checks (UK) — Simple, EHO-ready",
    description:
      "What to record, how often, what counts as a fail, and how to prove control during busy service.",
    href: "/guides/daily-temperature-checks",
    tags: ["Temperatures", "EHO", "HACCP"],
  },
  {
    title: "Cleaning Rotas — Daily, Weekly & Monthly Tasks That Actually Get Done",
    description:
      "A practical rota structure, examples, and how to keep evidence without paper chaos.",
    href: "/guides/cleaning-rota-examples",
    tags: ["Cleaning", "Compliance", "Audit"],
  },
  {
    title: "Allergen Matrix Review — How to Stay Current",
    description:
      "When to review, what to include, and how to reduce risk and confusion on the pass.",
    href: "/guides/allergen-matrix-review",
    tags: ["Allergens", "Risk", "Front of House"],
  },
];

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-900">
      <header className="space-y-2 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold">Guides</h1>
        <p className="max-w-3xl text-sm text-slate-700">
          Practical food safety and compliance guides for UK kitchens. Built for
          speed, audits, and real life (not laminated lies).
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((g) => (
          <Link key={g.href} href={g.href} className={CARD}>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">
                {g.title}
              </div>
              <div className="text-sm text-slate-700">{g.description}</div>
              <div className="flex flex-wrap gap-1 pt-1">
                {g.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="pt-2 text-xs font-semibold text-emerald-700">
                Read guide →
              </div>
            </div>
          </Link>
        ))}
      </section>

      <footer className="text-xs text-slate-500">
        Want a guide on something specific? Add it to the backlog and we’ll turn
        it into a page that ranks.
      </footer>
    </div>
  );
}
