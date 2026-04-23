import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Food Hygiene Software for UK Food Businesses | TempTake",
  description:
    "Food hygiene software for UK food businesses. Manage temperature logs, cleaning schedules, sign-offs, allergen controls, training records and inspection-ready reporting in one system.",
  alternates: {
    canonical: "https://temptake.com/food-hygiene-app",
  },
  openGraph: {
    title: "Food Hygiene Software for UK Food Businesses | TempTake",
    description:
      "Digital food hygiene software for UK kitchens. Manage temperature logs, cleaning, allergens, training and reports in one place.",
    url: "https://temptake.com/food-hygiene-app",
    siteName: "TempTake",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Hygiene Software for UK Food Businesses | TempTake",
    description:
      "Digital food hygiene software for UK kitchens. Faster records, better visibility, cleaner reporting.",
  },
};

const CORE_FEATURES = [
  {
    title: "2 click temperature logging",
    description:
      "Log fridge, freezer, hot-hold and food temperatures fast enough to be used during real service, not just in theory.",
    points: [
      "2 click temp logging flow",
      "Fast pass and fail status",
      "Initials and timestamps recorded",
      "Corrective action and re-check flow built in",
    ],
    image: "/temp_log.jpg",
    alt: "TempTake temperature logging screen",
  },
  {
    title: "Hands-free voice logging",
    description:
      "Use voice-led workflows to speed up logging when hands are busy and service pressure is high.",
    points: [
      "Useful during prep and live service",
      "Reduces friction for routine logs",
      "Supports faster daily compliance habits",
      "Built for real kitchen use, not desk use",
    ],
    image: "/temp_log.jpg",
    alt: "TempTake voice-enabled temperature logging workflow",
  },
  {
    title: "Remote manager access",
    description:
      "Managers can check in remotely anytime and see what is complete, late, failed or unresolved without being on site.",
    points: [
      "Remote access for managers",
      "Live compliance visibility",
      "Quick review of missed checks",
      "Better oversight across the day",
    ],
    image: "/dashboard.jpg",
    alt: "TempTake remote manager dashboard screen",
  },
  {
    title: "Cleaning schedule and sign-off control",
    description:
      "Keep daily, weekly and monthly cleaning visible, accountable and easier to complete properly.",
    points: [
      "Task prompting for staff",
      "Daily, weekly and monthly frequencies",
      "Completion tracking by area and category",
      "Daily sign-offs in the same system",
    ],
    image: "/cleaning_rota.jpg",
    alt: "TempTake cleaning schedule and sign-off screen",
  },
  {
    title: "Allergen and food lookup tools",
    description:
      "Search which foods customers can order in seconds and keep allergen information structured instead of relying on memory.",
    points: [
      "Fast food search",
      "Allergen matrix visibility",
      "Review history and control trail",
      "Cleaner records for customer queries",
    ],
    image: "/allergens.jpg",
    alt: "TempTake allergen management and food lookup screen",
  },
  {
    title: "Training tracking and expiry dates",
    description:
      "Track staff training, expiry dates and refreshers so certificates do not quietly lapse in the background.",
    points: [
      "Training tracking by team member",
      "Expiry date visibility",
      "Refreshers easier to manage",
      "Cleaner records for inspection",
    ],
    image: "/training.jpg",
    alt: "TempTake training tracking screen",
  },
];

const PRODUCT_BLOCKS = [
  {
    title: "Small, compact and mobile-first",
    body:
      "TempTake is built to work on phones and compact devices because that is where the work actually happens. Staff should not need a full office setup just to log a fridge check.",
  },
  {
    title: "Works well on EPOS and shared screens",
    body:
      "The system is easy to run on tablets, shared wall displays and EPOS-adjacent hardware where teams need visibility, prompting and quick access during service.",
  },
  {
    title: "One touch 3 month report sending",
    body:
      "Generate and send a 3 month report directly to your EHO inspector without digging through folders, exporting bits manually or trying to rebuild the truth afterwards.",
  },
  {
    title: "4 week business reviews",
    body:
      "Run structured 4 week reviews of business performance so managers can spot repeated misses, weak teams, overdue tasks and recurring compliance pain points.",
  },
  {
    title: "Quick switch user login",
    body:
      "Staff can switch user quickly on shared devices, which keeps accountability cleaner without turning basic logging into a password drama every five minutes.",
  },
  {
    title: "Multi-site organisation and site switching",
    body:
      "Run multiple locations under one setup and switch between sites quickly so owners and managers can see what is happening across the wider business, not just one kitchen.",
  },
  {
    title: "Supplier contact centre",
    body:
      "Keep supplier contacts easy to find so teams are not scrambling for numbers when they need deliveries chased, product details checked or issues resolved quickly.",
  },
  {
    title: "Team leaderboard and notice board",
    body:
      "Use the leaderboard and notice board to drive visibility, accountability and team communication without relying on people noticing scraps of paper stuck to a wall.",
  },
  {
    title: "EHO inspection anniversary reminders",
    body:
      "Get notified around inspection anniversaries so you can tighten records, review standards and avoid drifting into complacency between visits.",
  },
  {
    title: "Hygiene rating history log",
    body:
      "Keep a visible record of hygiene rating history so the business has a clearer long-term picture of inspection performance and improvement over time.",
  },
];

const STAFF_FEATURES = [
  "2 click temp logging",
  "Hands-free voice logging",
  "Fast mobile workflows",
  "Quick switch user login on shared devices",
  "Visible tasks and prompts during service",
  "Less paper and less duplication",
];

const MANAGER_FEATURES = [
  "Check in remotely anytime",
  "Switch quickly between locations",
  "Generate 3 month reports fast",
  "Run 4 week business reviews",
  "Track training and expiry dates",
  "See missed, failed and overdue work clearly",
];

const FAQS = [
  {
    q: "Is TempTake just for temperature logs?",
    a: "No. Temperature logging is only one part of it. TempTake also covers cleaning, sign-offs, allergens, training, reporting, team visibility, supplier contacts and manager oversight.",
  },
  {
    q: "Can managers access it remotely?",
    a: "Yes. Remote manager access is one of the core strengths of the system. You can check in on your business remotely anytime and review what is complete, overdue, failed or unresolved.",
  },
  {
    q: "Does it work on phones and compact devices?",
    a: "Yes. It is designed for mobile-first use and compact workflows because daily food hygiene logging needs to happen on the move, not only from a desk.",
  },
  {
    q: "Can it work across multiple sites?",
    a: "Yes. TempTake supports multi-site operation and quick switching between sites, so owners and managers can stay on top of more than one location.",
  },
  {
    q: "Can it help with EHO reporting?",
    a: "Yes. Reports are built into the workflow, including quick generation of longer-range reports so records are easier to send when inspectors ask for them.",
  },
  {
    q: "Does it help with staff training and expiry dates?",
    a: "Yes. Training tracking and expiry visibility are built in so certificates and refreshers are easier to stay on top of.",
  },
];

const SECTOR_LINKS = [
  {
    href: "/restaurant-food-safety-app",
    label: "Restaurants",
    text: "More control across prep areas, allergens, teams and daily checks.",
  },
  {
    href: "/cafe-food-safety-app",
    label: "Cafés",
    text: "Simple daily compliance for chilled food, small teams and cleaning.",
  },
  {
    href: "/takeaway-food-safety-app",
    label: "Takeaways",
    text: "Fast, practical checks for busy service and paper-free daily records.",
  },
  {
    href: "/pub-food-safety-app",
    label: "Pubs serving food",
    text: "Keep kitchen checks, cleaning and allergen records organised across shifts.",
  },
  {
    href: "/fish-and-chip-shop-food-safety-app",
    label: "Fish & chip shops",
    text: "Built for chippies handling hot-hold, chilled storage and service pressure.",
  },
  {
    href: "/mobile-catering-food-safety-app",
    label: "Mobile caterers",
    text: "Keep food safety records on your phone wherever you are trading.",
  },
];

const GUIDE_LINKS = [
  {
    href: "/guides/food-hygiene-temperature-logs-uk",
    title: "Temperature logs guide",
    text: "What to record, how often and what EHOs expect.",
  },
  {
    href: "/guides/kitchen-cleaning-rota-uk",
    title: "Cleaning rota guide",
    text: "Tasks, frequencies and how to keep cleaning records compliant.",
  },
  {
    href: "/guides/allergen-matrix-uk",
    title: "Allergen matrix guide",
    text: "How often to review it and what inspectors expect.",
  },
  {
    href: "/guides/food-hygiene-training-expiry-uk",
    title: "Training expiry guide",
    text: "How long certificates last and when refreshers should happen.",
  },
];

export default function FoodHygieneAppPage() {
  return (
    <main className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[-120px] top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1320px] items-center justify-between px-4 py-4 xl:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 backdrop-blur">
            <Image src="/logo.png" width={28} height={28} alt="TempTake" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-white">TempTake</div>
            <div className="text-[11px] font-medium text-slate-400">
              Food hygiene software for UK food businesses
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
          >
            View demo
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
          >
            Start free trial
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1320px] gap-10 px-4 pb-16 pt-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center md:pb-24 md:pt-16 xl:px-6">
        <div className="max-w-[660px]">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Food hygiene software
            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              Built for UK food businesses
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
            Food hygiene software for UK food businesses
            <span className="block text-emerald-300">built to run the daily reality properly.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm text-slate-200 sm:text-base">
            TempTake gives UK food businesses one live system for temperature logs,
            cleaning schedules, sign-offs, allergen controls, training records,
            manager visibility and inspection-ready reporting.
          </p>

          <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            This page is not the broad sales pitch. This is the actual product view:
            what it does, how it works and why it is better than relying on paper,
            memory and people “doing it later”.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
            >
              View live demo
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              Start free trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
            >
              View pricing
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-slate-300">
            <span>✓ Mobile-first</span>
            <span>✓ Remote manager access</span>
            <span>✓ Voice logging</span>
            <span>✓ Multi-site ready</span>
          </div>
        </div>

        <div className="md:justify-self-end">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-emerald-500/10">
            <Image
              src="/dashboard.jpg"
              alt="TempTake food hygiene software dashboard"
              width={1600}
              height={900}
              className="h-[260px] w-full object-cover object-top sm:h-[320px] lg:h-[360px]"
              priority
            />
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
            Faster daily records. Better visibility. Cleaner proof when asked.
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Core product features
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              These are the features that make the system usable during real shifts,
              not just impressive in screenshots.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {CORE_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/30"
              >
                <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="overflow-hidden border-b border-slate-800 md:border-b-0 md:border-r">
                    <Image
                      src={feature.image}
                      alt={feature.alt}
                      width={900}
                      height={1200}
                      className="h-[280px] w-full object-cover object-top"
                    />
                  </div>

                  <div className="p-5">
                    <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      Product feature
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm text-slate-300">{feature.description}</p>

                    <ul className="mt-4 space-y-2 text-sm text-slate-200">
                      {feature.points.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              The point
            </div>
            <h3 className="mt-3 text-xl font-semibold text-white">
              This is not software for “looking compliant”.
            </h3>
            <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
              It is software for actually running daily food hygiene properly, with records
              staff can complete, managers can trust and inspectors can follow.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              More of what the platform actually includes
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              This is where the difference shows. Not just “logs and reports”, but the
              surrounding operational features that make the whole system useful.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PRODUCT_BLOCKS.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/30"
              >
                <h3 className="text-base font-semibold text-slate-50">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-4 py-12 md:grid-cols-2 md:py-16 xl:px-6">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-black/30">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Staff side
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              What staff actually use
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Staff need speed, clarity and low friction. If the system is awkward, they will avoid it.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-slate-100">
              {STAFF_FEATURES.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 shadow-lg shadow-black/30">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Manager side
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              What managers actually get
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Managers need visibility, control and reporting without living inside spreadsheets and folders.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-slate-100">
              {MANAGER_FEATURES.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Built for your type of food business
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              TempTake is not generic software trying to fit every kitchen the same way.
              Choose the version that matches how your business actually works.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SECTOR_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/30 hover:bg-slate-900/90"
              >
                <div className="text-base font-semibold text-slate-100">{item.label}</div>
                <p className="mt-2 text-sm text-slate-300">{item.text}</p>
                <div className="mt-4 text-sm font-semibold text-emerald-300">View page →</div>
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href="/sectors"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              View all sector pages
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Why this works better than paper
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              Paper depends on memory, timing and discipline. TempTake gives you structure,
              prompts, visibility and a proper audit trail.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-lg shadow-black/30">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                What paper usually means
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <li>❌ End-of-day catch-up instead of live records</li>
                <li>❌ Missing initials and weak accountability</li>
                <li>❌ Managers finding problems too late</li>
                <li>❌ Scrambling when someone asks for proof</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-black/30">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                What TempTake gives you instead
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-100">
                <li>✅ Live daily records instead of reconstructed ones</li>
                <li>✅ Clear audit trail with timestamps and accountability</li>
                <li>✅ Better visibility for managers across the day</li>
                <li>✅ Faster reporting when records are requested</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="grid gap-6 md:grid-cols-[1fr_0.95fr] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Reporting is built in, not bolted on
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                Food hygiene software is not very useful if the records stay trapped in it.
                TempTake is designed so you can review what happened, generate reports quickly
                and send records when an EHO, manager or owner needs to see them.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-slate-200">
                <li>• Generate inspection-ready reports faster</li>
                <li>• Send 3 month reports without the paper chase</li>
                <li>• Review checks and corrective actions clearly</li>
                <li>• Keep daily records organised in one place</li>
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
                >
                  View live demo
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Workflow
              </div>
              <div className="mt-4 space-y-3">
                <WorkflowRow
                  title="1. Staff log checks"
                  text="The system captures temperatures, cleaning and daily compliance records quickly."
                />
                <WorkflowRow
                  title="2. Managers review remotely"
                  text="Managers can see what is complete, failed, overdue or unresolved from anywhere."
                />
                <WorkflowRow
                  title="3. Reports are ready"
                  text="When records are requested, you are working from stored data instead of chaos."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Learn what EHOs actually expect
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              These public guides explain the standards behind the software and why paper systems
              keep breaking down in real kitchens.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {GUIDE_LINKS.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/30 hover:bg-slate-900/90"
              >
                <div className="text-base font-semibold text-slate-100">{guide.title}</div>
                <p className="mt-2 text-sm text-slate-300">{guide.text}</p>
                <div className="mt-4 text-sm font-semibold text-emerald-300">Read guide →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/90">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="mb-6 max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Food hygiene software FAQs
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Straight answers about what the software does and how it fits daily use.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 open:bg-slate-900/80"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-50">
                  <span className="inline-flex items-start justify-between gap-3">
                    <span>{faq.q}</span>
                    <span className="text-slate-400 group-open:text-emerald-300">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-300">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center md:py-20">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Use one food hygiene software system
            <span className="block text-emerald-300">instead of juggling paper, memory and luck</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            TempTake gives UK food businesses one system for daily food hygiene records,
            manager oversight and faster reporting. Save time logging, keep staff on track
            and stay ready when records are requested.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
            >
              Start free trial
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              View live demo
            </Link>
            <Link
              href="/sectors"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
            >
              Browse by sector
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function WorkflowRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <p className="mt-1 text-sm text-slate-300">{text}</p>
    </div>
  );
}