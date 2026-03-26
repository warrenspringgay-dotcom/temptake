import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import TemplateActions from "@/components/TemplateActions";

const SITE_URL = "https://temptake.com";
const SLUG = "delivery-temperature-log";
const CANONICAL = `${SITE_URL}/templates/${SLUG}`;

export const metadata: Metadata = {
  title: "Food Delivery Temperature Log Sheet (Free PDF Download) | UK Food Safety",
  description:
    "Download a free food delivery temperature log sheet for restaurants, takeaways and catering businesses. Record dispatch temperatures, delivery temperatures, pass or fail results and corrective action in a printable UK-friendly format.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "food delivery temperature log sheet",
    "delivery temperature log",
    "delivery temperature record sheet",
    "hot food delivery temperature log",
    "cold food delivery temperature log",
    "dispatch temperature log",
    "food transport temperature log",
    "delivery temperature sheet PDF",
    "food delivery temperature log UK",
  ],
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Food Delivery Temperature Log Sheet (Free PDF Download)",
    description:
      "Free printable food delivery temperature log sheet for UK food businesses. Record dispatch and delivery temperatures, pass or fail results and notes.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Delivery Temperature Log Sheet (Free PDF Download)",
    description:
      "Free printable food delivery temperature log sheet for UK food businesses. Record dispatch and delivery temperatures, pass or fail results and notes.",
  },
};

const rows = Array.from({ length: 14 }).map((_, i) => ({ id: i + 1 }));

export default function DeliveryTemperatureLogPage() {
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
              Food Delivery Temperature Log Sheet
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              A free food delivery temperature log sheet for restaurants,
              takeaways, dark kitchens and catering businesses. Use it to record
              dispatch temperatures, delivery temperatures, pass or fail results
              and corrective action when transporting hot or cold food.
            </p>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This delivery temperature record sheet is useful if you need a clear
              printable way to track food temperatures when orders leave the
              kitchen and when they reach the customer or destination.
            </p>

            <div className="mt-8">
              <TemplateActions
                pdfHref="/downloads/delivery-temperature-log.pdf"
                printHref="/templates/delivery-temperature-log/print"
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
              <p className="mt-2 text-sm text-slate-600">
                Record temperatures when food leaves the kitchen and when it
                reaches the customer. Strange how “we usually send it out hot”
                is not considered proper documentation.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1300px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <DeliverySheet rows={rows} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Why a food delivery temperature log matters
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    If your food business transports hot or cold food, a delivery
                    temperature log helps show that the food was still being
                    controlled after it left the kitchen. That matters because food
                    safety does not magically stop mattering the second the driver
                    closes the bag.
                  </p>

                  <p>
                    A proper food delivery temperature log sheet gives you a clear
                    record of what was sent out, what the dispatch temperature was,
                    what the delivery temperature was, and what happened if it did
                    not meet the expected standard.
                  </p>

                  <p>
                    This is especially useful for restaurants, takeaways, catering
                    businesses, central kitchens and any site transporting hot food,
                    chilled food or prepared meals between locations or to customers.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What to record on a delivery temperature log sheet
                </h2>

                <ul className="mt-4 space-y-3 text-base leading-7 text-slate-600">
                  <li>• Time of dispatch or collection</li>
                  <li>• Order number or batch reference</li>
                  <li>• Food item or description</li>
                  <li>• Dispatch temperature</li>
                  <li>• Delivery or arrival temperature</li>
                  <li>• Pass or fail result</li>
                  <li>• Driver name or initials</li>
                  <li>• Notes or corrective action</li>
                </ul>

                <p className="mt-4 text-base leading-7 text-slate-600">
                  That gives you a usable dispatch temperature log and delivery
                  temperature record without overcomplicating the sheet into some
                  absurd compliance novella.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  What inspectors and auditors usually expect
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    If your business transports food, inspectors usually want to
                    see that:
                  </p>

                  <ul className="space-y-2">
                    <li>• temperatures are checked at sensible points</li>
                    <li>• the checks are recorded clearly</li>
                    <li>• hot and cold food controls are being maintained in transit</li>
                    <li>• failed checks are followed by corrective action</li>
                    <li>• the record looks real and consistent, not invented afterwards</li>
                  </ul>

                  <p>
                    A delivery temperature sheet is only useful if it reflects what
                    actually happened. Blank logs, repeated fake-looking entries,
                    and missing action on failed deliveries all make the record look weak.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">
                  When this template is useful
                </h2>

                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  <p>
                    This delivery temperature log template is useful for:
                  </p>

                  <ul className="space-y-2">
                    <li>• takeaways sending out hot food</li>
                    <li>• caterers transporting prepared food to events</li>
                    <li>• restaurants delivering chilled or hot orders</li>
                    <li>• dark kitchens managing multiple delivery runs</li>
                    <li>• businesses moving food between sites or service points</li>
                  </ul>

                  <p>
                    It also works as a simple food transport temperature log if you
                    need a printable record before moving to a digital system.
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
                    href="/templates/hot-holding-temperature-log-sheet"
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Hot holding temperature log sheet
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
                  <li>• Time column</li>
                  <li>• Order / batch reference</li>
                  <li>• Food item column</li>
                  <li>• Dispatch temperature</li>
                  <li>• Delivery temperature</li>
                  <li>• Pass / fail column</li>
                  <li>• Driver initials</li>
                  <li>• Notes section</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Free download options
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Download the PDF if you want a printable delivery temperature
                  record sheet, or open the print version if you just need the form
                  quickly without more messing about.
                </p>

                <div className="mt-5">
                  <TemplateActions
                    pdfHref="/downloads/delivery-temperature-log.pdf"
                    printHref="/templates/delivery-temperature-log/print"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake lets you record dispatch and delivery temperature checks
                  digitally, track failed checks, and keep a cleaner audit trail
                  without relying on paper sheets that go missing the second the
                  shift gets busy.
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

function DeliverySheet({ rows }: { rows: Array<{ id: number }> }) {
  return (
    <div className="bg-white p-6 text-slate-900">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">TempTake</div>
            <div className="text-xs text-slate-500">temptake.com</div>
          </div>

          <div className="bg-cyan-300 px-4 py-1 text-sm font-bold">
            Delivery Temperature Log Sheet
          </div>

          <Image
            src="/logo.png"
            alt="TempTake"
            width={60}
            height={60}
            className="h-[40px] w-auto"
          />
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <LineField label="Business name" />
          <LineField label="Location" />
          <LineField label="Date" />
        </div>

        <div className="overflow-hidden border border-slate-700">
          <div
            className="grid bg-[#b7cde2] text-[13px] font-bold"
            style={{
              gridTemplateColumns:
                "110px 180px 200px 120px 120px 110px 110px 1fr",
            }}
          >
            <Header>Time</Header>
            <Header>Order / Batch</Header>
            <Header>Food Item</Header>
            <Header>Dispatch Temp</Header>
            <Header>Delivery Temp</Header>
            <Header>Pass / Fail</Header>
            <Header>Driver</Header>
            <Header>Notes</Header>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.id}
              className="grid text-[12px]"
              style={{
                gridTemplateColumns:
                  "110px 180px 200px 120px 120px 110px 110px 1fr",
                backgroundColor: i % 2 ? "#f3f4f6" : "#ffffff",
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
            </div>
          ))}
        </div>
      </div>
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