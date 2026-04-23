import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";

const SITE_URL = "https://temptake.com";
const SLUG = "food-hygiene-training-expiry-uk";
const CANONICAL = `${SITE_URL}/guides/${SLUG}`;

export const metadata: Metadata = {
  title:
    "Food Hygiene Training Expiry (UK) | How Long It Lasts, Levels, Refreshers",
  description:
    "A practical UK guide to food hygiene training expiry: how long food hygiene certificates last, who needs Level 1, 2 or 3, when refresher training is expected, and what EHOs look for.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "food hygiene training expiry UK",
    "how long does a food hygiene certificate last",
    "how long does a food safety certificate last",
    "how long does food hygiene level 2 last",
    "food hygiene refresher training UK",
    "food hygiene training levels UK",
    "who needs level 2 food hygiene",
    "who needs level 3 food hygiene",
    "EHO training records",
    "food hygiene certificate expiry UK",
  ],
  openGraph: {
    type: "article",
    url: CANONICAL,
    title: "Food Hygiene Training Expiry (UK): who needs what level and when",
    description:
      "How long food hygiene certificates last, when refresher training is expected, and what inspectors want to see.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Hygiene Training Expiry (UK): who needs what level and when",
    description:
      "How long food hygiene certificates last, when refresher training is expected, and what inspectors want to see.",
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

const sectorLinks = [
  { href: "/takeaway-food-safety-app", label: "Takeaways" },
  { href: "/cafe-food-safety-app", label: "Cafés" },
  { href: "/restaurant-food-safety-app", label: "Restaurants" },
  { href: "/pub-food-safety-app", label: "Pubs serving food" },
  { href: "/fish-and-chip-shop-food-safety-app", label: "Fish & chip shops" },
  { href: "/mobile-catering-food-safety-app", label: "Mobile caterers" },
];

export default function TrainingExpiryGuide() {
  const published = "2026-03-25";

  return (
    <main className={container}>
      <article className={card}>
        <GuidesAnalytics slug="food-hygiene-training-expiry-uk" />

        <div className="mb-4">
          <BackToGuides />
        </div>

        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={pill}>UK guide</span>
            <span className={pill}>Training</span>
            <span className={pill}>Food hygiene</span>
            <span className={pill}>EHO-ready</span>
          </div>

          <h1 className={h1}>
            Food hygiene training expiry (UK): who needs what level and when
          </h1>

          <p className={lead}>
            One of the most common questions in UK kitchens is:{" "}
            <strong>how long does a food hygiene certificate last?</strong> The
            awkward answer is that food hygiene training does not usually come with
            a single legal expiry date written into law, but inspectors still expect
            staff training to be current, relevant, and appropriate to the role.
          </p>

          <p className={lead}>
            This guide explains <strong>how long food hygiene training is usually treated as valid</strong>,{" "}
            <strong>who typically needs Level 1, Level 2, or Level 3 food hygiene</strong>,{" "}
            <strong>when refresher training should happen</strong>, and{" "}
            <strong>what EHOs expect to see in staff training records</strong>.
          </p>

          <div className="mt-3 text-xs text-slate-500">
            Last updated: <time dateTime={published}>{published}</time>
          </div>
        </header>

        <section>
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-700">
              Stop letting training dates quietly lapse
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">
              Use one system for training records, review dates and refresher visibility
            </h2>
            <p className={p}>
              If your training records still live on paper, in email folders or on
              someone’s mental to-do list, TempTake gives you a cleaner way to track
              who has what level, when it was completed and when refreshers are due.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/demo" className={ctaPrimary}>
                View live demo
              </Link>
              <Link href="/signup" className={ctaSecondary}>
                Start free trial
              </Link>
              <Link href="/food-hygiene-app" className={ctaSecondary}>
                See the software
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className={box}>
            <h2 className="text-base font-extrabold text-slate-900">Quick answer</h2>
            <p className={p}>
              In the UK, food hygiene certificates do not usually have a fixed
              legal expiry date, but businesses are expected to make sure staff are
              supervised and trained or instructed in food hygiene matters
              appropriate to their work. In practice, many businesses refresh food
              hygiene training every <strong>three years</strong>, or sooner if the
              role changes, standards slip, or there has been an incident.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>Does a food hygiene certificate legally expire?</h2>
          <p className={p}>
            This is where a lot of businesses get confused. People often search for
            “food hygiene certificate expiry UK” or “how long does food hygiene
            level 2 last” because they assume there must be a legal cut-off date.
          </p>

          <p className={p}>
            In reality, the more important legal point is that food handlers must
            receive supervision, instruction, and training in food hygiene matters
            that fits the work they actually do. That means training needs to stay
            current enough to reflect the person’s role, your food safety system,
            and the risks in the business.
          </p>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              So the right question is not just “has the certificate expired?” It
              is “is this person still properly trained for the work they are doing
              today?”
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>How long does food hygiene training usually last in practice?</h2>
          <p className={p}>
            Although there is no universal legal expiry date, the common UK
            practice is to treat food hygiene certificates as needing refresh or
            review after around <strong>three years</strong>. Some businesses bring
            staff back sooner, especially where:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>The staff member changes role</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>There has been a food safety incident or near miss</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Standards have slipped and retraining is needed</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>The menu, process, equipment, or risk level has changed</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>A new food safety system or way of working has been introduced</span>
            </li>
          </ul>

          <p className={p}>
            That is why searches like “how long does a food safety certificate
            last” and “does Level 2 food hygiene expire” usually lead back to the
            same answer: not a strict legal expiry, but a strong expectation that
            training should be refreshed before it becomes stale.
          </p>
        </section>

        <section>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Where paper usually breaks down
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">
              The problem is not having certificates. It is staying on top of them.
            </h2>
            <p className={p}>
              Paper training records and loose certificate folders often look fine
              until someone asks who is overdue, who has the right level, or whether
              refreshers were planned properly. Then it becomes guesswork.
            </p>

            <ul className={ul}>
              <li className={li}>
                <span className={dot} />
                <span>Training dates go out of date quietly</span>
              </li>
              <li className={li}>
                <span className={dot} />
                <span>Role changes are not matched with the right training level</span>
              </li>
              <li className={li}>
                <span className={dot} />
                <span>Certificates are stored in different places or missing entirely</span>
              </li>
              <li className={li}>
                <span className={dot} />
                <span>Managers only spot gaps when inspection is close</span>
              </li>
            </ul>

            <p className={p}>
              TempTake is built to fix that by keeping training records, completed
              dates and review dates in one place with better visibility for managers.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/demo" className={ctaPrimary}>
                View live demo
              </Link>
              <Link href="/food-hygiene-app" className={ctaSecondary}>
                See the software
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className={h2}>Common food hygiene training levels in the UK</h2>
          <p className={p}>
            The level of food hygiene training a person needs depends on what they
            actually do. Not everyone in the business needs the same level.
          </p>

          <div className={tableWrap}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Level</th>
                  <th className={th}>Who it usually suits</th>
                  <th className={th}>Typical focus</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={td}>Level 1</td>
                  <td className={td}>People with very basic food handling or support tasks</td>
                  <td className={td}>Basic hygiene awareness and safe behaviour</td>
                </tr>
                <tr>
                  <td className={td}>Level 2</td>
                  <td className={td}>Most food handlers preparing, serving, or handling food</td>
                  <td className={td}>Core food hygiene knowledge for day-to-day food handling</td>
                </tr>
                <tr>
                  <td className={td}>Level 3</td>
                  <td className={td}>Supervisors, team leaders, kitchen managers, senior staff</td>
                  <td className={td}>Supervision, control, monitoring, and stronger food safety understanding</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className={h2}>Who usually needs Level 1 food hygiene?</h2>
          <p className={p}>
            Level 1 food hygiene is generally the starting point for people whose
            contact with food is limited or very basic. In a lot of hospitality
            businesses, this is not the main qualification people are aiming for,
            but it can still be relevant for lower-risk or supporting roles.
          </p>
        </section>

        <section>
          <h2 className={h2}>Who usually needs Level 2 food hygiene?</h2>
          <p className={p}>
            Level 2 food hygiene is the one most operators mean when they ask
            “who needs food hygiene training?” It is the standard level commonly
            expected for food handlers who are preparing, cooking, serving, or
            handling food directly.
          </p>

          <p className={p}>
            In practical terms, if someone is making sandwiches, prepping meat,
            portioning cooked food, serving hot hold items, or working in a normal
            kitchen food handling role, Level 2 is often the appropriate benchmark.
          </p>
        </section>

        <section>
          <h2 className={h2}>Who usually needs Level 3 food hygiene?</h2>
          <p className={p}>
            Level 3 is usually more appropriate for supervisors, managers, and
            people who are responsible for overseeing standards, checking records,
            making decisions about corrective action, and supporting the food safety
            management system.
          </p>

          <p className={p}>
            If someone is supervising others, signing off records, dealing with
            incidents, or leading food safety controls, a stronger level of training
            is often expected.
          </p>
        </section>

        <section>
          <h2 className={h2}>When should refresher training happen?</h2>
          <p className={p}>
            Refresher training should not be treated as a box-ticking date in a
            drawer. It should happen when the person’s competence needs refreshing
            or when the business has changed enough that old training is no longer
            enough.
          </p>

          <p className={p}>Good triggers for refresher training include:</p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>About three years since the last formal training</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>A promotion into a more responsible role</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>New food processes, new hazards, or new menu complexity</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Repeated hygiene issues or failed checks</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>An EHO visit highlights gaps in knowledge or control</span>
            </li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              If you have to ask whether the training is starting to feel out of
              date, it probably is.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>What EHOs and inspectors look for in training records</h2>
          <p className={p}>
            EHOs are not just interested in whether someone has a certificate. They
            want to know whether the people in the business are trained enough for
            the role they are doing right now.
          </p>

          <p className={p}>Training records should help answer questions like:</p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>Who has completed food hygiene training?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>What level was completed?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>When was it completed?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Does the level fit the person’s current role?</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Are refreshers planned or overdue?</span>
            </li>
          </ul>

          <p className={p}>
            Weak records are usually not about the lack of a certificate. They are
            about a lack of control. Missing dates, unknown levels, no refresher
            plan, and no link between role and training all make records look
            shaky.
          </p>
        </section>

        <section>
          <h2 className={h2}>What a good food hygiene training record should include</h2>
          <p className={p}>
            A useful training record is simple, clear, and easy to review. It
            should normally show:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>Staff member name</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Role or job title</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Training course or provider</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Training level</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Date completed</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Review date or refresher due date</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Certificate evidence where available</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>Paper tracking vs digital training tracking</h2>
          <p className={p}>
            Writing expiry dates on paper rotas or staff noticeboards usually
            fails quietly. That is the problem. Nobody notices until a certificate
            is years old, an inspection is due, or someone leaves and the records
            are half missing.
          </p>

          <p className={p}>
            Digital tracking makes it easier to:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>see who has training and who does not</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>track what level each person holds</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>flag upcoming refreshers before they become a problem</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>keep certificates and dates in one place</span>
            </li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              If you still want a manual system, paper can work. If you want a cleaner
              day-to-day process, TempTake is built to make training records easier to
              track, review and keep current.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/templates" className={ctaSecondary}>
                Free templates
              </Link>
              <Link href="/food-hygiene-app" className={ctaPrimary}>
                See the software
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className={h2}>Find the right version of TempTake for your business</h2>
          <p className={p}>
            Different food businesses manage staff training differently. Choose the
            version that matches how your business actually runs.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {sectorLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                {item.label} →
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className={h2}>Useful related pages</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/guides/food-hygiene-temperature-logs-uk"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Food hygiene temperature logs guide
            </Link>
            <Link
              href="/guides/allergen-matrix-uk"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Allergen matrix guide
            </Link>
            <Link
              href="/templates"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Free food safety templates
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              TempTake pricing
            </Link>
          </div>
        </section>

        <section>
          <h2 className={h2}>How TempTake helps</h2>
          <p className={p}>
            TempTake helps you track staff training by person, level, completed
            date, and review date, so food hygiene refreshers do not quietly slip
            past. That makes it easier to stay organised and to show inspectors
            that training is current and role-appropriate.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/demo" className={ctaPrimary}>
              View live demo
            </Link>
            <Link href="/food-hygiene-app" className={ctaSecondary}>
              See the software
            </Link>
            <Link href="/pricing" className={ctaSecondary}>
              Pricing
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}