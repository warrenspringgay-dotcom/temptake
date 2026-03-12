// src/app/templates/fridge-temperature-log/print/page.tsx
import Image from "next/image";
import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";

const rows: Array<{ fridge: string; target: string }> = [
  { fridge: "Main fridge", target: "0°C to 5°C" },
  { fridge: "Prep fridge", target: "0°C to 5°C" },
  { fridge: "Undercounter fridge", target: "0°C to 5°C" },
  { fridge: "Display fridge", target: "0°C to 5°C" },
  { fridge: "Walk-in cold room", target: "0°C to 5°C" },
  { fridge: "Undercounter freezer", target: "-18°C or below" },
  { fridge: "Chest freezer", target: "-18°C or below" },
];

const days = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
];

type PrintPageProps = {
  searchParams?: Promise<{ autoprint?: string }>;
};

export default async function FridgeTemperatureLogPrintPage({
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
          <PrintBrandHeader title="Fridge Temperature Log Sheet" />

          <div className="mb-3 grid gap-3 sm:grid-cols-3 print:gap-2">
            <LineField label="Business name" />
            <LineField label="Location" />
            <LineField label="Month / Year" />
          </div>

          <div className="overflow-hidden border border-slate-700">
            <div
              className="grid bg-[#b7cde2] text-center text-[12px] font-bold text-slate-900 print:text-[11px]"
              style={{ gridTemplateColumns: "150px 78px repeat(31, 1fr)" }}
            >
              <div className="border-r border-slate-700 px-2 py-2 text-left">
                Fridge / Unit
              </div>
              <div className="border-r border-slate-700 px-2 py-2">Target</div>

              {days.map((day) => (
                <div
                  key={day}
                  className="border-r border-slate-700 px-0.5 py-2 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {rows.map((row, rowIndex) => {
              const striped = rowIndex % 2 === 1;

              return (
                <div key={row.fridge} className="break-inside-avoid">
                  <div
                    className="grid text-[10px] text-slate-900 print:text-[9px]"
                    style={{
                      gridTemplateColumns: "150px 78px repeat(31, 1fr)",
                      backgroundColor: striped ? "#f3f4f6" : "#ffffff",
                    }}
                  >
                    <div className="border-r border-t border-slate-700 px-2 py-2 font-medium leading-4">
                      {row.fridge}
                    </div>

                    <div className="border-r border-t border-slate-700 px-2 py-2 text-center leading-4">
                      {row.target}
                    </div>

                    {days.map((day) => (
                      <div
                        key={`${row.fridge}-${day}-temp`}
                        className="min-h-[24px] border-r border-t border-slate-700"
                      />
                    ))}
                  </div>

                  <div
                    className="grid text-[9px] text-slate-900 print:text-[8px]"
                    style={{
                      gridTemplateColumns: "150px 78px repeat(31, 1fr)",
                      backgroundColor: striped ? "#f3f4f6" : "#ffffff",
                    }}
                  >
                    <div className="border-r border-t border-slate-700 px-2 py-1 text-slate-600">
                      Staff initials
                    </div>

                    <div className="border-r border-t border-slate-700 px-2 py-1" />

                    {days.map((day) => (
                      <div
                        key={`${row.fridge}-${day}-initial`}
                        className="min-h-[16px] border-r border-t border-slate-700"
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
          <PrintBrandHeader title="Corrective Actions & Manager Review" />

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
                Manager review
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
            className="h-[50px] w-auto object-contain print:h-[24px]"
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