import Image from "next/image";
import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";

const rows = Array.from({ length: 16 }).map((_, i) => ({ id: i + 1 }));

type PrintPageProps = {
  searchParams?: Promise<{ autoprint?: string }>;
};

export default async function ProbeCalibrationLogPrintPage({
  searchParams,
}: PrintPageProps) {
  const params = (await searchParams) ?? {};
  const shouldAutoPrint = params.autoprint === "1";

  return (
    <main className="min-h-screen bg-white p-4 text-slate-900 print:min-h-0 print:bg-white print:p-0">
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}

      <div className="mx-auto w-full max-w-[1400px] print:max-w-none">
        <section className="print:break-after-page">
          <PrintBrandHeader title="Probe Calibration Log Sheet" />

          <div className="mb-3 grid gap-3 sm:grid-cols-3 print:gap-2">
            <LineField label="Business name" />
            <LineField label="Location" />
            <LineField label="Date / Week" />
          </div>

          <div className="overflow-hidden border border-slate-700">
            <div
              className="grid bg-[#b7cde2] text-[11px] font-bold text-slate-900 print:text-[10px]"
              style={{
                gridTemplateColumns:
                  "80px 120px 120px 100px 80px 90px 1fr 70px",
              }}
            >
              <Header>Date</Header>
              <Header>Probe ID</Header>
              <Header>Method</Header>
              <Header>Expected</Header>
              <Header>Actual</Header>
              <Header>Pass / Fail</Header>
              <Header>Corrective Action</Header>
              <Header>Initials</Header>
            </div>

            {rows.map((row, index) => (
              <div
                key={row.id}
                className="grid text-[10px] text-slate-900 print:text-[9px]"
                style={{
                  gridTemplateColumns:
                    "80px 120px 120px 100px 80px 90px 1fr 70px",
                  backgroundColor: index % 2 === 1 ? "#f3f4f6" : "#ffffff",
                }}
              >
                <Cell />
                <Cell />
                <Cell defaultText="Ice water" />
                <Cell defaultText="0°C" centered />
                <Cell />
                <Cell />
                <Cell />
                <Cell />
              </div>
            ))}
          </div>

          <PrintFooter />
        </section>

        <section className="pt-6 print:pt-0">
          <PrintBrandHeader title="Corrective Actions & Manager Review" />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-300 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Corrective action / notes
              </h3>
              <div className="mt-3 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-5 border-b border-slate-300" />
                ))}
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
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-5 border-b border-slate-300" />
                  ))}
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

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-r border-slate-700 px-2 py-2 last:border-r-0">
      {children}
    </div>
  );
}

function Cell({
  defaultText,
  centered = false,
}: {
  defaultText?: string;
  centered?: boolean;
}) {
  return (
    <div
      className={[
        "min-h-[28px] border-r border-t border-slate-700 px-2 py-1.5 last:border-r-0",
        centered ? "text-center" : "",
      ].join(" ")}
    >
      {defaultText ?? ""}
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