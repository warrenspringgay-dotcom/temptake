import type { Metadata } from "next";
import Link from "next/link";
import BackToGuides from "@/components/BackToGuides";

const SITE_URL = "https://temptake.com";
const SLUG = "food-hygiene-temperature-logs-uk";
const CANONICAL = `${SITE_URL}/guides/${SLUG}`;

export const metadata: Metadata = {
  title:
    "Food Hygiene Temperature Logs (UK) | What to Record, How Often, Safe Ranges",
  description:
    "A practical UK guide to food hygiene temperature logs: what temperatures to record, how often to check them, safe hot and cold holding ranges, corrective actions, and what EHOs expect during inspection.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "food hygiene temperature logs UK",
    "food temperature log sheet",
    "fridge temperature log",
    "freezer temperature log",
    "hot holding temperature log",
    "temperature record sheet food safety",
    "food safety temperature checks UK",
    "EHO temperature records",
    "temperature corrective action log",
    "kitchen temperature log UK",
  ],
  openGraph: {
    type: "article",
    url: CANONICAL,
    title: "Food Hygiene Temperature Logs (UK)",
    description:
      "What temperatures to record, how often to check them, safe ranges, corrective actions, and what EHOs expect to see.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Hygiene Temperature Logs (UK)",
    description:
      "What temperatures to record, how often to check them, safe ranges, corrective actions, and what EHOs expect to see.",
  },
};

const container = "mx-auto max-w-4xl px-4 py-8 text-slate-900";
const card =
  "rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur-sm sm:p-7";
const h1 =
  "text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900";
const lead = "mt-3 text-sm sm:text-base text-slate-700 leading-relaxed";
const h2 = "mt-10 text-xl font-extrabold text-slate-900 sm:text-2xl";
const h3 = "mt-6 text-base font-bold text-slate-900 sm:text-lg";
const p = "mt-3 text-sm text-slate-700 leading-7";
const ul = "mt-3 space-y-2 text-sm text-slate-700";
const li = "flex gap-3";
const dot = "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500";
const pill =
  "inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700";
const box =
  "mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4";
const ctaPrimary =
  "rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-black";
const ctaSecondary =
  "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50";
const tableWrap =
  "mt-4 overflow-hidden rounded-2xl border border-slate-200";
const th =
  "bg-slate-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700";
const td = "px-4 py-3 align-top text-sm text-slate-700 border-t border-slate-200";

export default function GuideFoodHygieneTempLogsUKPage() {
  const published = "2026-03-25";

  return (
    <main className={container}>
      <article className={card}>
        <div className="mb-4">
          <BackToGuides />
        </div>

        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={pill}>UK guide</span>
            <span className={pill}>Food safety</span>
            <span className={pill}>Temperature logs</span>
            <span className={pill}>EHO-ready</span>
          </div>

          <h1 className={h1}>
            Food Hygiene Temperature Logs (UK): what to record, how often, and what EHOs expect
          </h1>

          <p className={lead}>
            Food hygiene temperature logs are one of the most important food safety records in a UK
            kitchen. Whether you run a restaurant, café, takeaway, pub, dark kitchen, school
            kitchen, or catering unit, you need a clear system for checking and recording food
            temperatures properly.
          </p>

          <p className={lead}>
            This guide explains <strong>what temperatures to log</strong>,{" "}
            <strong>how often temperature checks should be done</strong>,{" "}
            <strong>safe hot and cold holding ranges</strong>,{" "}
            <strong>what corrective actions to write down</strong>, and{" "}
            <strong>what an Environmental Health Officer (EHO) is likely to expect during inspection</strong>.
          </p>

          <div className="mt-3 text-xs text-slate-500">
            Last updated: <time dateTime={published}>{published}</time>
          </div>
        </header>

        <section>
          <div className={box}>
            <h2 className="text-base font-extrabold text-slate-900">Quick answer</h2>
            <p className={p}>
              In the UK, food businesses should record temperatures at the points that actually
              control risk: chilled storage, frozen storage, deliveries, cooking, reheating, hot
              holding, cooling, and any corrective action re-checks. A good food temperature log
              should show <strong>what was checked, when it was checked, the actual temperature,
              who checked it, and what happened if it failed</strong>.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>Why food temperature logs matter</h2>
          <p className={p}>
            Temperature control is one of the main ways you prevent harmful bacteria from growing in
            food. If food is stored, cooked, cooled, reheated, or held at the wrong temperature,
            you increase the risk of food poisoning and make it much harder to demonstrate control
            during inspection.
          </p>
          <p className={p}>
            A food hygiene temperature log is not just paperwork. It is evidence that your kitchen
            checks temperatures consistently and takes action when something is wrong. That is why
            fridge temperature logs, freezer temperature logs, hot holding logs, and food probe
            checks are such common inspection records.
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>It shows that chilled and frozen food is being stored safely.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>It helps you catch equipment faults before they become bigger problems.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>It provides a record of corrective action when a check fails.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>It gives EHOs evidence that your system is actually being followed.</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>What should a food temperature log include?</h2>
          <p className={p}>
            A proper temperature log sheet should be clear enough that someone else can look at it
            and immediately understand what happened. Whether you use paper or digital records, each
            entry should normally include:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span><strong>Date and time</strong> of the check.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>What was checked</strong>, such as walk-in fridge, freezer, hot hold unit, delivery item, or cooked food.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Actual temperature reading</strong>, not just pass or fail.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Staff initials or name</strong> of the person who carried out the check.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Corrective action</strong> if the reading was out of range.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Re-check temperature</strong> where appropriate.</span>
            </li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              Weak records usually fail because they are vague. “Fridge checked” is weak.
              “Walk-in fridge 8.6°C, moved food, engineer called, re-check 4.1°C, WS” is much
              better.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>Which temperatures should UK food businesses record?</h2>
          <p className={p}>
            Not every kitchen records every possible check every day, but most food businesses should
            be recording the temperature checks that match their actual operation.
          </p>

          <h3 className={h3}>1. Fridge temperature logs</h3>
          <p className={p}>
            A fridge temperature log records the temperature of chilled storage units such as prep
            fridges, under-counter fridges, display chillers, and walk-in cold rooms. This is one
            of the most common records EHOs ask for.
          </p>

          <h3 className={h3}>2. Freezer temperature logs</h3>
          <p className={p}>
            Freezer temperature logs help show that frozen stock is being stored correctly and that
            equipment is working as it should.
          </p>

          <h3 className={h3}>3. Delivery temperature checks</h3>
          <p className={p}>
            If chilled or frozen food is delivered to your site, a delivery temperature log helps
            prove that stock was accepted in a safe condition.
          </p>

          <h3 className={h3}>4. Cooking temperature checks</h3>
          <p className={p}>
            If you cook high-risk foods, probe checks should show that the food has reached a safe
            internal temperature before service.
          </p>

          <h3 className={h3}>5. Reheating temperature checks</h3>
          <p className={p}>
            Reheated food should be brought back up safely, and this is another area where a probe
            check may be needed.
          </p>

          <h3 className={h3}>6. Hot holding temperature logs</h3>
          <p className={p}>
            If food is kept hot for service, a hot holding temperature log is important. Hot food
            should not sit in unsafe temperature ranges for long periods.
          </p>

          <h3 className={h3}>7. Cooling records</h3>
          <p className={p}>
            If your kitchen cools food for later use, you should have some way of showing that the
            cooling process is controlled.
          </p>
        </section>

        <section>
          <h2 className={h2}>Safe temperature ranges to know</h2>
          <p className={p}>
            The exact checks you record depend on your process, but these are the temperature rules
            most kitchens are working around:
          </p>

          <div className={tableWrap}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Area</th>
                  <th className={th}>Target / rule</th>
                  <th className={th}>Why it matters</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={td}>Chilled food</td>
                  <td className={td}>Typically keep at 5°C or below</td>
                  <td className={td}>Helps slow bacterial growth</td>
                </tr>
                <tr>
                  <td className={td}>Danger zone</td>
                  <td className={td}>Between 5°C and 63°C</td>
                  <td className={td}>Bacteria can grow fastest here</td>
                </tr>
                <tr>
                  <td className={td}>Hot holding</td>
                  <td className={td}>Keep at 63°C or above</td>
                  <td className={td}>Reduces risk while food is held for service</td>
                </tr>
                <tr>
                  <td className={td}>Frozen food</td>
                  <td className={td}>Keep frozen solid</td>
                  <td className={td}>Shows frozen stock is being maintained safely</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className={p}>
            Your own documented targets may vary slightly depending on your equipment, supplier
            instructions, and system, but the key point is that your kitchen should have a clear
            standard and your records should show whether that standard was met.
          </p>
        </section>

        <section>
          <h2 className={h2}>How often should temperature checks be recorded?</h2>
          <p className={p}>
            There is no universal one-size-fits-all number for every kitchen. The right answer
            depends on your volume, equipment, risk level, and process. That said, most UK kitchens
            should have a documented routine that covers checks at sensible intervals.
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>Fridges and freezers are often checked daily.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Hot holding is often checked during service.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Deliveries are checked when high-risk chilled or frozen food arrives.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Cooking or reheating probe checks are done when needed for the food being produced.</span>
            </li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              The important thing is not “more paperwork”. It is having a sensible routine that is
              actually followed. EHOs would rather see a realistic system completed properly than a
              beautiful form nobody uses.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>What should you write when a temperature check fails?</h2>
          <p className={p}>
            This is where many temperature record sheets fall apart. A failed reading on its own is
            not enough. If a fridge is too warm or hot holding is too low, your log should show
            what you did about it.
          </p>

          <p className={p}>Good corrective action records often include:</p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>Moving food to another safe unit</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Discarding food if safety cannot be guaranteed</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Adjusting or checking equipment settings</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Calling an engineer</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Recording a re-check temperature after action was taken</span>
            </li>
          </ul>

          <div className={box}>
            <h3 className="text-base font-bold text-slate-900">Example</h3>
            <p className="mt-2 text-sm text-slate-700 leading-7">
              <strong>Weak:</strong> “Fridge failed”
            </p>
            <p className="mt-2 text-sm text-slate-700 leading-7">
              <strong>Better:</strong> “Walk-in fridge 8.2°C. Food moved to backup fridge. Engineer
              called. Re-check at 10:20 was 3.9°C. WS”
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>What EHOs expect to see in temperature records</h2>
          <p className={p}>
            EHOs are not usually looking for pretty paperwork. They are looking for evidence that
            your kitchen has control. Your temperature logs should help answer these questions:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>Are checks being done consistently?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Are records recent and believable?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Do staff know what they are recording?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Do failed readings trigger sensible corrective actions?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Is there an audit trail with initials and timings?</span>
            </li>
          </ul>

          <p className={p}>
            Blank sheets, repeated identical readings every day, missing initials, and no action on
            failed checks all make records look weak.
          </p>
        </section>

        <section>
          <h2 className={h2}>Paper log sheets vs digital food temperature logs</h2>
          <p className={p}>
            Paper sheets can work, but they are easy to forget, lose, damage, or fill in after the
            event. A digital food temperature log makes it easier to:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>record checks live during service</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>capture initials and timestamps automatically</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>flag failed readings and prompt corrective actions</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>export records quickly for inspection or review</span>
            </li>
          </ul>

          <div className={mtCta()}>
            <p className="text-sm text-slate-700 leading-7">
              If you still want paper, you can use our free log sheets. If you want a faster
              day-to-day system, TempTake is built around digital food safety records that are
              easier to complete and easier to show.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/templates" className={ctaSecondary}>
                Free templates
              </Link>
              <Link href="/launch" className={ctaPrimary}>
                See TempTake
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className={h2}>Useful templates and related guides</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/templates/fridge-temperature-log-sheet"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Fridge temperature log sheet
            </Link>
            <Link
              href="/templates/hot-holding-temperature-log-sheet"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Hot holding temperature log sheet
            </Link>
            <Link
              href="/templates/delivery-temperature-log-sheet"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Delivery temperature log sheet
            </Link>
            <Link
              href="/guides/safer-food-better-business-logs"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Safer Food Better Business logs guide
            </Link>
          </div>
        </section>

        <section>
          <h2 className={h2}>How TempTake helps</h2>
          <p className={p}>
            TempTake is built around what UK kitchens actually need from food hygiene temperature
            logs: pre-built routines, staff initials, timestamps, corrective actions, and simple
            records you can show when someone asks.
          </p>
          <p className={p}>
            Instead of chasing paper sheets, you can log temperature checks on mobile, review what
            has been missed, and keep your temperature records inspection-ready day to day.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/launch" className={ctaPrimary}>
              See TempTake
            </Link>
            <Link href="/pricing" className={ctaSecondary}>
              Pricing
            </Link>
            <Link href="/signup" className={ctaSecondary}>
              Start free trial
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}

function mtCta() {
  return "mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4";
}