import Image from "next/image";
import Link from "next/link";
import TemplateActions from "@/components/TemplateActions";

export const metadata = {
  title: "Daily Food Safety Diary Sheet (Free Download) | TempTake",
  description:
    "Download a free daily food safety diary sheet for restaurants, takeaways and catering businesses. Record key checks, incidents, corrective action and sign-off in a printable format.",
};

const sections = [
  "Opening checks completed",
  "Fridge / freezer temperatures checked",
  "Cooking / hot holding checks completed",
  "Cleaning checks completed",
  "Probe calibrated / checked",
  "Deliveries checked",
  "Incidents / complaints logged",
  "Corrective actions taken",
  "Manager review completed",
];

export default function DailyFoodSafetyDiaryPage() {
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
              Daily Food Safety Diary Sheet
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A printable daily food safety diary sheet for restaurants,
              takeaways and catering businesses. Record the day’s checks,
              incidents, corrective action and sign-off in one place.
            </p>

            <TemplateActions
              pdfHref="/downloads/daily-food-safety-diary.pdf"
              printHref="/templates/daily-food-safety-diary/print"
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
              One sheet for the day’s key checks, incidents and notes. Because
              having ten separate scraps of paper is not a system.
            </p>
          </div>

          <div className="overflow-x-auto p-6">
            <div className="min-w-[1100px] rounded-2xl border border-slate-300 bg-white shadow-sm">
              <DailyDiarySheet sections={sections} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DailyDiarySheet({ sections }: { sections: string[] }) {
  return (
    <div className="bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <PreviewBrandHeader title="Daily Food Safety Diary Sheet" />

        <div className="mb-4 grid gap-4 sm:grid-cols-4">
          <LineField label="Business name" />
          <LineField label="Location" />
          <LineField label="Date" />
          <LineField label="Manager" />
        </div>

        <div className="overflow-hidden border border-slate-700">
          <div
            className="grid bg-[#b7cde2] text-[13px] font-bold text-slate-900"
            style={{ gridTemplateColumns: "1.4fr 110px 1.6fr 120px" }}
          >
            <Header>Daily Check / Record</Header>
            <Header>Done</Header>
            <Header>Notes / Issues / Action Taken</Header>
            <Header>Initials</Header>
          </div>

          {sections.map((section, index) => (
            <div
              key={section}
              className="grid text-[12px] text-slate-900"
              style={{
                gridTemplateColumns: "1.4fr 110px 1.6fr 120px",
                backgroundColor: index % 2 === 1 ? "#f3f4f6" : "#ffffff",
              }}
            >
              <Cell defaultText={section} />
              <Cell />
              <Cell />
              <Cell />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-300 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Incidents / complaints / unusual events
            </h3>
            <div className="mt-3 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-5 border-b border-slate-300" />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Manager sign-off
            </h3>
            <div className="mt-4 grid gap-3">
              <LineField label="Reviewed by" />
              <LineField label="Signature" />
              <LineField label="Date" />
            </div>
          </div>
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

function Cell({ defaultText }: { defaultText?: string }) {
  return (
    <div className="min-h-[42px] border-r border-t border-slate-700 px-2 py-2 last:border-r-0">
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