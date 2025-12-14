// src/app/guides/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

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
  // Add more guides here as you create them
];

export default function GuidesIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold leading-tight">Guides</h1>
        <p className="max-w-2xl text-sm text-slate-700">
          Short, practical guides for running a compliant kitchen without
          drowning in paperwork. These are written for the UK and mapped to how
          TempTake works.
        </p>
      </header>

      {/* Quick filters (static for now, upgrade later if you want) */}
      <section className="mt-6 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold text-slate-700">
          All
        </span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold text-slate-700">
          Food safety
        </span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold text-slate-700">
          Cleaning
        </span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold text-slate-700">
          Allergens
        </span>
        <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-semibold text-slate-700">
          Training
        </span>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Link key={g.href} href={g.href} className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-extrabold text-slate-900">
                {g.title}
              </h2>
              {g.readTime ? (
                <span className="shrink-0 rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  {g.readTime}
                </span>
              ) : null}
            </div>

            {g.tag ? (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {g.tag}
                </span>
              </div>
            ) : null}

            <p className="mt-2 text-sm text-slate-700">{g.description}</p>

            <div className="mt-3 text-xs font-bold text-emerald-700">
              Read guide →
            </div>
          </Link>
        ))}
      </section>

      {/* SEO: internal links + trust */}
      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-5 backdrop-blur">
        <h3 className="text-sm font-extrabold text-slate-900">
          Using TempTake?
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          If you’re setting up a new account, start with your{" "}
          <Link href="/locations" className="underline font-semibold">
            locations
          </Link>
          , then{" "}
          <Link href="/routines" className="underline font-semibold">
            routines
          </Link>{" "}
          and your{" "}
          <Link href="/cleaning-rota" className="underline font-semibold">
            cleaning rota
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
