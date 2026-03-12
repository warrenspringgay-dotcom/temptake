// src/app/templates/fridge-temperature-log/page.tsx
import Image from "next/image";
import Link from "next/link";
import TemplateActions from "@/components/TemplateActions";

export const metadata = {
  title: "Fridge Temperature Log Sheet (Free Download) | TempTake",
  description:
    "Download a free fridge temperature log sheet for restaurants, takeaways and food businesses. Printable fridge temperature record template with daily checks and corrective action notes.",
};

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

export default function FridgeTemperatureLogPage() {
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
              Fridge Temperature Log Sheet
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              A printable fridge temperature log sheet for restaurants,
              takeaways and food businesses. Record daily fridge and freezer
              checks, track compliance and note corrective action when
              temperatures drift out of range.
            </p>

            <TemplateActions
              pdfHref="/downloads/fridge-temperature-log.pdf"
              printHref="/templates/fridge-temperature-log/print"
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
                This is the actual monthly fridge temperature record layout.
                Staff can enter daily temperatures and initials for each unit.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1380px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <FridgeLogSheet rows={rows} days={days} />
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
                  Fridge and freezer temperature checks are some of the most
                  basic food safety records, which is exactly why people keep
                  messing them up. A clear sheet makes it obvious what was
                  checked, when it was checked and whether somebody actually
                  recorded anything useful.
                </p>

                <p>
                  This format is simple enough for busy kitchen teams and tidy
                  enough to review later without deciphering chaos disguised as
                  paperwork.
                </p>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Included in this template
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>• Monthly date columns</li>
                  <li>• Fridge and freezer lines</li>
                  <li>• Target temperature column</li>
                  <li>• Daily temperature cells</li>
                  <li>• Initials row for each unit</li>
                  <li>• Corrective action section</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake lets you log fridge temperatures digitally, track
                  missed checks and keep compliance records without relying on
                  paper sheets that vanish the moment anybody cleans a counter.
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

function FridgeLogSheet({
  rows,
  days,
}: {
  rows: Array<{ fridge: string; target: string }>;
  days: string[];
}) {
  return (
    <div className="bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PreviewBrandHeader title="Fridge Temperature Log Sheet" />

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <LineField label="Business name" />
          <LineField label="Location" />
          <LineField label="Month / Year" />
        </div>

        <div className="overflow-hidden border border-slate-700">
          <div
            className="grid bg-[#b7cde2] text-center text-[13px] font-bold text-slate-900"
            style={{ gridTemplateColumns: "175px 78px repeat(31, 1fr)" }}
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

          {rows.flatMap((row, rowIndex) => {
            const striped = rowIndex % 2 === 1;

            return [
              <div
                key={`${row.fridge}-temp`}
                className="grid text-[12px] text-slate-900"
                style={{
                  gridTemplateColumns: "175px 78px repeat(31, 1fr)",
                  backgroundColor: striped ? "#f3f4f6" : "#ffffff",
                }}
              >
                <div className="border-r border-t border-slate-700 px-2 py-2 leading-5 font-medium">
                  {row.fridge}
                </div>

                <div className="border-r border-t border-slate-700 px-2 py-2 text-center leading-5">
                  {row.target}
                </div>

                {days.map((day) => (
                  <div
                    key={`${row.fridge}-${day}-temp`}
                    className="min-h-[36px] border-r border-t border-slate-700"
                  />
                ))}
              </div>,

              <div
                key={`${row.fridge}-initials`}
                className="grid text-[11px] text-slate-900"
                style={{
                  gridTemplateColumns: "175px 78px repeat(31, 1fr)",
                  backgroundColor: striped ? "#f3f4f6" : "#ffffff",
                }}
              >
                <div className="border-r border-t border-slate-700 px-2 py-1.5 text-slate-600">
                  Staff initials
                </div>

                <div className="border-r border-t border-slate-700 px-2 py-1.5" />

                {days.map((day) => (
                  <div
                    key={`${row.fridge}-${day}-initial`}
                    className="min-h-[26px] border-r border-t border-slate-700"
                  />
                ))}
              </div>,
            ];
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

function LineField({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-slate-700">{label}</div>
      <div className="h-6 border-b border-slate-500" />
    </div>
  );
}