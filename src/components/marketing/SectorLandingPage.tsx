"use client";

import Image from "next/image";
import Link from "next/link";

import type { SectorPageContent } from "@/lib/sectorLandingPages";

type SectorLandingPageProps = {
  content: SectorPageContent;
};

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

function FeatureCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/30">
      <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
        TempTake
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {eyebrow}
        </div>
      ) : null}

      <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
        {title}
      </h2>

      {body ? (
        <p className="mt-3 text-sm text-slate-300 sm:text-base">{body}</p>
      ) : null}
    </div>
  );
}

function Faqs({
  faqsTitle,
  faqs,
}: Pick<SectorPageContent, "faqsTitle" | "faqs">) {
  return (
    <section className="relative z-10 border-t border-white/10 bg-slate-950/90">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
        <div className="mb-6 max-w-3xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            {faqsTitle}
            <span className="text-emerald-300"> answered properly.</span>
          </h2>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Straight answers for operators who want clarity, not vague marketing.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 open:bg-slate-900/80"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-50">
                <span className="inline-flex items-start justify-between gap-3">
                  <span>{faq.question}</span>
                  <span className="text-slate-400 group-open:text-emerald-300">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SectorLandingPage({
  content,
}: SectorLandingPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950">
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

      

        <section className="relative z-10 mx-auto grid w-full max-w-[1400px] gap-10 px-4 pb-12 pt-8 md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:items-center md:pb-16 md:pt-10 xl:px-6">
          <div className="max-w-[620px]">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-lg shadow-black/20 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-md">
                <Image src="/logo.png" width={30} height={30} alt="TempTake logo" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-semibold text-white">TempTake</div>
                <div className="text-xs text-slate-400">{content.eyebrow}</div>
              </div>
            </div>

            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built for UK food businesses
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                Free trial available
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              {content.heroTitle}
              <span className="block text-emerald-300">without the paper chase.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm text-slate-200 sm:text-base">
              {content.heroDescription}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PrimaryButton href={content.primaryCtaHref}>
                {content.primaryCtaLabel}
              </PrimaryButton>

              <SecondaryButton href={content.secondaryCtaHref}>
                {content.secondaryCtaLabel}
              </SecondaryButton>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                View pricing
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-slate-300">
              <span>✓ Mobile-friendly</span>
              <span>✓ Remote manager visibility</span>
              <span>✓ One-click reports</span>
              <span>✓ UK-focused workflows</span>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 text-xs text-slate-200 sm:text-sm md:max-w-md">
              <div>
                <dt className="text-slate-400">Built for</dt>
                <dd className="mt-0.5 font-semibold">{content.eyebrow}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Audit trail</dt>
                <dd className="mt-0.5 font-semibold">
                  Initials • timestamps • corrective actions
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Manager visibility</dt>
                <dd className="mt-0.5 font-semibold">Check in remotely anytime</dd>
              </div>
              <div>
                <dt className="text-slate-400">Designed for</dt>
                <dd className="mt-0.5 font-semibold">Fast logging during service</dd>
              </div>
            </dl>
          </div>

          <div className="md:justify-self-end">
            <div className="mx-auto max-w-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 shadow-sm">
                    <Image src="/logo.png" width={24} height={24} alt="TempTake logo" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-white">TempTake</div>
                    <div className="text-[11px] text-slate-400">Sector preview</div>
                  </div>
                </div>

                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                  Real sector positioning
                </span>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-emerald-500/10">
                <Image
                  src={content.heroImageSrc}
                  alt={content.heroImageAlt}
                  width={1672}
                  height={941}
                  className="h-[260px] w-full object-cover sm:h-[320px] lg:h-[420px]"
                  priority
                />
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
                Compliance for all sectors
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <SectionHeading
              eyebrow="The problem"
              title={content.painTitle}
              body={content.painIntro}
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                  What goes wrong
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  {content.painPoints.map((item) => (
                    <li key={item}>❌ {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  What TempTake fixes
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-100">
                  {content.solutionBody}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <SectionHeading
              eyebrow="Features"
              title={content.featuresTitle}
              body="The same core TempTake system, positioned for this sector’s actual day-to-day pressure."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {content.features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  title={feature.title}
                  body={feature.body}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="grid gap-6 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 shadow-lg shadow-emerald-500/5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  <Image src="/logo.png" width={16} height={16} alt="TempTake" />
                  Built for this sector
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {content.builtForTitle}
                </h2>
                <p className="mt-3 text-sm text-slate-300 sm:text-base">
                  {content.builtForBody}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Why this matters
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>• Less paper, less missed logging</li>
                  <li>• Better visibility across the day</li>
                  <li>• Faster records during service</li>
                  <li>• Cleaner proof when someone asks to see it</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="grid gap-6 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 shadow-lg shadow-emerald-500/5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  <Image src="/logo.png" width={16} height={16} alt="TempTake" />
                  Start now
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {content.ctaBandTitle}
                </h2>
                <p className="mt-3 text-sm text-slate-300 sm:text-base">
                  {content.ctaBandBody}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:justify-end">
                <PrimaryButton href={content.primaryCtaHref}>
                  {content.primaryCtaLabel}
                </PrimaryButton>

                <SecondaryButton href={content.secondaryCtaHref}>
                  {content.secondaryCtaLabel}
                </SecondaryButton>
              </div>
            </div>
          </div>
        </section>

        <Faqs faqsTitle={content.faqsTitle} faqs={content.faqs} />
      </main>
    </div>
  );
}