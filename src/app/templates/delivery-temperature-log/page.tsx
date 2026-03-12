import Image from "next/image";
import Link from "next/link";
import TemplateActions from "@/components/TemplateActions";

export const metadata = {
  title: "Food Delivery Temperature Log Sheet (Free Download) | TempTake",
  description:
    "Download a free food delivery temperature log sheet for restaurants, takeaways and catering businesses. Record dispatch and delivery temperatures in a printable format.",
};

const rows = Array.from({ length: 14 }).map((_, i) => ({ id: i + 1 }));

export default function DeliveryTemperatureLogPage() {
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
              Food Delivery Temperature Log Sheet
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              A printable food delivery temperature log sheet for restaurants,
              takeaways and catering businesses. Record dispatch temperatures,
              delivery temperatures and corrective action when transporting hot
              or cold food.
            </p>

            <TemplateActions
              pdfHref="/downloads/delivery-temperature-log.pdf"
              printHref="/templates/delivery-temperature-log/print"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Template preview
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Record temperatures when food leaves the kitchen and when it
              reaches the customer.
            </p>
          </div>

          <div className="overflow-x-auto p-6">
            <div className="min-w-[1300px] rounded-2xl border border-slate-300 bg-white shadow-sm">
              <DeliverySheet rows={rows} />
            </div>
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