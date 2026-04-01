"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  SAFE_PRACTICES,
  type SafePracticeCategory,
  type SafePracticeItem,
  getRelatedSafePractices,
  getSafePracticeById,
  getSuggestedSafePracticesForPath,
  searchSafePractices,
  SAFE_PRACTICE_CATEGORY_LABELS,
} from "@/lib/safePractices";

type SafePracticesHelpDrawerProps = {
  open: boolean;
  onClose: () => void;
  pathname?: string;
  initialQuery?: string;
  title?: string;
};

const KEY_SUBJECTS = [
  "Handwashing",
  "Cleaning chemicals",
  "Rodents",
  "Allergens",
  "Hot holding",
  "Defrosting chicken",
] as const;

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function severityTone(severity?: SafePracticeItem["severity"]) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function severityLabel(severity?: SafePracticeItem["severity"]) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Important";
    default:
      return "Guide";
  }
}

function Section({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}-${item}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SafePracticeCompactCard({
  item,
  active,
  onClick,
}: {
  item: SafePracticeItem;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "w-full rounded-xl border px-3 py-3 text-left transition",
        "hover:border-slate-300 hover:bg-slate-50",
        active
          ? "border-slate-900 bg-slate-50 shadow-sm"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {item.title}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {SAFE_PRACTICE_CATEGORY_LABELS[item.category]}
          </div>
        </div>

        <span
          className={classNames(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            severityTone(item.severity)
          )}
        >
          {severityLabel(item.severity)}
        </span>
      </div>
    </button>
  );
}

function SelectedGuidePanel({
  item,
  onSelectPrev,
  onSelectNext,
  hasPrev,
  hasNext,
}: {
  item: SafePracticeItem | null;
  onSelectPrev: () => void;
  onSelectNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const relatedItems = useMemo(() => {
    if (!item) return [];
    return getRelatedSafePractices(item.id, 4);
  }, [item]);

  if (!item) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Select a guide to view it.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {SAFE_PRACTICE_CATEGORY_LABELS[item.category]}
            </span>

            <span
              className={classNames(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                severityTone(item.severity)
              )}
            >
              {severityLabel(item.severity)}
            </span>

            {item.sourceLabel ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                {item.sourceLabel}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectPrev}
              disabled={!hasPrev}
              className={classNames(
                "rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                hasPrev
                  ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
              )}
            >
              Previous
            </button>

            <button
              type="button"
              onClick={onSelectNext}
              disabled={!hasNext}
              className={classNames(
                "rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                hasNext
                  ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
              )}
            >
              Next
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {item.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {item.summary}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Why this matters
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {item.whyItMatters}
          </p>
        </div>

        <Section title="Safety points" items={item.safetyPoints} />
        <Section title="Checks" items={item.checks} />
        <Section title="What to do if things go wrong" items={item.whatToDoIfWrong} />
        <Section title="How to stop it happening again" items={item.prevention} />

        {relatedItems.length ? (
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Related guidance
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {relatedItems.map((related) => (
                <div
                  key={related.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {related.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {SAFE_PRACTICE_CATEGORY_LABELS[related.category]}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {related.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function SafePracticesHelpDrawer({
  open,
  onClose,
  pathname = "",
  initialQuery = "",
  title = "Safe practices help",
}: SafePracticesHelpDrawerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] =
    useState<SafePracticeCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [browseAll, setBrowseAll] = useState(false);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const suggested = getSuggestedSafePracticesForPath(pathname);
    const fallback = suggested[0]?.id ?? SAFE_PRACTICES[0]?.id ?? null;
    setSelectedId((current) => current ?? fallback);
  }, [open, pathname]);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
  }, [initialQuery, open]);

  const suggestedForPath = useMemo(
    () => getSuggestedSafePracticesForPath(pathname),
    [pathname]
  );

  const filteredItems = useMemo(() => {
    const searched = query.trim() ? searchSafePractices(query) : SAFE_PRACTICES;

    if (selectedCategory === "all") return searched;
    return searched.filter((item) => item.category === selectedCategory);
  }, [query, selectedCategory]);

  useEffect(() => {
    if (!filteredItems.length) return;

    const selectedStillVisible = filteredItems.some((item) => item.id === selectedId);
    if (!selectedStillVisible) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return filteredItems[0] ?? suggestedForPath[0] ?? null;
    return getSafePracticeById(selectedId) ?? filteredItems[0] ?? suggestedForPath[0] ?? null;
  }, [filteredItems, selectedId, suggestedForPath]);

  const guidePool = useMemo(() => {
    if (!query.trim() && selectedCategory === "all" && !browseAll) {
      return suggestedForPath;
    }
    return filteredItems;
  }, [browseAll, filteredItems, query, selectedCategory, suggestedForPath]);

  const allMobileGuides = useMemo(() => {
    return SAFE_PRACTICES;
  }, []);

  const visibleGuideCards = useMemo(() => {
    return guidePool.slice(0, 3);
  }, [guidePool]);

  const selectedIndex = useMemo(() => {
    if (!selectedItem) return -1;
    return guidePool.findIndex((item) => item.id === selectedItem.id);
  }, [guidePool, selectedItem]);

  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < guidePool.length - 1;

  const handleSelectItem = (item: SafePracticeItem) => {
    setSelectedId(item.id);

    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const handleQuickSearch = (value: string) => {
    setQuery(value);
    setSelectedCategory("all");
    setBrowseAll(true);

    const results = searchSafePractices(value);
    if (results[0]) {
      setSelectedId(results[0].id);
    }
  };

  const handleSelectPrev = () => {
    if (!hasPrev) return;
    const prev = guidePool[selectedIndex - 1];
    if (prev) handleSelectItem(prev);
  };

  const handleSelectNext = () => {
    if (!hasNext) return;
    const next = guidePool[selectedIndex + 1];
    if (next) handleSelectItem(next);
  };

  const handleShowAllGuides = () => {
    setBrowseAll(true);

    if (!selectedItem && filteredItems[0]) {
      setSelectedId(filteredItems[0].id);
    }
  };

  const handleShowSuggested = () => {
    setBrowseAll(false);

    if (suggestedForPath[0]) {
      setSelectedId(suggestedForPath[0].id);
    }
  };

  const selectedMobileGuideId = selectedItem?.id ?? "";

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[65] bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-y-0 right-0 z-[70] h-screen w-full border-l border-slate-200 bg-white shadow-2xl sm:w-[430px] md:w-[560px] lg:w-[680px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Help guide
                    </div>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Practical food safety guidance, without the paperwork mountain.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                {/* Mobile-only: one dropdown only */}
                <div className="mt-3 sm:hidden">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Guide
                  </label>
                  <select
                    value={selectedMobileGuideId}
                    onChange={(e) => {
                      const next = getSafePracticeById(e.target.value);
                      if (next) handleSelectItem(next);
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-4 text-sm text-slate-900 outline-none focus:border-slate-900"
                  >
                    {allMobileGuides.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desktop kept as before */}
                <div className="mt-3 hidden sm:block">
                  <label htmlFor="safe-practices-search" className="sr-only">
                    Search safe practices
                  </label>
                  <input
                    id="safe-practices-search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setBrowseAll(true);
                    }}
                    placeholder="Search safe practices, e.g. rodents, chemicals, allergen order, hot holding"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
                  {KEY_SUBJECTS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleQuickSearch(chip)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setBrowseAll(false);
                    }}
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === "all" && !browseAll
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    Suggested
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setBrowseAll(true);
                    }}
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === "all" && browseAll
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    Browse all
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("personal_hygiene");
                      setBrowseAll(true);
                    }}
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === "personal_hygiene"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    Hygiene
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("cleaning");
                      setBrowseAll(true);
                    }}
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === "cleaning"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    Cleaning
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("allergens");
                      setBrowseAll(true);
                    }}
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === "allergens"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    Allergens
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("cooking");
                      setBrowseAll(true);
                    }}
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === "cooking"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    Cooking
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("pest_control");
                      setBrowseAll(true);
                    }}
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === "pest_control"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    Pests
                  </button>
                </div>
              </div>

              {/* Desktop-only guide chooser section */}
              <div className="hidden min-h-0 flex-1 flex-col sm:flex">
                <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {browseAll || query.trim() || selectedCategory !== "all"
                        ? "Guides"
                        : "Suggested for this page"}
                    </h3>

                    {!browseAll && !query.trim() && selectedCategory === "all" ? (
                      <span className="truncate text-xs text-slate-400">{pathname}</span>
                    ) : (
                      <span className="text-xs text-slate-400">{guidePool.length} total</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {visibleGuideCards.map((item) => (
                      <SafePracticeCompactCard
                        key={item.id}
                        item={item}
                        active={selectedItem?.id === item.id}
                        onClick={() => handleSelectItem(item)}
                      />
                    ))}
                  </div>

                  {guidePool.length > 3 ? (
                    <div className="mt-3 flex items-center gap-3">
                      {!browseAll && !query.trim() && selectedCategory === "all" ? (
                        <button
                          type="button"
                          onClick={handleShowAllGuides}
                          className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                        >
                          View all guides
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleShowSuggested}
                          className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                        >
                          Back to suggested
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                <div
                  ref={detailScrollRef}
                  className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-3 sm:px-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Selected guide
                    </h3>

                    <SelectedGuidePanel
                      item={selectedItem}
                      onSelectPrev={handleSelectPrev}
                      onSelectNext={handleSelectNext}
                      hasPrev={hasPrev}
                      hasNext={hasNext}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile-only: maximise guide content area */}
              <div
                ref={detailScrollRef}
                className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-3 sm:hidden"
              >
                <SelectedGuidePanel
                  item={selectedItem}
                  onSelectPrev={handleSelectPrev}
                  onSelectNext={handleSelectNext}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                />
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}