import Image from "next/image";
import Link from "next/link";
import type { SectorPageContent } from "@/lib/sectorLandingPages";

type SectorLandingPageProps = {
  content: SectorPageContent;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={cls("max-w-3xl", centered && "mx-auto text-center")}>
      {eyebrow ? (
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-700">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {body}
        </p>
      ) : null}
    </div>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
        >
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-700">
            ✓
          </span>
          <span className="text-sm font-medium leading-6 text-slate-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FeatureGrid({
  title,
  features,
}: {
  title: string;
  features: SectorPageContent["features"];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Features" title={title} centered />
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-extrabold text-slate-900">{feature.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faqs({ title, faqs }: Pick<SectorPageContent, "faqsTitle" | "faqs">) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="FAQ" title={title} centered />
      <div className="mt-10 space-y-4">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <summary className="cursor-pointer list-none pr-8 text-left text-base font-bold text-slate-900 marker:hidden">
              {faq.question}
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function SectorLandingPage({ content }: SectorLandingPageProps) {
  return (
    <main className="bg-white text-slate-900">
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-emerald-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-emerald-700">
              {content.eyebrow}
            </div>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {content.heroTitle}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {content.heroDescription}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href={content.primaryCtaHref}>
                {content.primaryCtaLabel}
              </PrimaryButton>
              <SecondaryButton href={content.secondaryCtaHref}>
                {content.secondaryCtaLabel}
              </SecondaryButton>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                Temperatures
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                Cleaning
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                Allergens
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                Digital records
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-xl">
              <div className="aspect-[4/3]">
                <Image
                  src={content.heroImageSrc}
                  alt={content.heroImageAlt}
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg sm:block">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                Built for real kitchens
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                Practical, mobile-first and inspection-ready
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <SectionHeading
          eyebrow="The problem"
          title={content.painTitle}
          body={content.painIntro}
        />
        <CheckList items={content.painPoints} />
      </section>

      <section className="border-y border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How TempTake helps"
            title={content.solutionTitle}
            body={content.solutionBody}
            centered
          />
        </div>
      </section>

      <FeatureGrid title={content.featuresTitle} features={content.features} />

      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-slate-200 bg-slate-900 px-6 py-10 text-white sm:px-10">
          <div className="max-w-3xl">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-300">
              Built for this sector
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {content.builtForTitle}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              {content.builtForBody}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-10 sm:px-10">
          <div className="max-w-3xl">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-700">
              Start now
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {content.ctaBandTitle}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
              {content.ctaBandBody}
            </p>
            <div className="mt-6">
              <PrimaryButton href={content.primaryCtaHref}>
                {content.primaryCtaLabel}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </section>

      <Faqs title={content.faqsTitle} faqs={content.faqs} />
    </main>
  );
}