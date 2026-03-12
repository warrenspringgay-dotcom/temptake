// src/app/templates/kitchen-cleaning-rota/page.tsx
import Image from "next/image";
import Link from "next/link";
import TemplateActions from "@/components/TemplateActions";

export const metadata = {
  title: "Kitchen Cleaning Rota Template (Free Download) | TempTake",
  description:
    "Download a free kitchen cleaning rota template for restaurants and takeaways. Four-week cleaning grid with area, frequency and daily sign-off boxes.",
};

const tasks: Array<{ area: string; frequency: string }> = [
  { area: "Rumbling room including chipper", frequency: "Daily" },
  { area: "Scrap box emptied", frequency: "Daily" },
  { area: "Frying & serving utensils washed", frequency: "Daily" },
  { area: "Cloths & tea towels in the washing machine", frequency: "Daily" },
  {
    area: "All touch points including fridge handles, card machine, till sanitised",
    frequency: "Daily",
  },
  { area: "All floors swept and mopped", frequency: "Daily" },
  { area: "Customer seating area anti-bac, sweep & mop", frequency: "Daily" },
  {
    area: "Bain marie pots emptied, cleaned and replaced with new bags",
    frequency: "Daily",
  },
  {
    area: "All bins emptied and replaced with new bags",
    frequency: "Daily",
  },
  { area: "Oven/hob cleaned down", frequency: "Daily" },
  { area: "Inside and outside of the microwave cleaned", frequency: "Daily" },
  {
    area: "Fish trays washed incl. fish fridge and take fish out for next day",
    frequency: "Daily",
  },
];

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const totalDayCells = 28;

export default function KitchenCleaningRotaPage() {
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
              Kitchen Cleaning Rota Template
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              A four-week kitchen cleaning log laid out like an actual working
              sheet. Area and equipment down the left, frequency beside it, then
              daily sign-off boxes across four weeks.
            </p>

            <TemplateActions
              pdfHref="/downloads/kitchen-cleaning-rota.pdf"
              printHref="/templates/kitchen-cleaning-rota/print"
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
                This is the actual rota layout. Staff can tick or initial each
                day as tasks are completed.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1320px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <CleaningGridSheet />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">
                Why this layout works
              </h2>
              <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                <p>
                  This is the format kitchen teams already understand. One glance
                  shows what should be cleaned and whether each day has actually
                  been signed off.
                </p>
                <p>
                  It is also better for managers because gaps stand out
                  immediately instead of being buried in random notes or separate
                  daily sheets.
                </p>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Included in this template
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>• Area / equipment column</li>
                  <li>• Frequency column</li>
                  <li>• 4 week daily grid</li>
                  <li>• Month commencing date line</li>
                  <li>• Print-friendly layout</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake lets you replace paper logs with digital routines,
                  sign-offs and reporting, so nobody is trying to explain blank
                  boxes three weeks later.
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

function CleaningGridSheet() {
  return (
    <div className="bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PreviewBrandHeader title="Daily Cleaning Schedule" />

        <div className="overflow-hidden border border-slate-700">
          {/* Header row */}
          <div
            className="grid bg-[#b7cde2] text-[13px] font-bold text-slate-900"
            style={{
              gridTemplateColumns: "175px 78px repeat(28, minmax(0, 1fr))",
            }}
          >
            <div className="border-r border-slate-700 px-2 py-2">
              Area/Equipment
            </div>

            <div className="border-r border-slate-700 px-2 py-2">Frequency</div>

            <div className="col-span-28 px-3 py-2 text-center">
              <span className="font-semibold">Month commencing date:</span>
               <span className="mx-2 inline-block min-w-[36px] border-b border-slate-600" />
            </div>
          </div>

          {/* Days row */}
          <div
            className="grid bg-white text-center text-[12px] font-bold text-slate-900"
            style={{
              gridTemplateColumns: "175px 78px repeat(28, minmax(0, 1fr))",
            }}
          >
            <div className="border-r border-t border-slate-700 px-1 py-1.5" />
            <div className="border-r border-t border-slate-700 px-1 py-1.5" />

            {Array.from({ length: 4 }).flatMap((_, weekIndex) =>
              weekDays.map((day, idx) => (
                <div
                  key={`week-${weekIndex}-${day}-${idx}`}
                  className="border-r border-t border-slate-700 px-0.5 py-1.5"
                >
                  {day}
                </div>
              ))
            )}
          </div>

          {/* Task rows */}
          {tasks.map((task, rowIndex) => {
            const striped = rowIndex % 2 === 1;

            return (
              <div
                key={`${task.area}-${rowIndex}`}
                className="grid text-[12px] text-slate-900"
                style={{
                  gridTemplateColumns: "175px 78px repeat(28, minmax(0, 1fr))",
                  backgroundColor: striped ? "#f3f4f6" : "#ffffff",
                }}
              >
                <div className="border-r border-t border-slate-700 px-2 py-2 leading-5">
                  {task.area}
                </div>

                <div className="border-r border-t border-slate-700 px-2 py-2 leading-5">
                  {task.frequency}
                </div>

                {Array.from({ length: totalDayCells }).map((_, cellIndex) => (
                  <div
                    key={`${task.area}-cell-${cellIndex}`}
                    className="min-h-[38px] border-r border-t border-slate-700"
                  />
                ))}
              </div>
            );
          })}
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