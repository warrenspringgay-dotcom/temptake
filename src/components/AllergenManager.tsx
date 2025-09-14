"use client";

import React, { useEffect, useMemo, useState } from "react";
import { uid } from "@/lib/uid";
import { PencilIcon, TrashIcon } from "./ui/Icons";

/* ---------- Types & Constants ---------- */
type AllergenKey =
  | "gluten" | "crustaceans" | "eggs" | "fish" | "peanuts" | "soybeans"
  | "milk" | "nuts" | "celery" | "mustard" | "sesame" | "sulphites" | "lupin" | "molluscs";

type Allergen = { key: AllergenKey; icon: string; label: string; short: string };

const ALLERGENS: Allergen[] = [
  { key: "gluten",       icon: "🌾", label: "Gluten",       short: "GLU" },
  { key: "crustaceans",  icon: "🦐", label: "Crustaceans",  short: "CRU" },
  { key: "eggs",         icon: "🥚", label: "Eggs",         short: "EGG" },
  { key: "fish",         icon: "🐟", label: "Fish",         short: "FIS" },
  { key: "peanuts",      icon: "🥜", label: "Peanuts",      short: "PEA" },
  { key: "soybeans",     icon: "🌱", label: "Soy",          short: "SOY" },
  { key: "milk",         icon: "🥛", label: "Milk",         short: "MIL" },
  { key: "nuts",         icon: "🌰", label: "Tree nuts",    short: "NUT" },
  { key: "celery",       icon: "🥬", label: "Celery",       short: "CEL" },
  { key: "mustard",      icon: "🌿", label: "Mustard",      short: "MUS" },
  { key: "sesame",       icon: "🧴", label: "Sesame",       short: "SES" },
  { key: "sulphites",    icon: "🧪", label: "Sulphites",    short: "SUL" },
  { key: "lupin",        icon: "🌼", label: "Lupin",        short: "LUP" },
  { key: "molluscs",     icon: "🐚", label: "Molluscs",     short: "MOL" },
];

const CATEGORIES = ["Starter", "Main", "Side", "Dessert", "Drink"] as const;
type Category = typeof CATEGORIES[number];

type Flags = Record<AllergenKey, boolean>;
export type MatrixRow = {
  id: string;
  item: string;
  category?: Category;
  flags: Flags;        // Yes/No
  notes?: string;
  locked: boolean;     // saved rows are locked; edit via modal
};

type ReviewInfo = {
  lastReviewedOn?: string; // ISO
  lastReviewedBy?: string;
  intervalDays: number;
};

const LS_ROWS = "tt_allergens_rows_v3";
const LS_REVIEW = "tt_allergens_review_v2";

/* ---------- Helpers ---------- */
const emptyFlags = (): Flags =>
  Object.fromEntries(ALLERGENS.map(a => [a.key, false])) as Flags;

const overdue = (info: ReviewInfo): boolean => {
  if (!info.lastReviewedOn) return true;
  const last = new Date(info.lastReviewedOn + "T00:00:00Z").getTime();
  const next = last + info.intervalDays * 86400000;
  return Date.now() > next;
};

/* ---------- Component ---------- */
export default function AllergenManager() {
  // Hydration guard: only read/write localStorage after mount
  const [hydrated, setHydrated] = useState(false);

  // Review + rows (start with safe, neutral defaults for SSR)
  const [review, setReview] = useState<ReviewInfo>({ intervalDays: 30 });
  const [rows, setRows] = useState<MatrixRow[]>([]);

  // Query state (declare BEFORE using)
  const [qCat, setQCat] = useState<"All" | Category>("All");
  const [qFlags, setQFlags] = useState<Flags>(emptyFlags());

  // Load from localStorage on mount
  useEffect(() => {
    setHydrated(true);

    try {
      const rawRows = localStorage.getItem(LS_ROWS);
      if (rawRows) {
        const parsed = JSON.parse(rawRows) as MatrixRow[];
        setRows(
          parsed.map(r => ({
            ...r,
            flags: { ...emptyFlags(), ...r.flags },
            locked: r.locked ?? true,
          }))
        );
      } else {
        // Seed demo data on first run
        setRows([
          { id: uid(), item: "White Bread",     category: "Side",    flags: { ...emptyFlags(), gluten: true },        notes: "", locked: true },
          { id: uid(), item: "Prawn Cocktail",  category: "Starter", flags: { ...emptyFlags(), crustaceans: true },   notes: "", locked: true },
          { id: uid(), item: "Fruit Salad",     category: "Dessert", flags: { ...emptyFlags() },                       notes: "", locked: true },
        ]);
      }
    } catch {
      // ignore
    }

    try {
      const rawReview = localStorage.getItem(LS_REVIEW);
      if (rawReview) {
        const parsed = JSON.parse(rawReview) as Partial<ReviewInfo>;
        setReview({ intervalDays: 30, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist after hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_ROWS, JSON.stringify(rows));
    } catch {}
  }, [rows, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_REVIEW, JSON.stringify(review));
    } catch {}
  }, [review, hydrated]);

  /* ===== Query (SAFE FOODS) ===== */
  const selectedAllergenKeys = useMemo(
    () => (ALLERGENS.map(a => a.key).filter(k => qFlags[k]) as AllergenKey[]),
    [qFlags]
  );

  // Only compute after hydration to keep SSR/CSR markup identical
  const safeFoods = useMemo(() => {
    if (!hydrated || selectedAllergenKeys.length === 0) return [];
    return rows.filter(r => {
      if (qCat !== "All" && (r.category ?? "") !== qCat) return false;
      return selectedAllergenKeys.every(k => r.flags[k] === false);
    });
  }, [hydrated, rows, qCat, selectedAllergenKeys]);

  /* ===== Add/Edit modal ===== */
  type Draft = Omit<MatrixRow, "id" | "locked"> & { id?: string; locked?: boolean };
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const openAdd = () => {
    setDraft({ item: "", category: "Starter", flags: emptyFlags(), notes: "" });
    setModalOpen(true);
  };
  const openEdit = (row: MatrixRow) => {
    setDraft({ id: row.id, item: row.item, category: row.category, flags: { ...row.flags }, notes: row.notes });
    setModalOpen(true);
  };
  const saveDraft = () => {
    if (!draft) return;
    setRows(rs => {
      if (draft.id) {
        return rs.map(r => r.id === draft.id
          ? { ...r, item: draft.item, category: draft.category, flags: draft.flags, notes: draft.notes, locked: true }
          : r
        );
      }
      return [...rs, { id: uid(), item: draft.item, category: draft.category, flags: draft.flags, notes: draft.notes, locked: true }];
    });
    setModalOpen(false);
  };

  const reviewPanelTone = hydrated
    ? (overdue(review) ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50")
    : "border-gray-200 bg-white"; // neutral until hydrated

  return (
    <div className="px-4 py-6">
      {/* Review panel */}
      <div className={`mb-4 rounded-xl border px-4 py-3 ${reviewPanelTone}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-medium">Allergen register review</div>
            <div className="text-xs text-gray-600">
              Last reviewed:{" "}
              {review.lastReviewedOn ? (
                <span className="font-medium">{review.lastReviewedOn}</span>
              ) : (
                <span className="italic">never</span>
              )}
              {review.lastReviewedBy ? ` by ${review.lastReviewedBy}` : ""} · Interval (days): {review.intervalDays}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={7}
              className="w-24 rounded-xl border border-gray-300 px-2 py-1 text-sm"
              value={review.intervalDays}
              onChange={(e) =>
                setReview((r) => ({ ...r, intervalDays: Math.max(1, Number(e.target.value || "0")) }))
              }
            />
            <button
              className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              onClick={() =>
                setReview({
                  ...review,
                  lastReviewedOn: new Date().toISOString().slice(0, 10),
                  lastReviewedBy: "Manager",
                })
              }
            >
              Mark reviewed today
            </button>
          </div>
        </div>
      </div>

      {/* QUERY (fold-down) – SAFE FOODS */}
      <details className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
        <summary className="cursor-pointer select-none font-medium">Allergen Query (safe foods)</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Category selector */}
          <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
            <div className="text-sm font-medium mb-2">Category</div>
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={qCat}
              onChange={(e) => setQCat(e.target.value as "All" | Category)}
            >
              <option value="All">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-600">
              Only items <strong>without</strong> the selected allergens will appear below.
            </p>
          </div>

          {/* Allergen checkboxes */}
          <div className="md:col-span-2 rounded-md border border-gray-200 p-3 bg-gray-50">
            <div className="mb-2 text-sm font-medium">Select allergens to exclude</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {ALLERGENS.map((a) => (
                <label key={a.key} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={qFlags[a.key]}
                    onChange={(e) => setQFlags((f) => ({ ...f, [a.key]: e.target.checked }))}
                  />
                  <span title={a.label}>
                    {a.icon}{" "}
                    <span className="font-mono text-[11px] text-gray-500">{a.short}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                className="rounded border px-2 py-1 text-xs hover:bg-white"
                onClick={() => setQFlags(emptyFlags())}
              >
                Clear selection
              </button>
              <span className="text-xs text-gray-600">Selected: {Object.values(qFlags).filter(Boolean).length}</span>
            </div>
          </div>
        </div>

        {/* Safe results */}
        {hydrated && selectedAllergenKeys.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-semibold">Safe foods ({safeFoods.length})</div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {safeFoods.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                        No safe items for this selection.
                      </td>
                    </tr>
                  )}
                  {safeFoods.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.item}</td>
                      <td className="px-3 py-2">{r.category ?? ""}</td>
                      <td className="px-3 py-2">{r.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </details>

      {/* Top actions */}
      <div className="mb-3">
        <button
          className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          onClick={openAdd}
        >
          + Add item
        </button>
      </div>

      {/* FULL MATRIX */}
      <div className="mb-2 text-sm font-semibold">Allergen matrix</div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-[940px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Category</th>
              {ALLERGENS.map((a) => (
                <th key={a.key} className="px-2 py-2 font-medium text-center whitespace-nowrap">
                  <span title={a.label}>
                    {a.icon} <span className="font-mono text-[11px] text-gray-500">{a.short}</span>
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={2 + ALLERGENS.length + 1} className="px-3 py-6 text-center text-gray-500">
                  No items.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.item}</td>
                <td className="px-3 py-2">{row.category ?? ""}</td>
                {ALLERGENS.map((a) => {
                  const yes = row.flags[a.key];
                  return (
                    <td key={a.key} className="px-2 py-2 text-center">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                          yes ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {yes ? "Yes" : "No"}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      title="Edit"
                      onClick={() => openEdit(row)}
                    >
                      ✏️
                    </button>
                    <button
                      className="rounded-xl border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      title="Delete"
                      onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <details className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
        <summary className="cursor-pointer select-none font-medium">Allergen key</summary>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {ALLERGENS.map((a) => (
            <div key={a.key} className="inline-flex items-center gap-2 rounded border px-2 py-1">
              <span>{a.icon}</span>
              <span className="font-medium">{a.label}</span>
              <span className="font-mono text-xs text-gray-500">{a.short}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Add/Edit Modal */}
      {modalOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow">
            <div className="border-b px-4 py-3 font-semibold">Allergen item</div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Item</div>
                  <input
                    className="w-full rounded-xl border border-gray-300 px-2 py-1.5"
                    value={draft.item}
                    onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Category</div>
                  <select
                    className="w-full rounded-xl border border-gray-300 px-2 py-1.5"
                    value={draft.category ?? "Starter"}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Yes/No toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ALLERGENS.map((a) => {
                  const val = draft.flags[a.key];
                  return (
                    <div key={a.key} className="flex items-center justify-between rounded border p-2">
                      <span title={a.label} className="text-sm">
                        {a.icon} <span className="font-mono text-[11px] text-gray-500">{a.short}</span>
                      </span>
                      <div className="inline-flex overflow-hidden rounded border">
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${val ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                          onClick={() => setDraft((d) => ({ ...d!, flags: { ...d!.flags, [a.key]: true } }))}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${!val ? "bg-emerald-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                          onClick={() => setDraft((d) => ({ ...d!, flags: { ...d!.flags, [a.key]: false } }))}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="block text-sm">
                <div className="mb-1 text-gray-600">Notes</div>
                <textarea
                  className="w-full rounded-xl border border-gray-300 px-2 py-1.5"
                  rows={3}
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </label>
              <p className="text-xs text-gray-500">Saving will lock this item. Use Edit to change later.</p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                onClick={saveDraft}
              >
                Save &amp; lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}