import Link from "next/link";

export const metadata = {
  title: "Free Food Safety Templates | TempTake",
  description:
    "Download free food safety templates for restaurants, takeaways and commercial kitchens, including cleaning rotas, temperature logs and compliance checklists.",
};

const templates = [
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
      "A free printable fridge temperature log sheet for daily temperature checks and staff initials.",
    badge: "Available now",
  },
  {
    title: "Food Temperature Log Sheet",
    href: "/templates/cooking-temperature-log",
    description:
      "Record food probe checks and hot holding temperatures in one place.",
    badge: "Available now",
  },
  {
    title: "Delivery Temperature Log Sheet",
    href: "/templates/delivery-temperature-log",
    description:
      "A simple log for recording food holdings for deliveries",
    badge: "Available now",
  },
  {
    title: "Hot Holding Temperature Log Sheet",
    href: "/templates/hot-holding-temperature-log",
    description:
      "An easy to use temperature log sheet specifically for hot holds.",
    badge: "Available now",
  },
  {
    title: "Food cooling sheet",
    href: "/templates/food-cooling-log",
    description:
      "A sheet to help track and log food cooling.",
    badge: "Available now",
  },
   {
    title: "Temperature probe calibration log",
    href: "/templates/probe-calibration-log",
    description:
      "A sheet to periodically log temperature probe calibrations",
    badge: "Available now",
  },
   {
    title: "Kitchen opening checklist",
    href: "/templates/kitchen-opening-checklist",
    description:
      "A must checklist to complete to be compliant.",
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
              Free downloads for restaurants and takeaways
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Free food safety templates
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Download practical food safety templates for busy kitchens,
              including cleaning rotas, temperature logs and inspection
              checklists. Built for real-world restaurants, takeaways and small
              food businesses.
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
            practical enough for real kitchen teams. A rare outbreak of useful
            internet behaviour.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const isAvailable = template.href !== "#";

            const cardInner = (
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                <div className="mb-4 flex items-center justify-between gap-3">
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
                        : "text-slate-400 cursor-not-allowed",
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
                temperature records and food safety checks digitally. Use the
                free templates now, then move to a cleaner system when you are
                ready to stop drowning in paper.
              </p>

              <div className="mt-6">
                <Link
                  href="/signup"
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