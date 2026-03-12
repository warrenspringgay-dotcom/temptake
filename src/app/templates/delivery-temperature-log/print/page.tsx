import Image from "next/image";
import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";

const rows = Array.from({ length: 18 }).map((_, i) => ({ id: i + 1 }));

export default function DeliveryTemperatureLogPrint() {
  return (
    <main className="min-h-screen bg-white p-4 print:p-0">
      <AutoPrintOnLoad />

      <div className="mx-auto max-w-[1400px]">

        <div className="mb-3 flex items-center justify-between border px-4 py-3">
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
            className="h-[24px] w-auto"
          />
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <LineField label="Business name" />
          <LineField label="Location" />
          <LineField label="Date" />
        </div>

        <div className="overflow-hidden border border-slate-700">

          <div
            className="grid bg-[#b7cde2] text-[11px] font-bold"
            style={{
              gridTemplateColumns:
                "90px 160px 180px 100px 100px 90px 90px 1fr",
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
              className="grid text-[10px]"
              style={{
                gridTemplateColumns:
                  "90px 160px 180px 100px 100px 90px 90px 1fr",
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
    </main>
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
    <div className="min-h-[28px] border-r border-t border-slate-700 px-2 py-1 last:border-r-0" />
  );
}

function LineField({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{label}</div>
      <div className="h-5 border-b border-slate-500" />
    </div>
  );
}