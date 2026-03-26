// src/app/templates/cooking-temperature-log/page.tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import TemplateActions from "@/components/TemplateActions";

const SITE_URL = "https://temptake.com";
const SLUG = "cooking-temperature-log";
const CANONICAL = `${SITE_URL}/templates/${SLUG}`;

export const metadata: Metadata = {
  title: "Cooking Temperature Log Sheet (Free PDF Download) | UK Food Safety",
  description:
    "Download a free cooking temperature log sheet for restaurants, takeaways, cafés and food businesses. Record cooked food temperatures, pass or fail checks, corrective action and staff initials in a printable UK-friendly format.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "cooking temperature log sheet",
    "cooking temperature record sheet",
    "cooked food temperature log",
    "cooking temperature log template",
    "food cooking temperature log",
    "cooking temperature chart food business",
    "cooking temperature record UK",
    "food temperature log sheet",
    "cooking temp log PDF",
  ],
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Cooking Temperature Log Sheet (Free PDF Download)",
    description:
      "Free printable cooking temperature log sheet for UK food businesses. Track cooked food temperatures, corrective action and staff initials.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cooking Temperature Log Sheet (Free PDF Download)",
    description:
      "Free printable cooking temperature log sheet for UK food businesses. Track cooked food temperatures, corrective action and staff initials.",
  },
};

const sampleRows = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
}));

export default function CookingTemperatureLogPage() {
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
              Cooking Temperature Log Sheet
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              A free cooking temperature log sheet for restaurants, takeaways,
              cafés, pubs and food businesses. Use it to record cooked food
              temperatures, pass or fail results, corrective action and staff
              initials in a simple printable format that works during service.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This cooking temperature record sheet is designed for UK food
              businesses that need a clear cooked food temperature log without
              bloated paperwork or messy handwritten guesswork.
            </p>

            <div className="mt-8">
              <TemplateActions
                pdfHref="/downloads/cooking_temperature_log.pdf"
                printHref="/templates/cooking-temperature-log/print"
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
                This is the actual cooking temperature log layout. It is built to
                be quick to fill in during service, not framed and admired like
                modern art.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1200px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <CookingLogSheet rows={sampleRows} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Why a cooking temperature log matters
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    Cooking temperature checks are one of the clearest ways to
                    show that food has been cooked safely. Yet a lot of kitchens
                    still rely on memory, habits, or “it looked done”, which is
                    not a proper food safety control.
                  </p>

                  <p>
                    A good cooking temperature log sheet makes it clear what was
                    checked, what the actual reading was, whether it passed, and
                    what happened if it did not. That matters for internal
                    standards, due diligence, and inspections.
                  </p>

                  <p>
                    If you cook high-risk foods, a cooked food temperature log
                    helps prove that critical checks are being carried out
                    consistently rather than remembered only when someone starts
                    panicking about the EHO.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What to record on a cooking temperature record sheet
                </h2>

                <ul className="mt-4 space-y-3 text-base leading-7 text-slate-600">
                  <li>• Date of the check</li>
                  <li>• Food item or batch name</li>
                  <li>• Target cooking temperature</li>
                  <li>• Actual temperature reading</li>
                  <li>• Pass or fail result</li>
                  <li>• Corrective action if the reading failed</li>
                  <li>• Staff initials</li>
                </ul>

                <p className="mt-4 text-base leading-7 text-slate-600">
                  That is enough to make the record useful. You do not need ten
                  extra boxes just to feel official.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What inspectors usually expect
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    Inspectors generally want to see that cooking checks are:
                  </p>

                  <ul className="space-y-2">
                    <li>• being carried out at sensible times</li>
                    <li>• recorded clearly and consistently</li>
                    <li>• linked to actual food safety controls</li>
                    <li>• followed up properly when a reading fails</li>
                  </ul>

                  <p>
                    A cooking temperature chart or cooking temperature log is only
                    useful if it shows what happened in real life. Blank sheets,
                    identical fake-looking entries, and no corrective action on
                    failed checks all make records look weak.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  When this template is useful
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    This cooking temperature log template is useful for:
                  </p>

                  <ul className="space-y-2">
                    <li>• restaurants cooking high-risk foods</li>
                    <li>• takeaways working through busy service periods</li>
                    <li>• cafés and catering businesses</li>
                    <li>• sites still using paper food safety records</li>
                    <li>• businesses that need a printable cooking temp log PDF</li>
                  </ul>

                  <p>
                    It also works as a stopgap if you want a proper cooking
                    temperature record sheet now, before moving to digital logs.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Related templates and guides
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/templates/hot-holding-temperature-log-sheet"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Hot holding temperature log sheet
                  </Link>
                  <Link
                    href="/templates/delivery-temperature-log-sheet"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Delivery temperature log sheet
                  </Link>
                  <Link
                    href="/guides/food-hygiene-temperature-logs-uk"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Food hygiene temperature logs guide
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
                  <li>• Date column</li>
                  <li>• Item / batch column</li>
                  <li>• Target temperature</li>
                  <li>• Actual temperature</li>
                  <li>• Pass / fail column</li>
                  <li>• Corrective action notes</li>
                  <li>• Staff initials</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Free download options
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Use the printable PDF if you want a fast paper option, or open
                  the print version if you just need the sheet right now without
                  more fuss.
                </p>

                <div className="mt-5">
                  <TemplateActions
                    pdfHref="/downloads/cooking_temperature_log.pdf"
                    printHref="/templates/cooking-temperature-log/print"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake lets you record cooking temperature checks digitally,
                  track missed logs, store corrective actions, and keep food safety
                  records without relying on paper sheets that vanish the second
                  someone wipes the counter.
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

function CookingLogSheet({ rows }: { rows: Array<{ id: number }> }) {
  return (
    <div className="bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PreviewBrandHeader title="Cooking Temperature Log Sheet" />

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <LineField label="Business name" />
          <LineField label="Location" />
          <LineField label="Week commencing" />
        </div>

        <div className="overflow-hidden border border-slate-700">
          <div
            className="grid bg-[#b7cde2] text-[13px] font-bold text-slate-900"
            style={{
              gridTemplateColumns:
                "110px 220px 120px 120px 100px 1.2fr 100px",
            }}
          >
            <div className="border-r border-slate-700 px-2 py-2">Date</div>
            <div className="border-r border-slate-700 px-2 py-2">Item / Batch</div>
            <div className="border-r border-slate-700 px-2 py-2">Target Temp</div>
            <div className="border-r border-slate-700 px-2 py-2">Actual Temp</div>
            <div className="border-r border-slate-700 px-2 py-2">Pass / Fail</div>
            <div className="border-r border-slate-700 px-2 py-2">Corrective Action</div>
            <div className="px-2 py-2">Initials</div>
          </div>

          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid text-[12px] text-slate-900"
              style={{
                gridTemplateColumns:
                  "110px 220px 120px 120px 100px 1.2fr 100px",
                backgroundColor: index % 2 === 1 ? "#f3f4f6" : "#ffffff",
              }}
            >
              <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2" />
              <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2" />
              <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2 text-center">
                75°C+
              </div>
              <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2" />
              <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2" />
              <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2" />
              <div className="min-h-[42px] border-t border-slate-700 px-2 py-2" />
            </div>
          ))}
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

function LineField({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-slate-700">{label}</div>
      <div className="h-6 border-b border-slate-500" />
    </div>
  );
}