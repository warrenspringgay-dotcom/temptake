import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import TemplateActions from "@/components/TemplateActions";

const SITE_URL = "https://temptake.com";
const SLUG = "food-cooling-log";
const CANONICAL = `${SITE_URL}/templates/${SLUG}`;

export const metadata: Metadata = {
  title: "Food Cooling Log Sheet (Free PDF Download) | UK Food Safety",
  description:
    "Download a free food cooling log sheet for restaurants, takeaways and catering businesses. Record cooling times, temperatures, pass or fail results, corrective action and staff initials in a printable UK-friendly format.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "food cooling log sheet",
    "cooling temperature log sheet",
    "food cooling record sheet",
    "cooling log template",
    "food cooling log PDF",
    "cooling temperature record UK",
    "food cooling chart",
    "cooling log for cooked food",
    "food cooling log sheet UK",
  ],
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Food Cooling Log Sheet (Free PDF Download)",
    description:
      "Free printable food cooling log sheet for UK food businesses. Record cooling times, temperatures, pass or fail results and corrective action.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Cooling Log Sheet (Free PDF Download)",
    description:
      "Free printable food cooling log sheet for UK food businesses. Record cooling times, temperatures, pass or fail results and corrective action.",
  },
};

const rows = Array.from({ length: 12 }).map((_, i) => ({ id: i + 1 }));

export default function FoodCoolingLogPage() {
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
              Food Cooling Log Sheet
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              A free food cooling log sheet for restaurants, takeaways, cafés
              and catering businesses. Use it to record cooling times,
              temperatures, pass or fail results, corrective action and staff
              initials in a simple printable format.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This food cooling record sheet is useful if you need a clear way
              to show when cooling started, when it finished, what temperatures
              were taken, and what happened if food did not cool as expected.
            </p>

            <div className="mt-8">
              <TemplateActions
                pdfHref="/downloads/food-cooling-log.pdf"
                printHref="/templates/food-cooling-log/print"
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
                Record the start and finish of cooling checks so there is actual
                evidence instead of hopeful storytelling and kitchen folklore.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1250px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <CoolingLogSheet rows={rows} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Why a food cooling log matters
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    Cooling food safely matters because warm food left sitting
                    too long creates a real food safety risk. “We left it out
                    for a bit and it was probably fine” is not a control
                    measure, no matter how confident someone sounds saying it.
                  </p>

                  <p>
                    A proper cooling temperature log sheet gives staff a clear
                    way to record when cooling started, the temperatures taken,
                    whether the food passed, and what corrective action was
                    taken if it did not cool as expected.
                  </p>

                  <p>
                    This is useful for kitchens cooling cooked food for later
                    use, batch cooking businesses, caterers, and any site that
                    needs a clear record instead of relying on memory and vibes.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What to record on a food cooling log sheet
                </h2>

                <ul className="mt-4 space-y-3 text-base leading-7 text-slate-600">
                  <li>• Date of the cooling check</li>
                  <li>• Food item or batch name</li>
                  <li>• Start time</li>
                  <li>• Start temperature</li>
                  <li>• End time</li>
                  <li>• End temperature</li>
                  <li>• Pass or fail result</li>
                  <li>• Corrective action notes</li>
                  <li>• Staff initials</li>
                </ul>

                <p className="mt-4 text-base leading-7 text-slate-600">
                  That is enough to create a useful cooling record sheet without
                  turning it into an overbuilt form nobody wants to complete.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What inspectors usually expect
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    Inspectors usually want to see that cooling checks are:
                  </p>

                  <ul className="space-y-2">
                    <li>• being carried out consistently</li>
                    <li>• recorded clearly with real times and temperatures</li>
                    <li>• linked to actual food safety controls</li>
                    <li>• followed up properly if cooling failed</li>
                    <li>• believable, not back-filled fiction</li>
                  </ul>

                  <p>
                    A food cooling log only helps if it reflects what actually
                    happened. Blank rows, identical fake-looking entries, and no
                    corrective action when food fails are the sort of nonsense
                    that makes records look weak instantly.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  When this template is useful
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    This food cooling log template is useful for:
                  </p>

                  <ul className="space-y-2">
                    <li>• restaurants cooling cooked food for later service</li>
                    <li>• takeaways batch-cooking and storing food safely</li>
                    <li>• caterers preparing food ahead of time</li>
                    <li>• businesses using chill-down processes</li>
                    <li>• kitchens that still need a printable cooling log PDF</li>
                  </ul>

                  <p>
                    It also works as a simple cooling temperature record sheet if
                    you want a paper option before moving to digital records.
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
                    href="/templates/delivery-temperature-log"
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
                  <li>• Food item column</li>
                  <li>• Start time / temp</li>
                  <li>• End time / temp</li>
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
                  Download the PDF if you want a printable cooling log, or use
                  the print version if you just need the sheet quickly without
                  turning this into a project.
                </p>

                <div className="mt-5">
                  <TemplateActions
                    pdfHref="/downloads/food-cooling-log.pdf"
                    printHref="/templates/food-cooling-log/print"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake lets you record cooling checks digitally, keep
                  corrective actions together, and stop relying on paper records
                  that disappear into the void the moment a shift gets busy.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Start free trial
                  </Link>
                  <Link
                    href="/launch"
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

function CoolingLogSheet({ rows }: { rows: Array<{ id: number }> }) {
  return (
    <div className="bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PreviewBrandHeader title="Food Cooling Log Sheet" />

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <LineField label="Business name" />
          <LineField label="Location" />
          <LineField label="Date / Week" />
        </div>

        <div className="overflow-hidden border border-slate-700">
          <div
            className="grid bg-[#b7cde2] text-[13px] font-bold text-slate-900"
            style={{
              gridTemplateColumns:
                "90px 200px 110px 100px 110px 100px 90px 1.1fr 80px",
            }}
          >
            <Header>Date</Header>
            <Header>Food Item</Header>
            <Header>Start Time</Header>
            <Header>Start Temp</Header>
            <Header>End Time</Header>
            <Header>End Temp</Header>
            <Header>Pass / Fail</Header>
            <Header>Corrective Action</Header>
            <Header>Initials</Header>
          </div>

          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid text-[12px] text-slate-900"
              style={{
                gridTemplateColumns:
                  "90px 200px 110px 100px 110px 100px 90px 1.1fr 80px",
                backgroundColor: index % 2 === 1 ? "#f3f4f6" : "#ffffff",
              }}
            >
              <Cell />
              <Cell />
              <Cell />
              <Cell />
              <Cell />
              <Cell />
              <Cell />
              <Cell />
              <Cell />
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

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-r border-slate-700 px-2 py-2 last:border-r-0">
      {children}
    </div>
  );
}

function Cell() {
  return (
    <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2 last:border-r-0" />
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