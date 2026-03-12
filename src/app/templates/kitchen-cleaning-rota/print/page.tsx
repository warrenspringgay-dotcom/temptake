// src/app/templates/kitchen-cleaning-rota/print/page.tsx
import Image from "next/image";
import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";

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

type PrintPageProps = {
  searchParams?: Promise<{ autoprint?: string }>;
};

export default async function KitchenCleaningRotaPrintPage({
  searchParams,
}: PrintPageProps) {
  const params = (await searchParams) ?? {};
  const shouldAutoPrint = params.autoprint === "1";

  return (
    <main className="min-h-screen bg-white p-4 text-slate-900 print:min-h-0 print:bg-white print:p-0">
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}

      <div className="mx-auto w-full max-w-[1400px] print:max-w-none">
        {/* PAGE 1 */}
        <section className="print:break-after-page">
          <PrintBrandHeader title="Daily Cleaning Schedule" />

          <div className="overflow-hidden border border-slate-700">
            {/* Header row */}
            <div
              className="grid bg-[#b7cde2] text-[12px] font-bold text-slate-900 print:text-[11px]"
              style={{
                gridTemplateColumns: "175px 78px repeat(28, minmax(0, 1fr))",
              }}
            >
              <div className="border-r border-slate-700 px-2 py-2">
                Area/Equipment
              </div>

              <div className="border-r border-slate-700 px-2 py-2">
                Frequency
              </div>

              <div className="col-span-28 px-3 py-2 text-center">
                Month commencing date:
              
              </div>
            </div>

            {/* Days row */}
            <div
              className="grid bg-white text-center text-[11px] font-bold text-slate-900 print:text-[10px]"
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
                <div key={`${task.area}-${rowIndex}`} className="break-inside-avoid">
                  <div
                    className="grid text-[10px] text-slate-900 print:text-[9px]"
                    style={{
                      gridTemplateColumns:
                        "175px 78px repeat(28, minmax(0, 1fr))",
                      backgroundColor: striped ? "#f3f4f6" : "#ffffff",
                    }}
                  >
                    <div className="border-r border-t border-slate-700 px-2 py-2 leading-4">
                      {task.area}
                    </div>

                    <div className="border-r border-t border-slate-700 px-2 py-2 leading-4">
                      {task.frequency}
                    </div>

                    {Array.from({ length: totalDayCells }).map((_, cellIndex) => (
                      <div
                        key={`${task.area}-cell-${cellIndex}`}
                        className="min-h-[32px] border-r border-t border-slate-700"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <PrintFooter />
        </section>

        {/* PAGE 2 */}
        <section className="pt-6 print:pt-0">
          <PrintBrandHeader title="Corrective Actions & Weekly Manager Review" />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-300 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Corrective action / notes
              </h3>

              <div className="mt-3 space-y-4">
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
                <div className="h-5 border-b border-slate-300" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-300 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Weekly manager check
              </h3>

              <div className="mt-4 grid gap-3">
                <LineField label="Checked by" />
                <LineField label="Signature" />
                <LineField label="Date" />
              </div>

              <div className="mt-8">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Additional notes
                </h4>

                <div className="mt-3 space-y-4">
                  <div className="h-5 border-b border-slate-300" />
                  <div className="h-5 border-b border-slate-300" />
                  <div className="h-5 border-b border-slate-300" />
                  <div className="h-5 border-b border-slate-300" />
                  <div className="h-5 border-b border-slate-300" />
                </div>
              </div>
            </div>
          </div>

          <PrintFooter />
        </section>
      </div>
    </main>
  );
}

function PrintBrandHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 border border-slate-300 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[18px] font-bold text-slate-900 print:text-[16px]">
            TempTake
          </div>
          <div className="text-[11px] text-slate-600 print:text-[10px]">
            temptake.com
          </div>
        </div>

        <div className="text-center">
          <div className="inline-block bg-cyan-300 px-3 py-1 text-[15px] font-bold text-black print:text-[14px]">
            {title}
          </div>
        </div>

        <div className="flex min-w-[120px] justify-end">
          <Image
            src="/logo.png"
            alt="TempTake"
            width={50}
            height={50}
            className="h-[70px] w-auto object-contain print:h-[24px]"
            priority
          />
        </div>
      </div>
    </div>
  );
}

function PrintFooter() {
  return (
    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 print:text-[10px]">
      <div>TempTake</div>
      <div>temptake.com</div>
    </div>
  );
}

function LineField({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-slate-700 print:text-[12px]">
        {label}
      </div>
      <div className="h-6 border-b border-slate-500 print:h-5" />
    </div>
  );
}