import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import TemplateActions from "@/components/TemplateActions";

const SITE_URL = "https://temptake.com";
const SLUG = "daily-food-safety-diary";
const CANONICAL = `${SITE_URL}/templates/${SLUG}`;

export const metadata: Metadata = {
  title: "Daily Food Safety Diary Sheet (Free PDF Download) | UK Food Safety",
  description:
    "Download a free daily food safety diary sheet for restaurants, takeaways and catering businesses. Record daily checks, incidents, corrective action and sign-off in a printable UK-friendly format.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "daily food safety diary sheet",
    "food safety diary template",
    "daily food safety record sheet",
    "kitchen diary sheet",
    "food safety daily checklist",
    "daily food safety log",
    "daily food safety diary PDF",
    "SFBB daily diary sheet",
    "food safety diary template UK",
  ],
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Daily Food Safety Diary Sheet (Free PDF Download)",
    description:
      "Free printable daily food safety diary sheet for UK food businesses. Record checks, incidents, corrective action and manager sign-off.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Food Safety Diary Sheet (Free PDF Download)",
    description:
      "Free printable daily food safety diary sheet for UK food businesses. Record checks, incidents, corrective action and manager sign-off.",
  },
};

const sections = [
  "Opening checks completed",
  "Fridge / freezer temperatures checked",
  "Cooking / hot holding checks completed",
  "Cleaning checks completed",
  "Probe calibrated / checked",
  "Deliveries checked",
  "Incidents / complaints logged",
  "Corrective actions taken",
  "Manager review completed",
];

export default function DailyFoodSafetyDiaryPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <Link
              href="/templates"
              className="mb-5 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              ← Back to templates
            </Link>

            <div className="mb-4 flex flex-wrap gap-2">
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                Free printable template
              </div>
              <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                UK food safety
              </div>
              <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                PDF + print
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Daily Food Safety Diary Sheet
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              A free daily food safety diary sheet for restaurants, takeaways,
              cafés and catering businesses. Use it to record the day’s key
              checks, incidents, corrective action and manager sign-off in one
              clear printable format.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This daily food safety record sheet is useful if you want one
              place to track opening checks, temperature checks, cleaning,
              incidents and end-of-day review without relying on scattered
              paperwork and half-remembered notes.
            </p>

            <div className="mt-8">
              <TemplateActions
                pdfHref="/downloads/daily-food-safety-diary.pdf"
                printHref="/templates/daily-food-safety-diary/print"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Template preview
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                One sheet for the day’s key checks, incidents and notes. Because
                ten separate scraps of paper do not magically become a food
                safety system just because they all live in the same drawer.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1100px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <DailyDiarySheet sections={sections} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Why a daily food safety diary matters
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    A daily food safety diary sheet brings the core checks of the
                    day into one place. Instead of separate notes for opening,
                    temperatures, cleaning, complaints and corrective action, you
                    get a single daily food safety log that is easier to review
                    and easier to show.
                  </p>

                  <p>
                    For many kitchens, that is the difference between “we have a
                    system” and “we think someone checked that earlier.”
                  </p>

                  <p>
                    If you use Safer Food Better Business or any similar food
                    safety management system, a daily diary template helps show
                    that checks are being completed, issues are being noticed,
                    and managers are actually reviewing what happened.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What to record on a daily food safety diary sheet
                </h2>

                <ul className="mt-4 space-y-3 text-base leading-7 text-slate-600">
                  <li>• Opening checks and readiness for service</li>
                  <li>• Fridge and freezer temperature checks</li>
                  <li>• Cooking and hot holding checks</li>
                  <li>• Cleaning tasks completed</li>
                  <li>• Probe checks or calibration notes</li>
                  <li>• Delivery checks where relevant</li>
                  <li>• Incidents, complaints or unusual events</li>
                  <li>• Corrective action taken</li>
                  <li>• Manager review and sign-off</li>
                </ul>

                <p className="mt-4 text-base leading-7 text-slate-600">
                  That is what makes this useful. It is broad enough to capture
                  the important daily controls, but simple enough to actually get
                  filled in.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What inspectors usually expect
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    Inspectors generally want to see that your food safety diary
                    is:
                  </p>

                  <ul className="space-y-2">
                    <li>• completed daily, not once a week from memory</li>
                    <li>• relevant to your actual business</li>
                    <li>• showing real checks, not just ticks for the sake of it</li>
                    <li>• clear about issues and corrective action</li>
                    <li>• reviewed and signed by someone responsible</li>
                  </ul>

                  <p>
                    A good daily food safety record sheet shows control. A blank
                    or vague diary just proves the form exists.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  When this template is useful
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    This daily food safety diary template is useful for:
                  </p>

                  <ul className="space-y-2">
                    <li>• restaurants and takeaways using paper records</li>
                    <li>• cafés and catering businesses needing a daily diary sheet</li>
                    <li>• operators who want one printable daily food safety log</li>
                    <li>• sites using SFBB-style records and daily sign-off</li>
                    <li>• managers who want one place to review the day properly</li>
                  </ul>

                  <p>
                    It is especially useful if your current “system” involves
                    multiple clipboards, loose pages, and the optimistic belief
                    that someone definitely wrote it down somewhere.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Related templates and guides
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/templates/cooking-temperature-log"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Cooking temperature log sheet
                  </Link>
                  <Link
                    href="/guides/safer-food-better-business-logs"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    SFBB logs guide
                  </Link>
                  <Link
                    href="/guides/kitchen-cleaning-rota-uk"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Kitchen cleaning rota guide
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    TempTake pricing
                  </Link>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Included in this template
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>• Daily check list section</li>
                  <li>• Done / initials columns</li>
                  <li>• Notes, issues and action area</li>
                  <li>• Incidents / complaints box</li>
                  <li>• Manager sign-off section</li>
                  <li>• Printable one-day format</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Free download options
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Download the PDF if you want a printable daily diary sheet, or
                  open the print version if you just need it immediately without
                  more messing about.
                </p>

                <div className="mt-5">
                  <TemplateActions
                    pdfHref="/downloads/daily-food-safety-diary.pdf"
                    printHref="/templates/daily-food-safety-diary/print"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake gives you a digital daily food safety diary with sign-off,
                  timestamps, linked checks and a proper audit trail, so you are
                  not depending on paper sheets to hold your whole system together.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Start free trial
                  </Link>
                  <Link
                    href="/app"
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    See TempTake
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function DailyDiarySheet({ sections }: { sections: string[] }) {
  return (
    <div className="bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PreviewBrandHeader title="Daily Food Safety Diary Sheet" />

        <div className="mb-4 grid gap-4 sm:grid-cols-4">
          <LineField label="Business name" />
          <LineField label="Location" />
          <LineField label="Date" />
          <LineField label="Manager" />
        </div>

        <div className="overflow-hidden border border-slate-700">
          <div
            className="grid bg-[#b7cde2] text-[13px] font-bold text-slate-900"
            style={{ gridTemplateColumns: "1.4fr 110px 1.6fr 120px" }}
          >
            <Header>Daily Check / Record</Header>
            <Header>Done</Header>
            <Header>Notes / Issues / Action Taken</Header>
            <Header>Initials</Header>
          </div>

          {sections.map((section, index) => (
            <div
              key={section}
              className="grid text-[12px] text-slate-900"
              style={{
                gridTemplateColumns: "1.4fr 110px 1.6fr 120px",
                backgroundColor: index % 2 === 1 ? "#f3f4f6" : "#ffffff",
              }}
            >
              <Cell defaultText={section} />
              <Cell />
              <Cell />
              <Cell />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-300 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Incidents / complaints / unusual events
            </h3>
            <div className="mt-3 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-5 border-b border-slate-300" />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Manager sign-off
            </h3>
            <div className="mt-4 grid gap-3">
              <LineField label="Reviewed by" />
              <LineField label="Signature" />
              <LineField label="Date" />
            </div>
          </div>
        </div>

        <PreviewFooter />
      </div>
    </div>
  );
}

function PreviewBrandHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 border border-slate-300 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[18px] font-bold text-slate-900">TempTake</div>
          <div className="text-[11px] text-slate-600">temptake.com</div>
        </div>
        <div className="text-center">
          <div className="inline-block bg-cyan-300 px-3 py-1 text-[15px] font-bold text-black">
            {title}
          </div>
        </div>
        <div className="flex min-w-[120px] justify-end">
          <Image
            src="/logo.png"
            alt="TempTake"
            width={50}
            height={50}
            className="h-[50px] w-auto object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}

function PreviewFooter() {
  return (
    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
      <div>TempTake</div>
      <div>temptake.com</div>
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-r border-slate-700 px-2 py-2 last:border-r-0">
      {children}
    </div>
  );
}

function Cell({ defaultText }: { defaultText?: string }) {
  return (
    <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2 last:border-r-0">
      {defaultText ?? ""}
    </div>
  );
}

function LineField({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-slate-700">{label}</div>
      <div className="h-6 border-b border-slate-500" />
    </div>
  );
}