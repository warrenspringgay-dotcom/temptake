import Image from "next/image";
import Link from "next/link";
import TemplateActions from "@/components/TemplateActions";

export const metadata = {
  title: "Probe Calibration Log Sheet (Free Download) | TempTake",
  description:
    "Download a free probe calibration log sheet for restaurants, takeaways and catering businesses. Record probe checks, results, corrective action and staff initials in a printable format.",
};

const rows = Array.from({ length: 14 }).map((_, i) => ({ id: i + 1 }));

export default function ProbeCalibrationLogPage() {
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
              Probe Calibration Log Sheet
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A printable probe calibration log sheet for restaurants, takeaways
              and catering businesses. Record probe checks, results,
              corrective action and staff initials in a simple format.
            </p>

            <TemplateActions
              pdfHref="/downloads/probe-calibration-log.pdf"
              printHref="/templates/probe-calibration-log/print"
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
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep a proper record of probe checks instead of assuming the
              thermometer is telling the truth out of kindness.
            </p>
          </div>

          <div className="overflow-x-auto p-6">
            <div className="min-w-[1180px] rounded-2xl border border-slate-300 bg-white shadow-sm">
              <ProbeCalibrationSheet rows={rows} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProbeCalibrationSheet({ rows }: { rows: Array<{ id: number }> }) {
  return (
    <div className="bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PreviewBrandHeader title="Probe Calibration Log Sheet" />

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
                "90px 140px 140px 120px 90px 100px 1fr 80px",
            }}
          >
            <Header>Date</Header>
            <Header>Probe ID</Header>
            <Header>Method</Header>
            <Header>Expected Result</Header>
            <Header>Actual</Header>
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
                  "90px 140px 140px 120px 90px 100px 1fr 80px",
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
        "min-h-[42px] border-r border-t border-slate-700 px-2 py-2 last:border-r-0",
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
      <div className="mb-1 text-sm font-semibold text-slate-700">{label}</div>
      <div className="h-6 border-b border-slate-500" />
    </div>
  );
}