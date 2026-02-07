"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const CARD =
  "rounded-3xl border border-slate-200 bg-white/80 shadow-xl p-4 md:p-5 backdrop-blur-sm";

type HelpSectionProps = {
  id: string;
  title: string;
  icon: string;
  intro: string;
  bullets: string[];
  imageSrc?: string;
  keywords?: string[];
};

function cls(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, q }: { text: string; q: string }) {
  const query = q.trim();
  if (!query) return <>{text}</>;

  const re = new RegExp(`(${escapeRegExp(query)})`, "ig");
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, idx) => {
        const match = part.toLowerCase() === query.toLowerCase();
        return match ? (
          <mark
            key={idx}
            className="rounded bg-amber-200/70 px-1 py-0.5 text-slate-900"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        );
      })}
    </>
  );
}

/**
 * Help section:
 * - No accordion. Everything is visible.
 * - When searching: shows a "Filtered matches" list at the top + the full list below.
 */
function HelpSection({
  id,
  title,
  icon,
  intro,
  bullets,
  imageSrc,
  keywords = [],
  query,
}: HelpSectionProps & { query: string }) {
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return bullets.map((b) => ({ b, match: false }));
    return bullets.map((b) => ({ b, match: b.toLowerCase().includes(q) }));
  }, [bullets, q]);

  const matchedBullets = useMemo(() => {
    if (!q) return [];
    return matches.filter((m) => m.match).map((m) => m.b);
  }, [matches, q]);

  const matchedCount = matchedBullets.length;

  const showFilteredBlock = q.length > 0;

  return (
    <section id={id} className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="text-xl">{icon}</span>
            <span className="truncate">
              <Highlight text={title} q={query} />
            </span>
          </h2>

          <p className="text-sm text-slate-700">
            <Highlight text={intro} q={query} />
          </p>

          {showFilteredBlock && (
            <div className="text-xs text-slate-500">
              {matchedCount > 0
                ? `${matchedCount} matching point${matchedCount === 1 ? "" : "s"}`
                : "No direct bullet matches (but the section may still be relevant)."}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <span
            className={cls(
              "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
              "border-slate-200 bg-slate-50 text-slate-700"
            )}
            title="Always expanded"
          >
            Info
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr,224px]">
        {/* Text column */}
        <div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          {/* Filtered matches (only when searching) */}
          {showFilteredBlock && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                Filtered matches
              </div>

              {matchedBullets.length === 0 ? (
                <div className="mt-1 text-sm text-slate-700">
                  No bullet points matched your search.
                </div>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {matchedBullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>
                        <Highlight text={b} q={query} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Full bullets always visible */}
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Full guidance
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <Highlight text={b} q={query} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Light hint block */}
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-700">
            <span className="font-semibold">Tip:</span>{" "}
            <Highlight
              text="Keep this page as a reference. If staff are confused, your setup is probably unclear."
              q={query}
            />
          </div>
        </div>

        {/* Image column */}
        {imageSrc ? (
          <div className="space-y-2">
            <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 md:h-44 md:w-56">
              <Image
                src={imageSrc}
                alt={title}
                fill
                className="object-cover"
                sizes="224px"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Screenshot example for <span className="font-semibold">{title}</span>.
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Small “step card” blocks without changing overall UI style */
function StepCard({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
      <div className="space-y-1">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <div className="text-sm text-slate-700">{subtitle}</div>
      </div>
      <ol className="mt-3 space-y-2 text-sm text-slate-700">
        {steps.map((s, idx) => (
          <li key={s} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-800">
              {idx + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MiniCallout({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
        {items.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- FAQ (Troubleshooting) ---------- */

type FaqItem = {
  id: string;
  q: string;
  a: string[];
  tags: string[];
};

function FaqSection({ query }: { query: string }) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [tag, setTag] = useState<string>("All");

  const faqs: FaqItem[] = [
    {
      id: "faq-initials-missing",
      q: "Initials are missing in dropdowns. Where did they go?",
      a: [
        "Go to Team and confirm the staff member exists and has initials set.",
        "Use uppercase initials and avoid dots (use WS not W.S.).",
        "If you have duplicates, fix them. The app can’t guess which ‘AA’ you meant.",
        "Refresh the page after changes if the list doesn’t update instantly.",
      ],
      tags: ["Team", "Initials", "Setup"],
    },
    {
      id: "faq-duplicate-initials",
      q: "We’ve got duplicate initials. What’s the correct approach?",
      a: [
        "Initials must be unique per person. Pick a consistent scheme (e.g. WS, WSP, WS1).",
        "Keep them uppercase and no punctuation.",
        "Remove old/leaver records from Team so the list stays clean.",
      ],
      tags: ["Team", "Initials"],
    },
    {
      id: "faq-wrong-location",
      q: "Logs are showing under the wrong location. How do we fix it?",
      a: [
        "Check the selected location on Dashboard before logging (it’s sticky per session).",
        "If you run multiple venues, standardise naming so staff can’t confuse them.",
        "Manager tip: set a default location in Settings to reduce wrong-location entries.",
      ],
      tags: ["Locations", "Settings"],
    },
    {
      id: "faq-routines-ignored",
      q: "Staff aren’t using routines. They keep typing random temperatures.",
      a: [
        "Your routine probably doesn’t match real checks. Rename items to match equipment/areas staff recognise.",
        "Keep routines short and obvious. People won’t scroll a 40-item checklist mid-shift.",
        "Make routines the default expectation: ‘temps = routines’. No exceptions.",
      ],
      tags: ["Routines", "Temps", "Operations"],
    },
    {
      id: "faq-temps-failing",
      q: "Temperatures are failing. What’s the ‘correct’ workflow?",
      a: [
        "Record the fail, take corrective action immediately, and re-check.",
        "If fails repeat: it’s usually equipment, loading, door discipline, or hot-hold practice. Fix the process.",
        "Use reports weekly to spot patterns by area/equipment.",
      ],
      tags: ["Temps", "Reports", "Operations"],
    },
    {
      id: "faq-cleaning-not-done",
      q: "Cleaning rota tasks aren’t being completed. What usually fixes it?",
      a: [
        "Reduce daily tasks to what’s realistic. Push deep cleans into weekly/monthly.",
        "Rewrite vague tasks into clear actions (what/where/how).",
        "Assign ownership by shift (opening vs close).",
        "Managers: spot-check weekly/monthly tasks. Otherwise they quietly rot.",
      ],
      tags: ["Cleaning", "Operations"],
    },
    {
      id: "faq-allergens-not-trusted",
      q: "Front-of-house doesn’t trust the allergen matrix. How do we make it reliable?",
      a: [
        "Set a review cadence you actually follow (monthly is common).",
        "Assign one owner responsible for updates when recipes/suppliers change.",
        "After any menu change, update allergens immediately then mark reviewed.",
      ],
      tags: ["Allergens", "Reviews", "Operations"],
    },
    {
      id: "faq-reports-missing",
      q: "Reports are missing data. What’s the usual reason?",
      a: [
        "Wrong filters: check date range and selected location first.",
        "Data logged under the wrong location won’t appear where you expect.",
        "If you have multiple sites, confirm staff are not switching locations mid-day.",
      ],
      tags: ["Reports", "Locations"],
    },
    {
      id: "faq-billing-past-due",
      q: "Billing is past due. What happens and what do we do?",
      a: [
        "Update payment method in the Stripe billing portal ASAP.",
        "If you’re locked out of features, it’s because the subscription status is limiting access.",
        "Don’t leave this until you need reports for an inspection. That’s… a choice.",
      ],
      tags: ["Billing"],
    },
  ];

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const f of faqs) for (const t of f.tags) s.add(t);
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [faqs]);

  const q = query.trim().toLowerCase();

  const filteredFaqs = useMemo(() => {
    return faqs.filter((f) => {
      const tagHit = tag === "All" ? true : f.tags.includes(tag);
      if (!tagHit) return false;

      if (!q) return true;

      const inQ = f.q.toLowerCase().includes(q);
      const inA = f.a.some((x) => x.toLowerCase().includes(q));
      const inTags = f.tags.some((t) => t.toLowerCase().includes(q));
      return inQ || inA || inTags;
    });
  }, [faqs, q, tag]);

  useEffect(() => {
    if (openFaqId && !filteredFaqs.some((f) => f.id === openFaqId)) {
      setOpenFaqId(null);
    }
  }, [filteredFaqs, openFaqId]);

  return (
    <section id="troubleshooting" className={CARD}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="text-xl">🛠️</span>
            <span>
              <Highlight text="Troubleshooting FAQs" q={query} />
            </span>
          </h2>
          <p className="text-sm text-slate-700">
            <Highlight
              text="Short answers, clear fixes. No one has time for essays mid-shift."
              q={query}
            />
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cls(
                "rounded-full border px-3 py-1 shadow-sm",
                tag === t
                  ? "border-slate-400 bg-slate-900/5 text-slate-900 font-semibold"
                  : "border-slate-300 bg-white/80 text-slate-800 hover:bg-slate-50"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
            No FAQ matches your search/tag. Try: initials, reports, allergens,
            routines, location.
          </div>
        ) : (
          filteredFaqs.map((f) => {
            const open = openFaqId === f.id;
            return (
              <div
                key={f.id}
                className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId((cur) => (cur === f.id ? null : f.id))}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={open}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      <Highlight text={f.q} q={query} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {f.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-slate-300 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                    {open ? "Hide" : "Open"}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-slate-200 px-4 py-3">
                    <ul className="space-y-2 text-sm text-slate-700">
                      {f.a.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span>
                            <Highlight text={line} q={query} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

type HelpSectionData = HelpSectionProps & {
  navLabel: string;
};

export default function HelpPage() {
  const navItems: Array<[string, string]> = [
    ["setup", "First-time setup"],
    ["day1", "Day 1 workflow"],
    ["dashboard", "Dashboard"],
    ["routines", "Routines"],
    ["allergens", "Allergens"],
    ["cleaning", "Cleaning rota"],
    ["team", "Team"],
    ["locations", "Locations"],
    ["suppliers", "Suppliers"],
    ["reports", "Reports"],
    ["billing", "Billing"],
    ["settings", "Settings"],
    ["troubleshooting", "Troubleshooting"],
    ["glossary", "Glossary"],
  ];

  const sections: HelpSectionData[] = [
    {
      id: "dashboard",
      navLabel: "Dashboard",
      title: "Dashboard",
      icon: "📊",
      intro: "Snapshot of how your business is performing.",
      bullets: [
        "Shift start: check for overdue temps, incomplete cleaning, expired training, overdue allergen review.",
        "Shift end: confirm today’s temps + cleaning are complete for the selected location.",
        "Treat failures as action items: fix, record corrective action, re-check.",
        "If the dashboard is green, you’re inspection-ready. If it’s red, you’re rolling the dice.",
        "Managers: use it as your daily compliance checklist, not a nice-to-have.",
      ],
      imageSrc: "/help/dashboard.jpg",
      keywords: ["overdue", "alerts", "kpi", "compliance", "checklist"],
    },
    {
      id: "routines",
      navLabel: "Routines",
      title: "Routines",
      icon: "⏱️",
      intro: "Pre-built temp checks. Less thinking, fewer mistakes, better audit trail.",
      bullets: [
        "Create routines that match real checks: fridges/freezers, deliveries, cooking, hot holding, cooling.",
        "Name clearly: ‘Walk-in fridge – RTE shelf’, not ‘Fridge 1’ if you have five of them.",
        "Set targets that match your policy/SFBB controls.",
        "If staff keep failing temps, fix the process (equipment, loading, door discipline) not the logging.",
        "Review routines when equipment/menu changes or quarterly.",
        "Multi-site: keep naming consistent across locations so reporting stays clean.",
      ],
      imageSrc: "/help/routines.jpg",
      keywords: ["temperature", "targets", "fridge", "freezer", "hot holding"],
    },
    {
      id: "allergens",
      navLabel: "Allergens",
      title: "Allergens",
      icon: "⚠️",
      intro: "Keeping allergy info up-to-date and customers safe.",
      bullets: [
        "Record allergens per menu item so FOH can answer quickly and consistently.",
        "Use consistent item names (avoid duplicates like ‘Chips’ vs ‘Fries’ unless they’re different).",
        "Use ‘safe food’ search to find items that exclude selected allergens.",
        "Set a review interval you’ll actually follow (monthly is common).",
        "Mark as reviewed to create an audit trail you maintain the matrix.",
        "When recipes/suppliers change, update allergens immediately then re-review.",
      ],
      imageSrc: "/help/allergens.jpg",
      keywords: ["matrix", "review", "safe food", "menu", "EHO"],
    },
    {
      id: "cleaning",
      navLabel: "Cleaning rota",
      title: "Cleaning rota",
      icon: "🧽",
      intro: "Checking and recording cleaning tasks.",
      bullets: [
        "Create tasks by shift/category: Opening, Mid, Close, FOH, Weekly, Monthly.",
        "Keep daily tasks realistic. Weekly/monthly cover deep cleans.",
        "Complete tasks as they’re done. End-of-day mass ticking is obvious and useless.",
        "Initials matter: it proves accountability and training gaps.",
        "If tasks aren’t being done: reduce volume, improve clarity, enforce expectations.",
        "Managers: spot-check weekly/monthly tasks. Otherwise they quietly drift incomplete.",
      ],
      imageSrc: "/help/cleaning.jpg",
      keywords: ["rota", "tasks", "daily", "weekly", "monthly"],
    },
    {
      id: "team",
      navLabel: "Team",
      title: "Team",
      icon: "👥",
      intro: "Initials, accountability, and training status live here.",
      bullets: [
        "Add every staff member who logs temps or completes cleaning tasks.",
        "Initials are the signature across the app. Keep them unique and consistent (no dots).",
        "Track training expiry so you don’t discover you’re non-compliant during an inspection.",
        "Clean up leavers monthly so your initials list stays usable.",
        "If initials don’t show up elsewhere: the user isn’t added, or initials are blank/duplicated.",
      ],
      imageSrc: "/help/team.jpg",
      keywords: ["initials", "training", "expiry", "staff", "signature"],
    },
    {
      id: "locations",
      navLabel: "Locations",
      title: "Locations",
      icon: "📍",
      intro: "Multi site - setup each location here.",
      bullets: [
        "Single-site: one clear location name is fine.",
        "Multi-site: use one location per venue so reports don’t blend operations.",
        "If staff log to the wrong location, your audit trail becomes messy fast.",
        "Location limits depend on your subscription band.",
        "Standardise names across sites to keep reporting clean.",
      ],
      imageSrc: "/help/locations.jpg",
      keywords: ["site", "venue", "multi-site", "reporting"],
    },
    {
      id: "suppliers",
      navLabel: "Suppliers",
      title: "Suppliers",
      icon: "🚚",
      intro: "Traceability and due diligence when something goes wrong.",
      bullets: [
        "Record supplier name + contact details + product categories supplied.",
        "Use notes for ordering rules: cut-off times, delivery days, minimum order.",
        "Useful for delivery disputes, recalls, and sourcing questions.",
      ],
      imageSrc: "/help/suppliers.jpg",
      keywords: ["traceability", "recall", "contact", "deliveries"],
    },
    {
      id: "reports",
      navLabel: "Reports",
      title: "Reports",
      icon: "📑",
      intro: "Turns daily logging into inspection-ready evidence.",
      bullets: [
        "Generate a report for a date range and location to show temps + cleaning + training evidence.",
        "Use filters to answer targeted questions quickly (equipment, staff initials, date range).",
        "Weekly reports help spot patterns: repeat failures, missed checks, weak shifts.",
        "If you can’t prove it, it doesn’t count. Reports are your proof pack.",
      ],
      imageSrc: "/help/reports.jpg",
      keywords: ["audit", "export", "pdf", "evidence", "inspection"],
    },
    {
      id: "billing",
      navLabel: "Billing",
      title: "Billing & subscription",
      icon: "💳",
      intro: "Check and update your subscription status.",
      bullets: [
        "Check plan status: trial, active, past due.",
        "Upgrade band to unlock more locations where applicable.",
        "Use Stripe billing portal for invoices + payment method changes.",
        "Fix ‘past due’ early, not when you need access urgently.",
      ],
      imageSrc: "/help/billing.jpg",
      keywords: ["stripe", "invoices", "plan", "trial", "upgrade"],
    },
    {
      id: "settings",
      navLabel: "Settings",
      title: "Settings",
      icon: "⚙️",
      intro: "Organisation-level config. Set once, adjust when reality changes.",
      bullets: [
        "Set organisation name so staff know they’re in the correct account.",
        "Set default location to reduce wrong-location logging.",
        "More workflow controls will land here over time.",
      ],
      imageSrc: "/help/settings.jpg",
      keywords: ["organisation", "defaults", "config"],
    },
    {
      id: "glossary",
      navLabel: "Glossary",
      title: "Glossary",
      icon: "📚",
      intro: "Short definitions so staff don’t interpret things creatively.",
      bullets: [
        "Initials: staff signature used to attribute temps/cleaning/sign-offs.",
        "Routine: pre-built checklist of temp checks (items + targets).",
        "Target range: acceptable temperature range used for pass/fail.",
        "Pass/Fail: whether a logged temp meets the target range.",
        "Review interval: how often allergens should be confirmed and marked reviewed.",
        "Audit trail: dated evidence of what was done, when, and by whom.",
      ],
      keywords: ["definitions", "terms", "audit"],
    },
  ];

  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;

    return sections.filter((s) => {
      const hitTitle =
        s.title.toLowerCase().includes(q) || s.intro.toLowerCase().includes(q);
      const hitKeywords = (s.keywords ?? []).some((k) => k.toLowerCase().includes(q));
      const hitBullets = s.bullets.some((b) => b.toLowerCase().includes(q));
      return hitTitle || hitKeywords || hitBullets;
    });
  }, [query, sections]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-900">
      {/* Page header */}
      <header className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm md:p-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            Help &amp; Setup Guide
          </h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Built for scanning. Find the section, grab the answer, move on.
          </p>
        </div>

        {/* Search */}
        <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-center">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search… e.g. ‘initials’, ‘reports’, ‘allergens’, ‘fail temp’, ‘wrong location’"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white/80 px-4 pr-10 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400"
            />
            {query.trim() ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                aria-label="Clear search"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="text-xs text-slate-500">
            {query.trim()
              ? "Search filters sections + FAQs"
              : "Tip: search is faster than scrolling."}
          </div>
        </div>

        {/* Sticky nav */}
        <nav className="sticky top-2 z-10 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap gap-2 text-xs">
            {navItems.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {/* Quick actions */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniCallout
          title="Quick actions"
          items={[
            "Missing initials? Team → set initials → refresh.",
            "Temp fail? Corrective action + re-check immediately.",
            "Need evidence? Reports → date range + location → export.",
          ]}
        />
        <MiniCallout
          title="Manager defaults"
          items={[
            "Dashboard twice daily (open + close).",
            "Allergen review on a fixed cadence (monthly).",
            "Training expiry check weekly (it always sneaks up).",
          ]}
        />
        <MiniCallout
          title="If you’re setting up today"
          items={[
            "Add locations + team first (otherwise dropdowns are empty).",
            "Create routines that match real checks.",
            "Keep daily cleaning realistic. Deep cleans weekly/monthly.",
          ]}
        />
      </section>

      {/* FIRST TIME SETUP */}
      <section id="setup" className="space-y-4">
        <StepCard
          title="First-time setup (do this once)"
          subtitle="This sequence prevents most later pain."
          steps={[
            "Create account and sign in (use a manager/admin login).",
            "Set organisation name in Settings.",
            "Create Location(s) so all logs are tied to a real site.",
            "Add Team members (name + unique initials).",
            "Build Temperature Routines (fridges/freezers, cooking, hot holding, deliveries).",
            "Set up Cleaning rota tasks (daily/weekly/monthly). Keep daily realistic.",
            "Create/import Allergen matrix, set review interval, mark reviewed.",
            "Run a test day and generate a report to confirm everything appears correctly.",
          ]}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MiniCallout
            title="What good setup looks like"
            items={[
              "Routines match real checks staff already do.",
              "Initials are unique and consistent (uppercase, no dots).",
              "Daily cleaning is achievable. Deep cleans live in weekly/monthly.",
              "Allergen matrix is maintained and reviewable.",
            ]}
          />
          <MiniCallout
            title="Common mistakes"
            items={[
              "No routines, then staff freestyle targets.",
              "Team not added first, then nothing shows in dropdowns.",
              "50 daily cleaning tasks and zero completions.",
              "Allergen matrix not reviewed, no proof it’s maintained.",
            ]}
          />
        </div>
      </section>

      {/* DAY 1 */}
      <section id="day1" className="space-y-4">
        <StepCard
          title="Day 1 workflow (what staff actually do)"
          subtitle="This is the minimum viable rhythm."
          steps={[
            "Start of shift: open Dashboard, deal with anything overdue/failing first.",
            "Log temps using Routines (fridges/freezers first, then service checks).",
            "If a temp fails: corrective action + re-check immediately.",
            "Complete cleaning tasks as you go (timestamps matter).",
            "Before close: Dashboard check that today is complete for this location.",
            "Managers: weekly review training expiry + allergen review status.",
          ]}
        />
      </section>

      {/* Help sections (filtered) */}
      <div className="space-y-4">
        {filteredSections.map((s) => (
          <HelpSection key={s.id} {...s} query={query} />
        ))}
      </div>

      {/* TROUBLESHOOTING as FAQs */}
      <FaqSection query={query} />

      {/* Footer */}
      <footer className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <div>
          Need more help or want to suggest a feature?{" "}
          <Link href="mailto:info@temptake.com" className="underline">
            Contact support
          </Link>{" "}
          or speak to your manager.
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
