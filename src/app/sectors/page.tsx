import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { sectorPages } from "@/lib/sectorLandingPages";

export const metadata: Metadata = {
  title: "Food Hygiene Software by Sector | TempTake",
  description:
    "Explore TempTake by business type. See how our food hygiene software helps takeaways, cafés, restaurants, fish and chip shops, pubs serving food and mobile caterers replace paper records.",
};

const SECTOR_CARDS = [
  {
    key: "takeaway",
    title: "Takeaways",
    description:
      "Fast, practical checks for busy service and paper-free daily records.",
  },
  {
    key: "cafe",
    title: "Cafés",
    description:
      "Simple daily compliance for chilled food, small teams and cleaning.",
  },
  {
    key: "restaurant",
    title: "Restaurants",
    description:
      "More control across prep areas, allergens, teams and daily checks.",
  },
  {
    key: "fishAndChips",
    title: "Fish & chip shops",
    description:
      "Built for chippies handling hot-hold, chilled storage and service pressure.",
  },
  {
    key: "pub",
    title: "Pubs serving food",
    description:
      "Keep kitchen checks, cleaning and allergen records organised across shifts.",
  },
  {
    key: "mobileCatering",
    title: "Mobile caterers",
    description:
      "Keep food safety records on your phone wherever you are trading.",
  },
] as const;

export default function SectorsPage() {
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden bg-slate-950">
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute right-[-120px] top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-[-120px] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="absolute left-10 top-24 hidden opacity-[0.04] lg:block">
            <Image src="/logo.png" width={220} height={220} alt="" aria-hidden />
          </div>
          <div className="absolute bottom-28 right-10 hidden rotate-12 opacity-[0.04] lg:block">
            <Image src="/logo.png" width={260} height={260} alt="" aria-hidden />
          </div>
        </div>

    
       <section className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-10 pt-8 md:pb-14 md:pt-10 xl:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-lg shadow-black/20 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-md">
                <Image src="/logo.png" width={30} height={30} alt="TempTake logo" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-semibold text-white">TempTake</div>
                <div className="text-xs text-slate-400">
                  Built for UK food businesses
                </div>
              </div>
            </div>

            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Sector pages
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                Choose your fit
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-3xl lg:text-3xl">
              Food hygiene software for every type of food business
              <span className="block text-emerald-300">
                not one generic page for everyone.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm text-slate-200 sm:text-base">
              TempTake helps food businesses replace paper logs with one live system
              for temperatures, cleaning, sign-offs, allergens and staff checks.
              Choose your business type below to see the version that actually fits
              your operation.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
              >
                Start free trial
              </Link>

              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                View live demo
              </Link>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {SECTOR_CARDS.map((card) => {
                const content = sectorPages[card.key];
                const href = `/${content.slug}`;

                return (
                  <Link
                    key={card.key}
                    href={href}
                    className="group block"
                    aria-label={`${card.title} sector page`}
                  >
                    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/30 transition duration-200 hover:-translate-y-1 hover:bg-slate-900/90">
                      <div className="relative h-[320px] overflow-hidden border-b border-slate-800">
                        <Image
                          src={content.selectionImageSrc}
                          alt={content.selectionImageAlt}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent" />

                        <div className="absolute inset-x-0 bottom-0 p-5">
                          <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                            Sector
                          </div>

                          <h2 className="mt-3 text-2xl font-semibold text-white">
                            {card.title}
                          </h2>

                          <p className="mt-2 text-sm text-slate-200">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="inline-flex items-center gap-2 text-[11px] text-slate-500">
                          <Image src="/logo.png" width={14} height={14} alt="TempTake" />
                          TempTake for YOUR Sector
                        </div>
                        <div className="mt-3 text-sm font-semibold text-emerald-300">
                          View page →
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                  What you do not want
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>❌ High subscription with no value</li>
                  <li>❌ Vague promises with no operational efficiency</li>
                  <li>❌ False hope that you're compliant</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  What this gives you instead
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-100">
                  <li>✅ Follow each section - beomome compliant</li>
                  <li>✅ KNOW you're staff are logging and cleaning</li>
                  <li>✅ Live data anytime, anywhere in full detail </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}