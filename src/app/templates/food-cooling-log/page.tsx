import Image from "next/image";
import Link from "next/link";
import TemplateActions from "@/components/TemplateActions";

export const metadata = {
  title: "Food Cooling Log Sheet (Free Download) | TempTake",
  description:
    "Download a free food cooling log sheet for restaurants, takeaways and catering businesses. Record cooling times, temperatures, corrective action and staff initials in a printable format.",
};

const rows = Array.from({ length: 12 }).map((_, i) => ({ id: i + 1 }));

export default function FoodCoolingLogPage() {
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
              Food Cooling Log Sheet
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              A printable food cooling log sheet for restaurants, takeaways and
              catering businesses. Record food cooling times, temperatures,
              corrective action and staff initials in a simple format.
            </p>

            <TemplateActions
              pdfHref="/downloads/food-cooling-log.pdf"
              printHref="/templates/food-cooling-log/print"
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
                Record the start and finish of cooling checks so there is actual
                evidence instead of hopeful storytelling.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <div className="min-w-[1250px] rounded-2xl border border-slate-300 bg-white shadow-sm">
                <CoolingLogSheet rows={rows} />
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
                  Cooling food safely matters because the danger zone is not
                  just a dramatic phrase people use in training. If food sits
                  warm for too long, you have a problem.
                </p>

                <p>
                  This sheet gives staff a clear way to record when cooling
                  started, the temperatures taken and what happened if the food
                  did not cool as expected.
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
                  Ready to go digital?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  TempTake lets you record cooling checks digitally, keep
                  corrective actions together and stop relying on paper records
                  that disappear into the void.
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