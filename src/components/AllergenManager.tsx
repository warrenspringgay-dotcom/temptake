// src/components/AllergenManager.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "@/lib/uid";
import ActionMenu from "@/components/ActionMenu";
import { emptyFlags as libEmptyFlags } from "@/lib/allergens";
import { supabase } from "@/lib/supabaseClient";
import { getActiveOrgIdClient } from "@/lib/orgClient";

/* ---------- Types & Constants ---------- */
type AllergenKey =
  | "gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "peanuts"
  | "soybeans"
  | "milk"
  | "nuts"
  | "celery"
  | "mustard"
  | "sesame"
  | "sulphites"
  | "lupin"
  | "molluscs";

type Allergen = { key: AllergenKey; icon: string; label: string; short: string };

const ALLERGENS: Allergen[] = [
  { key: "gluten", icon: "🌾", label: "Gluten", short: "GLU" },
  { key: "crustaceans", icon: "🦐", label: "Crustaceans", short: "CRU" },
  { key: "eggs", icon: "🥚", label: "Eggs", short: "EGG" },
  { key: "fish", icon: "🐟", label: "Fish", short: "FIS" },
  { key: "peanuts", icon: "🥜", label: "Peanuts", short: "PEA" },
  { key: "soybeans", icon: "🌱", label: "Soy", short: "SOY" },
  { key: "milk", icon: "🥛", label: "Milk", short: "MIL" },
  { key: "nuts", icon: "🌰", label: "Tree nuts", short: "NUT" },
  { key: "celery", icon: "🥬", label: "Celery", short: "CEL" },
  { key: "mustard", icon: "🌿", label: "Mustard", short: "MUS" },
  { key: "sesame", icon: "🧴", label: "Sesame", short: "SES" },
  { key: "sulphites", icon: "🧪", label: "Sulphites", short: "SUL" },
  { key: "lupin", icon: "🌼", label: "Lupin", short: "LUP" },
  { key: "molluscs", icon: "🐚", label: "Molluscs", short: "MOL" },
];

const CATEGORIES = ["Starter", "Main", "Side", "Dessert", "Drink"] as const;
type Category = (typeof CATEGORIES)[number];

type Flags = Record<AllergenKey, boolean>;

export type MatrixRow = {
  id: string;
  item: string;
  category?: Category;
  flags: Flags;
  notes?: string;
  locked: boolean;
};

type ReviewInfo = {
  lastReviewedOn?: string; // yyyy-mm-dd
  lastReviewedBy?: string;
  intervalDays: number;
};

const LS_ROWS = "tt_allergens_rows_v3";
const LS_REVIEW = "tt_allergens_review_v2";

/* ---------- Helpers ---------- */
const emptyFlags = (): Flags =>
  Object.fromEntries(ALLERGENS.map((a) => [a.key, false])) as Flags;

const todayISO = () => new Date().toISOString().slice(0, 10);

const overdue = (info: ReviewInfo): boolean => {
  if (!info.lastReviewedOn) return true;
  const last = new Date(info.lastReviewedOn + "T00:00:00Z").getTime();
  const next = last + info.intervalDays * 86_400_000;
  return Date.now() > next;
};

/* ---------- Component ---------- */
export default function AllergenManager() {
  const [hydrated, setHydrated] = useState(false);

  // Cloud context
  const [orgId, setOrgId] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // State
  const [review, setReview] = useState<ReviewInfo>({ intervalDays: 30 });
  const [rows, setRows] = useState<MatrixRow[]>([]);

  // Query (safe foods)
  const [qCat, setQCat] = useState<"All" | Category>("All");
  const [qFlags, setQFlags] = useState<Flags>(emptyFlags());

  /* ---------- boot: get org id, load from supabase (fallback to LS) ---------- */
  useEffect(() => {
    setHydrated(true);
    (async () => {
      try {
        const id = await getActiveOrgIdClient();
        setOrgId(id ?? null);
        if (!id) {
          primeLocal();
          return;
        }
        await Promise.all([loadFromSupabase(id), loadReviewFromSupabase(id)]);
      } catch (e: any) {
        setLoadErr(e?.message ?? "Failed to load allergens.");
        primeLocal();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function primeLocal() {
    try {
      const rawRows = localStorage.getItem(LS_ROWS);
      if (rawRows) {
        const parsed = JSON.parse(rawRows) as MatrixRow[];
        setRows(
          parsed.map((r) => ({
            ...r,
            flags: { ...emptyFlags(), ...r.flags },
            locked: r.locked ?? true,
          }))
        );
      } else {
        setRows([
          {
            id: uid(),
            item: "White Bread",
            category: "Side",
            flags: { ...emptyFlags(), gluten: true },
            notes: "",
            locked: true,
          },
          {
            id: uid(),
            item: "Prawn Cocktail",
            category: "Starter",
            flags: { ...emptyFlags(), crustaceans: true },
            notes: "",
            locked: true,
          },
          {
            id: uid(),
            item: "Fruit Salad",
            category: "Dessert",
            flags: { ...emptyFlags() },
            notes: "",
            locked: true,
          },
        ]);
      }
    } catch {}

    try {
      const rawReview = localStorage.getItem(LS_REVIEW);
      if (rawReview) {
        const parsed = JSON.parse(rawReview) as Partial<ReviewInfo>;
        setReview({ intervalDays: 30, ...parsed });
      }
    } catch {}
  }

  /** Load items and flags from cloud (two queries, then merge) */
  async function loadFromSupabase(id = orgId) {
    if (!id) return;
    setCloudBusy(true);
    setLoadErr(null);

    // 1) Items
    const { data: items, error: itemsErr } = await supabase
      .from("allergen_items")
      .select("id,item,category,notes,locked,organisation_id,org_id")
      .or(`organisation_id.eq.${id},org_id.eq.${id}`)
      .order("item", { ascending: true });

    if (itemsErr) {
      setCloudBusy(false);
      setLoadErr(itemsErr.message);
      return;
    }

    const ids = (items ?? []).map((r: any) => r.id);
    let flagsByItem: Record<string, Flags> = {};

    if (ids.length) {
      // 2) Flags for these items
      const { data: flags, error: flagsErr } = await supabase
        .from("allergen_flags")
        .select("item_id,key,value")
        .in("item_id", ids);

      if (flagsErr) {
        setCloudBusy(false);
        setLoadErr(flagsErr.message);
        return;
      }

      // Build map
      for (const id of ids) flagsByItem[id] = emptyFlags();
      for (const f of flags ?? []) {
        const k = (f.key as AllergenKey) ?? null;
        if (!k) continue;
        if (!flagsByItem[f.item_id]) flagsByItem[f.item_id] = emptyFlags();
        flagsByItem[f.item_id][k] = !!f.value;
      }
    }

    const list: MatrixRow[] = (items ?? []).map((r: any) => ({
      id: String(r.id),
      item: r.item,
      category: (r.category ?? undefined) as Category | undefined,
      flags: flagsByItem[r.id] ?? emptyFlags(),
      notes: r.notes ?? undefined,
      locked: !!r.locked,
    }));

    setRows(list);
    setCloudBusy(false);

    // local shadow
    try {
      localStorage.setItem(LS_ROWS, JSON.stringify(list));
    } catch {}
  }

  async function loadReviewFromSupabase(id = orgId) {
    if (!id) return;
    const { data, error } = await supabase
      .from("allergen_reviews")
      .select("last_reviewed_on,last_reviewed_by,interval_days")
      .eq("organisation_id", id)
      .maybeSingle();

    if (error) return; // non-fatal

    if (data) {
      setReview({
        intervalDays: data.interval_days ?? 30,
        lastReviewedOn: data.last_reviewed_on ?? undefined,
        lastReviewedBy: data.last_reviewed_by ?? undefined,
      });
      try {
        localStorage.setItem(
          LS_REVIEW,
          JSON.stringify({
            intervalDays: data.interval_days ?? 30,
            lastReviewedOn: data.last_reviewed_on ?? undefined,
            lastReviewedBy: data.last_reviewed_by ?? undefined,
          })
        );
      } catch {}
    }
  }

  /* ---------- persist local shadows ---------- */
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

  /* ---------- CRUD (cloud-first, flags in separate table) ---------- */
  async function upsertItem(d: { id?: string; item: string; category?: Category; notes?: string; flags: Flags }) {
    const id = orgId ?? (await getActiveOrgIdClient());

    // local fallback if no org
    if (!id) {
      setRows((rs) => {
        if (d.id) return rs.map((r) => (r.id === d.id ? { ...r, ...d, locked: true } : r));
        return [...rs, { id: uid(), ...d, locked: true }];
      });
      return;
    }

    let rowId = d.id as string | undefined;

    if (rowId) {
      const { error } = await supabase
        .from("allergen_items")
        .update({
          item: d.item,
          category: d.category ?? null,
          notes: d.notes ?? null,
          locked: true,
          organisation_id: id,
        })
        .eq("id", rowId);
      if (error) {
        alert(`Save failed: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("allergen_items")
        .insert({
          item: d.item,
          category: d.category ?? null,
          notes: d.notes ?? null,
          locked: true,
          organisation_id: id,
        })
        .select("id")
        .single();
      if (error) {
        alert(`Save failed: ${error.message}`);
        return;
      }
      rowId = String(data?.id);
    }

    // Replace flags for this item
    if (rowId) {
      await supabase.from("allergen_flags").delete().eq("item_id", rowId);
      const payload = (Object.keys(d.flags) as AllergenKey[]).map((k) => ({
        item_id: rowId!,
        key: k,
        value: !!d.flags[k],
      }));
      if (payload.length) {
        const { error: flagsErr } = await supabase.from("allergen_flags").insert(payload);
        if (flagsErr) {
          alert(`Saving flags failed: ${flagsErr.message}`);
        }
      }
    }

    // reflect in UI
    const finalId = rowId ?? uid();
    setRows((rs) => {
      const exists = rs.some((r) => r.id === finalId);
      const patch = { id: finalId, item: d.item, category: d.category, flags: d.flags, notes: d.notes, locked: true };
      return exists ? rs.map((r) => (r.id === finalId ? { ...r, ...patch } : r)) : [...rs, patch as MatrixRow];
    });
  }

  async function deleteItem(idToDelete: string) {
    const id = orgId ?? (await getActiveOrgIdClient());
    if (!id) {
      setRows((rs) => rs.filter((r) => r.id !== idToDelete));
      return;
    }
    // delete flags first, then item
    await supabase.from("allergen_flags").delete().eq("item_id", idToDelete);
    const { error } = await supabase.from("allergen_items").delete().eq("id", idToDelete);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== idToDelete));
  }

  /* ---------- review save ---------- */
  async function markReviewedToday() {
    const id = orgId ?? (await getActiveOrgIdClient());
    setReview((r) => ({
      ...r,
      lastReviewedOn: todayISO(),
      lastReviewedBy: "Manager",
    }));
    if (!id) return; // local only if no org

    // upsert on organisation_id
    const { error } = await supabase.from("allergen_reviews").upsert(
      {
        organisation_id: id,
        last_reviewed_on: todayISO(),
        last_reviewed_by: "Manager",
        interval_days: review.intervalDays,
        next_due: new Date(Date.now() + review.intervalDays * 86_400_000).toISOString().slice(0, 10),
      },
      { onConflict: "organisation_id" }
    );
    if (error) {
      alert(`Failed to save review: ${error.message}`);
    }
  }

  /* ===== Query (SAFE FOODS) ===== */
  const selectedAllergenKeys = useMemo(
    () => (ALLERGENS.map((a) => a.key) as AllergenKey[]).filter((k) => qFlags[k]),
    [qFlags]
  );

  const safeFoods = useMemo(() => {
    if (!hydrated || selectedAllergenKeys.length === 0) return [];
    return rows.filter((r) => {
      if (qCat !== "All" && (r.category ?? "") !== qCat) return false;
      return selectedAllergenKeys.every((k) => r.flags[k] === false);
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
    setDraft({
      id: row.id,
      item: row.item,
      category: row.category,
      flags: { ...row.flags },
      notes: row.notes,
    });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const saveDraft = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft || !draft.item.trim()) return;
    await upsertItem({
      id: draft.id,
      item: draft.item.trim(),
      category: draft.category,
      flags: draft.flags,
      notes: (draft.notes ?? "").trim(),
    });
    setModalOpen(false);
  };

  const reviewPanelTone = hydrated
    ? overdue(review)
      ? "border-red-300 bg-red-50"
      : "border-emerald-300 bg-emerald-50"
    : "border-gray-300 bg-white";

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
        <div className="flex w-full max-w-[360px] items-center gap-2 sm:max-w-none sm:w-auto">
          <input
            type="number"
            min={7}
            className="w-24 flex-1 rounded-xl border border-gray-600 px-2 py-1 text-sm"
            value={review.intervalDays}
            onChange={(e) =>
              setReview((r) => ({
                ...r,
                intervalDays: Math.max(1, Number(e.target.value || "0")),
              }))
            }
          />
          <button
            className="shrink-0 rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            onClick={markReviewedToday}
          >
            Mark reviewed today
          </button>
        </div>
      </div>
    </div>

    {/* QUERY – SAFE FOODS */}
    <details className="mb-4 rounded-xl border border-gray-600 bg-white p-3">
      <summary className="cursor-pointer select-none font-medium">Allergen Query (safe foods)</summary>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-3">
          <div className="mb-2 text-sm font-medium">Category</div>
          <select
            className="w-full rounded-md border border-gray-600 px-2 py-1.5 text-sm"
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
            Only items <strong>without</strong> the selected allergens appear below.
          </p>
        </div>

        <div className="md:col-span-2 rounded-md border border-gray-300 bg-gray-50 p-3">
          <div className="mb-2 text-sm font-medium">Select allergens to exclude</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ALLERGENS.map((a) => (
              <label key={a.key} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={qFlags[a.key]}
                  onChange={(e) => setQFlags((f) => ({ ...f, [a.key]: e.target.checked }))}
                />
                <span title={a.label}>
                  {a.icon} <span className="font-mono text-[11px] text-gray-500">{a.short}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              className="rounded border border-gray-600 px-2 py-1 text-xs hover:bg-white"
              onClick={() => setQFlags(emptyFlags())}
            >
              Clear selection
            </button>
            <span className="text-xs text-gray-600">
              Selected: {Object.values(qFlags).filter(Boolean).length}
            </span>
          </div>
        </div>
      </div>

      {/* Safe results */}
      {hydrated && selectedAllergenKeys.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">Safe foods ({safeFoods.length})</div>
          <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
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
                  <tr key={r.id} className="border-t border-gray-300">
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
    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
      <button
        className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        onClick={openAdd}
      >
        + Add item
      </button>

      <button
        className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        onClick={() => loadFromSupabase()}
        disabled={cloudBusy || !orgId}
        title={orgId ? 'Reload from cloud' : 'No organisation (local only)'}
      >
        {cloudBusy ? "Loading…" : "Refresh from cloud"}
      </button>
    </div>

    {/* MATRIX – Desktop table */}
    <div className="mb-2 hidden text-sm font-semibold md:block">Allergen matrix</div>
    <div className="hidden overflow-x-auto rounded-2xl border border-gray-600 bg-white md:block">
      <table className="min-w-[700px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-gray-600">
            <th className="px-2 py-2 font-medium">Item</th>
            <th className="px-2 py-2 font-medium">Category</th>
            {ALLERGENS.map((a) => (
              <th key={a.key} className="whitespace-nowrap px-2 py-2 text-center font-medium">
                {a.icon} <span className="font-mono text-[11px] text-gray-500">{a.short}</span>
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2 + ALLERGENS.length + 1} className="px-3 py-6 text-center text-gray-500">
                {loadErr ? `Error: ${loadErr}` : "No items."}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-300">
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
                  <ActionMenu
                    items={[
                      { label: "Edit", onClick: () => openEdit(row) },
                      { label: "Delete", onClick: () => void deleteItem(row.id), variant: "danger" },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* MOBILE – Cards */}
    <div className="md:hidden">
      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white p-4 text-center text-gray-500">
          {loadErr ? `Error: ${loadErr}` : "No items."}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-gray-300 bg-white p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{row.item}</div>
                  {row.category ? <div className="text-xs text-gray-500">{row.category}</div> : null}
                </div>
                <ActionMenu
                  items={[
                    { label: "Edit", onClick: () => openEdit(row) },
                    { label: "Delete", onClick: () => void deleteItem(row.id), variant: "danger" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {ALLERGENS.map((a) => {
                  const yes = row.flags[a.key];
                  return (
                    <div
                      key={a.key}
                      className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                        yes
                          ? "bg-red-50 text-red-800 border border-red-300"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span>{a.icon}</span>
                        <span className="font-mono">{a.short}</span>
                      </span>
                      <span className="font-medium">{yes ? "Yes" : "No"}</span>
                    </div>
                  );
                })}
              </div>

              {row.notes ? <div className="mt-2 text-xs text-gray-600">{row.notes}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Legend */}
    <div className="mt-8 rounded-xl border border-gray-300 bg-white p-3">
      <div className="mb-2 text-sm font-semibold text-gray-700">Allergen legend</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-700">
        {ALLERGENS.map((a) => (
          <div key={a.key} className="flex items-center gap-2">
            <span className="text-base leading-none">{a.icon}</span>
            <span>{a.label}</span>
            <span className="ml-1 font-mono text-[11px] text-gray-500">{a.short}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Modal */}
    {modalOpen && draft && (
      <div className="fixed inset-0 z-50 bg-black/30" onClick={closeModal}>
        <form
          onSubmit={saveDraft}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto mt-3 flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-gray-300 bg-white shadow sm:mt-16 sm:h-[80vh] sm:rounded-2xl"
        >
          <div className="sticky top-0 z-10 border-b border-gray-300 bg-white px-4 py-3 text-base font-semibold">
            Allergen item
          </div>

          <div className="grow overflow-y-auto px-4 py-3">
            {/* form fields unchanged */}
            {/* … keep your inputs from above … */}
          </div>

          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-gray-300 bg-white px-4 py-3">
            <button type="button" className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={closeModal}>
              Cancel
            </button>
            <button className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
              Save &amp; lock
            </button>
          </div>
        </form>
      </div>
    )}
  </div>
);}
