import Link from "next/link";

export const metadata = {
  title: "TempTake · Free Food Business Risk Assessment Templates",
  description:
    "Download free food business risk assessment templates for restaurants, takeaways and commercial kitchens, including kitchen safety, allergen and manual handling risk assessments.",
};

const riskAssessments = [
  {
    title: "Kitchen Safety Risk Assessment",
    description:
      "A practical kitchen safety risk assessment covering common commercial kitchen hazards including slips, trips, burns, knives, hot surfaces, cleaning chemicals and general safe working controls.",
    pdfHref:
      "/templates/risk-assessments/kitchen-safety-risk-assessment-template.pdf",
    docxHref:
      "/templates/risk-assessments/kitchen-safety-risk-assessment-template.docx",
    badge: "Available now",
  },
  {
    title: "Allergen Risk Assessment",
    description:
      "A food business allergen risk assessment template to help review allergen information, cross-contamination controls, staff communication and customer-facing allergen processes.",
    pdfHref: "/templates/risk-assessments/allergen-risk-assessment-template.pdf",
    docxHref:
      "/templates/risk-assessments/allergen-risk-assessment-template.docx",
    badge: "Available now",
  },
  {
    title: "Manual Handling Risk Assessment",
    description:
      "A manual handling risk assessment template for food businesses covering deliveries, sacks, stock movement, bins, heavy trays, lifting tasks and safer handling controls.",
    pdfHref:
      "/templates/risk-assessments/manual-handling-risk-assessment-template.pdf",
    docxHref:
      "/templates/risk-assessments/manual-handling-risk-assessment-template.docx",
    badge: "Available now",
  },
];

const includedItems = [
  "Hazards and possible harm",
  "Who may be affected",
  "Existing control measures",
  "Further action needed",
  "Person responsible",
  "Review date and action date",
];

export default function RiskAssessmentTemplatesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Link
              href="/templates"
              className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              ← Back to free food safety templates
            </Link>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Free food business risk assessment templates
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Download practical risk assessment templates for restaurants,
              takeaways, cafés and commercial kitchens. Built for real-world
              food businesses that need simple, printable records without
              overcomplicating health and safety paperwork.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Risk assessment library
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Start with the core risk assessments most small food businesses are
            likely to need: kitchen safety, allergens and manual handling. Each
            template can be viewed, printed or downloaded as a Word document.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {riskAssessments.map((template) => (
            <div
              key={template.title}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  {template.title}
                </h3>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {template.badge}
                </span>
              </div>

              <p className="flex-1 text-sm leading-6 text-slate-600">
                {template.description}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={template.pdfHref}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View / print PDF
                </Link>

                <Link
                  href={template.docxHref}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Download Word version
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                What each template includes
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                The templates are designed to be simple enough to use in a busy
                kitchen but structured enough to help you record the main risks,
                controls and follow-up actions clearly.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <ul className="grid gap-3 text-sm font-medium text-slate-700 sm:grid-cols-2 lg:grid-cols-1">
                {includedItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                Free templates now. Less paperwork later.
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Want to manage food safety records properly without piles of
                paper?
              </h2>

              <p className="mt-4 text-base leading-7 text-slate-600">
                TempTake helps food businesses move from printable templates to
                digital temperature logs, cleaning records, allergen checks,
                training reminders and inspection-ready reports.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup?source=risk_assessment_templates&utm_source=templates&utm_medium=website&utm_campaign=free_templates"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Start free trial
                </Link>

                <Link
                  href="/templates"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  View all templates
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Important note
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                These templates are provided as general guidance only and should
                be adapted to your own premises, equipment, processes, staff and
                local authority requirements. They are not a substitute for
                competent health and safety advice where required.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}