import Link from "next/link";

export const metadata = {
  title: "TempTake · Free Food Safety Templates",
  description:
    "Download free food safety templates for restaurants, takeaways and commercial kitchens, including cleaning rotas, temperature logs, risk assessments and compliance checklists.",
};

const templates = [
  {
    title: "Risk Assessment Templates",
    href: "/templates/risk-assessments",
    description:
      "Kitchen safety, allergen and manual handling risk assessment templates for food businesses. Free download",
    badge: "Available now",
  },
  {
    title: "Kitchen Cleaning Rota Template",
    href: "/templates/kitchen-cleaning-rota",
    description:
      "A free printable kitchen cleaning rota template for daily, weekly and monthly tasks.",
    badge: "Available now",
  },
  {
    title: "Fridge Temperature Log Sheet",
    href: "/templates/fridge-temperature-log",
    description:
      "A free printable fridge temperature log sheet for daily temperature checks and staff initials. Free download",
    badge: "Available now",
  },
  {
    title: "Food Temperature Log Sheet",
    href: "/templates/cooking-temperature-log",
    description:
      "Record food probe checks and hot holding temperatures in one place. Free download",
    badge: "Available now",
  },
  {
    title: "Delivery Temperature Log Sheet",
    href: "/templates/delivery-temperature-log",
    description:
      "A simple log for recording food delivery temperatures and accepted/rejected deliveries. Free download",
    badge: "Available now",
  },
  {
    title: "Hot Holding Temperature Log Sheet",
    href: "/templates/hot-holding-temperature-log",
    description:
      "An easy-to-use temperature log sheet specifically for hot holding checks. Free download",
    badge: "Available now",
  },
  {
    title: "Food Cooling Sheet",
    href: "/templates/food-cooling-log",
    description: "A sheet to help track and log food cooling. Free download",
    badge: "Available now",
  },
  {
    title: "Temperature Probe Calibration Log",
    href: "/templates/probe-calibration-log",
    description:
      "A sheet to periodically log temperature probe calibrations. Free download",
    badge: "Available now",
  },
  {
    title: "Kitchen Opening Checklist",
    href: "/templates/kitchen-opening-checklist",
    description:
      "A practical checklist to complete when opening your kitchen for the day. Free download",
    badge: "Available now",
  },
  {
    title: "Kitchen Closing Checklist",
    href: "/templates/kitchen-closing-checklist",
    description:
      "An easy checklist for closing your kitchen down at the end of a shift. Free download",
    badge: "Available now",
  },
  {
    title: "Daily Food Safety Diary",
    href: "/templates/daily-food-safety-diary",
    description:
      "A daily food safety diary sheet for recording key checks each shift. Free download",
    badge: "Available now",
  },
];

export default function TemplatesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              Food hygiene templates to free download.
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Free food safety templates
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Download practical food safety templates for busy kitchens,
              including cleaning rotas, temperature logs, risk assessments and
              inspection checklists. Built for real-world restaurants, takeaways
              and small food businesses.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Template library
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            These templates are designed to be easy to print, simple to use and
            practical enough for real kitchen teams. Start with the free
            paperwork, then move into TempTake when you want less admin.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const isAvailable = template.href !== "#";

            const cardInner = (
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {template.title}
                  </h3>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      isAvailable
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
                    ].join(" ")}
                  >
                    {template.badge}
                  </span>
                </div>

                <p className="flex-1 text-sm leading-6 text-slate-600">
                  {template.description}
                </p>

                <div className="mt-6">
                  <span
                    className={[
                      "inline-flex items-center text-sm font-medium",
                      isAvailable
                        ? "text-emerald-700"
                        : "cursor-not-allowed text-slate-400",
                    ].join(" ")}
                  >
                    {isAvailable ? "View template" : "Coming soon"}
                  </span>
                </div>
              </div>
            );

            return isAvailable ? (
              <Link key={template.title} href={template.href} className="block">
                {cardInner}
              </Link>
            ) : (
              <div key={template.title}>{cardInner}</div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Want to stop using paper templates?
              </h2>

              <p className="mt-4 text-base leading-7 text-slate-600">
                TempTake helps restaurants and takeaways manage cleaning rotas,
                temperature records, allergen checks, staff training and food
                safety records digitally. Use the free templates now, then move
                to a cleaner system when you are ready to stop drowning in paper.
              </p>

              <div className="mt-6">
                <Link
                  href="/signup?source=templates&utm_source=templates_page&utm_medium=website&utm_campaign=free_templates"
                  className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Start free trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}