import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";

const SITE_URL = "https://temptake.com";
const SLUG = "allergen-matrix-uk";
const CANONICAL = `${SITE_URL}/guides/${SLUG}`;

export const metadata: Metadata = {
  title:
    "Allergen Matrix (UK) | How Often to Review It and What Inspectors Expect",
  description:
    "A practical UK guide to allergen matrices: what an allergen matrix should include, how often it should be reviewed, when it must be updated, and what inspectors expect to see.",
  alternates: { canonical: CANONICAL },
  keywords: [
    "allergen matrix UK",
    "allergen matrix template UK",
    "how often should an allergen matrix be reviewed",
    "allergen information requirements UK",
    "food allergen matrix",
    "14 allergens matrix UK",
    "what inspectors expect allergen matrix",
    "allergen review record UK",
    "restaurant allergen matrix UK",
    "takeaway allergen matrix UK",
  ],
  openGraph: {
    type: "article",
    url: CANONICAL,
    title: "Allergen Matrix (UK): how often to review it and what inspectors expect",
    description:
      "What an allergen matrix should include, when it must be updated, and how to prove allergen controls are being reviewed properly.",
    siteName: "TempTake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Allergen Matrix (UK): how often to review it and what inspectors expect",
    description:
      "What an allergen matrix should include, when it must be updated, and how to prove allergen controls are being reviewed properly.",
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

const sectorLinks = [
  { href: "/takeaway-food-safety-app", label: "Takeaways" },
  { href: "/cafe-food-safety-app", label: "Cafés" },
  { href: "/restaurant-food-safety-app", label: "Restaurants" },
  { href: "/pub-food-safety-app", label: "Pubs serving food" },
  { href: "/fish-and-chip-shop-food-safety-app", label: "Fish & chip shops" },
  { href: "/mobile-catering-food-safety-app", label: "Mobile caterers" },
];

export default function AllergenMatrixGuide() {
  const published = "2026-03-25";

  return (
    <main className={container}>
      <article className={card}>
        <GuidesAnalytics slug="allergen-matrix-uk" />

        <div className="mb-4">
          <BackToGuides />
        </div>

        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={pill}>UK guide</span>
            <span className={pill}>Allergens</span>
            <span className={pill}>Compliance</span>
            <span className={pill}>EHO-ready</span>
          </div>

          <h1 className={h1}>
            Allergen matrix (UK): how often to review it and what inspectors expect
          </h1>

          <p className={lead}>
            An allergen matrix is one of the most important food safety documents in a UK food
            business. It is how you show which of the 14 allergens are present in your dishes and
            how you make sure staff can answer allergy questions accurately and consistently.
          </p>

          <p className={lead}>
            This guide explains <strong>what an allergen matrix should include</strong>,{" "}
            <strong>how often it should be reviewed</strong>,{" "}
            <strong>when it must be updated</strong>, and{" "}
            <strong>what EHOs and inspectors expect to see</strong>.
          </p>

          <div className="mt-3 text-xs text-slate-500">
            Last updated: <time dateTime={published}>{published}</time>
          </div>
        </header>

        <section>
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-700">
              Stop relying on outdated allergen sheets
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">
              Use one system for allergen records, review dates and audit trail
            </h2>
            <p className={p}>
              If your allergen matrix still lives in a folder, a spreadsheet or someone’s memory,
              TempTake gives you a cleaner way to keep allergen information current, track reviews
              and show a proper review trail when needed.
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
              In the UK, an allergen matrix should be reviewed whenever your menu, ingredients,
              supplier products, recipes, or preparation process changes. It should also be checked
              routinely even when nothing obvious has changed, so you can prove your allergen
              information is still accurate and current.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>What is an allergen matrix?</h2>
          <p className={p}>
            An allergen matrix is a structured record showing which of the 14 legally recognised
            allergens are present in each menu item, dish, component, or recipe. In practice, it is
            the working document your kitchen and front-of-house team rely on when a customer asks
            whether a food contains milk, eggs, gluten, nuts, sesame, soy, or another allergen.
          </p>

          <p className={p}>
            A good UK food allergen matrix is not vague. It should clearly map menu items against
            allergens and reflect how the food is actually prepared and served in your business.
          </p>
        </section>

        <section>
          <h2 className={h2}>Why an allergen matrix matters</h2>
          <p className={p}>
            Allergy information is a serious safety issue, not just a paperwork issue. If your
            allergen information is outdated, incomplete, or wrong, a customer can be given false
            reassurance and exposed to real harm.
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>It helps staff answer allergen questions accurately.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>It gives managers evidence that allergen controls are being maintained.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>It supports due diligence if an inspector asks how allergen information is controlled.</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>It reduces the risk of relying on memory, guesswork, or out-of-date recipe knowledge.</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>What should an allergen matrix include?</h2>
          <p className={p}>
            There is no single magic format, but most restaurant allergen matrices and takeaway
            allergen matrices should clearly show:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span><strong>Dish or menu item name</strong></span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>The 14 allergens</strong> relevant to the UK rules</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Whether each allergen is present</strong> in the finished item</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Date of review or update</strong></span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Name or initials of the person who reviewed it</strong></span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span><strong>Version control or review notes</strong> if useful</span>
            </li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              The strongest matrices are not just technically correct. They are easy for staff to
              trust and use during a busy shift.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>The 14 allergens recognised in UK food law</h2>
          <p className={p}>
            Your allergen matrix should be built around the 14 allergens recognised in UK food
            information rules. These are:
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Celery",
              "Cereals containing gluten",
              "Crustaceans",
              "Eggs",
              "Fish",
              "Lupin",
              "Milk",
              "Molluscs",
              "Mustard",
              "Peanuts",
              "Sesame",
              "Soybeans",
              "Sulphur dioxide / sulphites",
              "Tree nuts",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>

          <p className={p}>
            The exact way you present them can vary, but they need to be covered clearly and
            consistently.
          </p>
        </section>

        <section>
          <h2 className={h2}>How often should an allergen matrix be reviewed?</h2>
          <p className={p}>
            This is one of the most common questions, and the honest answer is simple:{" "}
            <strong>an allergen matrix must be reviewed whenever the information could have changed</strong>.
          </p>

          <p className={p}>That usually means reviewing it:</p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>Whenever the menu changes</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>When ingredients change</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>When a supplier changes product or specification</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>When a recipe, garnish, sauce, or preparation method changes</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>After an allergen-related complaint, incident, or near miss</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>At regular review intervals even if nothing obvious has changed</span>
            </li>
          </ul>

          <p className={p}>
            Inspectors do not usually want to see a matrix created once and ignored forever. They
            expect to see evidence that allergen information is being kept live.
          </p>
        </section>

        <section>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Where paper usually breaks down
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">
              The problem is not the matrix itself. It is keeping it live.
            </h2>
            <p className={p}>
              Paper allergen matrices often start off correct and then quietly drift. A sauce
              changes, a supplier swaps product, a garnish gets added, a special goes on the board,
              and nobody updates the document properly.
            </p>
            <ul className={ul}>
              <li className={li}>
                <span className={dot} />
                <span>Reviews get missed because nobody owns them clearly</span>
              </li>
              <li className={li}>
                <span className={dot} />
                <span>Supplier and ingredient changes are not reflected fast enough</span>
              </li>
              <li className={li}>
                <span className={dot} />
                <span>Front-of-house stops trusting the document</span>
              </li>
              <li className={li}>
                <span className={dot} />
                <span>The review trail looks weak during inspection</span>
              </li>
            </ul>
            <p className={p}>
              TempTake is built to fix that by keeping allergen records visible, reviewable and
              easier to keep current instead of hoping the folder version is still right.
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
          <h2 className={h2}>When should you update it immediately?</h2>
          <p className={p}>
            Some situations should trigger an immediate allergen review rather than waiting for a
            scheduled check. For example:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>A new dressing, marinade, sauce, batter, breadcrumb, topping, or garnish is added</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>A supplier swaps one brand or product for another</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>A pre-packed ingredient arrives with a changed allergen declaration</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>A recipe is changed to save cost, improve taste, or deal with stock shortages</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Cross-contact risk changes because of new prep methods, storage, or service setup</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>What inspectors and EHOs expect to see</h2>
          <p className={p}>
            Inspectors are not just checking that a matrix exists. They want to know whether your
            allergen information is reliable in practice.
          </p>

          <p className={p}>They are likely to look for evidence that:</p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>The matrix covers the current menu, not an old version</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Reviews are being recorded with dates or version history</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Kitchen and front-of-house staff know how to use it</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Staff do not guess when asked allergen questions</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>The allergen matrix matches actual ingredients in use</span>
            </li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              A matrix that sits in a folder but is not trusted by staff is weaker than a simpler
              matrix that is reviewed properly and actually used.
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>Common allergen matrix failures</h2>
          <p className={p}>
            These are some of the most common reasons allergen documentation looks weak during
            inspection:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>The matrix exists but has not been reviewed in months</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Supplier or ingredient changes have not been reflected</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Front-of-house staff do not trust the document and ask kitchen staff verbally instead</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>There is no record of when it was last checked</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Specials, seasonal items, or amended dishes are missing</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>The matrix is too vague to be useful during service</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>How to prove your allergen matrix is being reviewed properly</h2>
          <p className={p}>
            The easiest way to prove control is not just having the matrix itself. It is having a
            visible review trail.
          </p>

          <p className={p}>That can include:</p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>Last reviewed date</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Name or initials of the reviewer</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Notes showing what changed</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Version history if you make frequent updates</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>Scheduled review reminders so checks do not quietly expire</span>
            </li>
          </ul>

          <div className={box}>
            <h3 className="text-base font-bold text-slate-900">Example review note</h3>
            <p className="mt-2 text-sm text-slate-700 leading-7">
              “Reviewed 25/03/2026 after supplier changed mayonnaise brand on burger sauce. Matrix
              updated for egg and mustard confirmation. WS”
            </p>
          </div>
        </section>

        <section>
          <h2 className={h2}>Paper allergen matrix vs digital allergen records</h2>
          <p className={p}>
            Paper allergen matrices can work, but they are easy to forget, fail to update, or leave
            sitting in a folder while the menu moves on. A digital system makes it easier to:
          </p>

          <ul className={ul}>
            <li className={li}>
              <span className={dot} />
              <span>record when allergen information was last reviewed</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>flag when another review is due</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>keep current allergen records visible to the right people</span>
            </li>
            <li className={li}>
              <span className={dot} />
              <span>reduce the risk of outdated information hanging around unnoticed</span>
            </li>
          </ul>

          <div className={box}>
            <p className="text-sm text-slate-700 leading-7">
              If you still want a manual system, paper can work. If you want a cleaner day-to-day
              process, TempTake is built to make allergen reviews easier to track and easier to show.
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
            Different food businesses handle allergen information differently. Choose the version
            that matches how your kitchen actually works.
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
              href="/guides/safer-food-better-business-logs"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Safer Food Better Business logs guide
            </Link>
            <Link
              href="/guides/food-hygiene-temperature-logs-uk"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Food hygiene temperature logs guide
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
            TempTake records when allergen information was last reviewed and flags when it is due
            again, so reviews do not quietly expire. That makes it easier to keep allergen records
            current instead of relying on memory and hoping the menu has not drifted.
          </p>

          <p className={p}>
            If you want a cleaner way to manage allergen reviews and show a review trail, TempTake
            is built to make that process easier for real kitchens.
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