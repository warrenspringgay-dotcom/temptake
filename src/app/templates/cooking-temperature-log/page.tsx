// src/app/templates/cooking-temperature-log/page.tsx
import Image from "next/image";
import Link from "next/link";
import TemplateActions from "@/components/TemplateActions";

export const metadata = {
  title: "Cooking Temperature Log Sheet (Free Download) | TempTake",
  description:
    "Download a free cooking temperature log sheet for restaurants, takeaways and food businesses. Record cooked food temperatures, corrective action and staff initials in a printable format.",
};

const sampleRows = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
}));

export default function CookingTemperatureLogPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Link
              href="/templates"
              className="mb-5 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              ← Back to templates
            </Link>

            <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              Free printable template
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Cooking Temperature Log Sheet
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              A printable cooking temperature log sheet for restaurants,
              takeaways and food businesses. Record cooked food temperatures,
              corrective action and staff initials in a simple format that is
              easy to use during service.
            </p>

            <TemplateActions
              pdfHref="/downloads/cooking_temperature_log.pdf"
              printHref="/templates/cooking-temperature-log/print"
            />
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
                This is the actual cooking temperature record layout. It is
                designed to be quick to fill in during service, not admired by
                designers.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1200px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <CookingLogSheet rows={sampleRows} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">
                Why this template matters
              </h2>

              <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                <p>
                  Cooking temperature checks are one of the most basic proofs
                  that food has been cooked safely, yet plenty of kitchens still
                  rely on memory or vibes. That is not a compliance system.
                </p>

                <p>
                  A proper log sheet makes it clear what was checked, what the
                  actual reading was, whether it passed, and what happened if it
                  did not.
                </p>
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
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake lets you record cooking temperature checks digitally,
                  track missed logs and keep food safety records without relying
                  on paper sheets that disappear the second someone wipes the
                  counter.
                </p>

                <div className="mt-5">
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Start free trial
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