// src/components/AllergenManager.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "@/lib/uid";
import ActionMenu from "@/components/ActionMenu";

import { parseCSV } from "@/lib/csv";
import { emptyFlags, draftFromRow, type MatrixDraft } from "@/lib/allergens";
import { supabase } from "@/lib/supabaseBrowser";
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
const todayISO = () => new Date().toISOString().slice(0, 10);

const overdue = (info: ReviewInfo): boolean => {
  if (!info.lastReviewedOn) return true;
  const last = new Date(info.lastReviewedOn + "T00:00:00Z").getTime();
  const next = last + info.intervalDays * 86_400_000;
  return Date.now() > next;
};

/* ---------- Component ---------- */
export default function AllergenManager() {
  // Hydration guard
  const [hydrated, setHydrated] = useState(false);

  // File import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importTarget, setImportTarget] = useState<"local" | "supabase" | null>(null);

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
          // no org – use local cache / seed so UI still works
          primeLocal();
          return;
        }

        await Promise.all([loadFromSupabase(id), loadReviewFromSupabase(id)]);
      } catch (e: any) {
        setLoadErr(e?.message ?? "Failed to load allergens.");
        // still prime with local so the page isn't empty
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
        // Seed demo rows once
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

  async function loadFromSupabase(id = orgId) {
    if (!id) return;
    setCloudBusy(true);
    setLoadErr(null);
    const { data, error } = await supabase
      .from("allergen_items")
      .select("id,item,category,notes,flags,locked")
      .eq("org_id", id)
      .order("item", { ascending: true });

    setCloudBusy(false);

    if (error) {
      setLoadErr(error.message);
      return;
    }

    const list: MatrixRow[] = (data ?? []).map((r: any) => ({
      id: String(r.id),
      item: r.item,
      category: (r.category ?? undefined) as Category | undefined,
      flags: { ...emptyFlags(), ...(r.flags ?? {}) },
      notes: r.notes ?? undefined,
      locked: !!r.locked,
    }));

    setRows(list);

    // keep a local shadow cache for snappy reloads/offline
    try {
      localStorage.setItem(LS_ROWS, JSON.stringify(list));
    } catch {}
  }

  async function loadReviewFromSupabase(id = orgId) {
    if (!id) return;
    const { data, error } = await supabase
      .from("allergen_reviews")
      .select("last_reviewed_on,last_reviewed_by,interval_days")
      .eq("org_id", id)
      .maybeSingle();

    if (error) return; // non-fatal

    if (data) {
      setReview({
        intervalDays: data.interval_days ?? 30,
        lastReviewedOn: data.last_reviewed_on ?? undefined,
        lastReviewedBy: data.last_reviewed_by ?? undefined,
      });

      // mirror locally
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
    } else {
      // no row yet; keep defaults
    }
  }

  /* ---------- persist local shadows for quick load ---------- */
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

  /* ---------- file import handlers ---------- */
  function triggerImport(target: "local" | "supabase") {
    setImportTarget(target);
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset input
    if (!file) return;

    const text = await file.text();
    const csvRows = parseCSV(text);
    const drafts: MatrixDraft[] = csvRows.map(draftFromRow).filter(Boolean) as MatrixDraft[];

    if (drafts.length === 0) {
      alert("No valid rows found in CSV.");
      return;
    }

    if (importTarget === "local") {
      setRows((prev) => [
        ...prev,
        ...drafts.map((d) => ({
          id: uid(),
          item: d.item,
          category: d.category as Category | undefined,
          flags: d.flags,
          notes: d.notes,
          locked: true,
        })),
      ]);
      alert(`Imported ${drafts.length} items into this device.`);
    }

    if (importTarget === "supabase") {
      const id = orgId ?? (await getActiveOrgIdClient());
      if (!id) return alert("No organisation found.");

      const payload = drafts.map((d) => ({
        org_id: id,
        item: d.item,
        category: d.category ?? null,
        notes: d.notes ?? null,
        flags: d.flags, // JSONB
        locked: true,
      }));

      const { error } = await supabase.from("allergen_items").insert(payload);
      if (error) {
        alert(`Supabase import failed: ${error.message}`);
        return;
      }
      await loadFromSupabase(id);
      alert(`Imported ${drafts.length} items to Supabase.`);
    }

    setImportTarget(null);
  }

  /* ---------- CRUD (cloud-first) ---------- */
  async function upsertItem(d: { id?: string; item: string; category?: Category; notes?: string; flags: Flags }) {
    const id = orgId ?? (await getActiveOrgIdClient());
    if (!id) {
      // fallback to local if no org (keeps current behaviour)
      setRows((rs) => {
        if (d.id) {
          return rs.map((r) => (r.id === d.id ? { ...r, ...d, locked: true } : r));
        }
        return [...rs, { id: uid(), ...d, locked: true }];
      });
      return;
    }

    if (d.id) {
      // update
      const { error } = await supabase
        .from("allergen_items")
        .update({
          item: d.item,
          category: d.category ?? null,
          notes: d.notes ?? null,
          flags: d.flags,
          locked: true,
        })
        .eq("id", d.id)
        .eq("org_id", id);
      if (error) {
        alert(`Save failed: ${error.message}`);
        return;
      }
    } else {
      // insert
      const { data, error } = await supabase
        .from("allergen_items")
        .insert({
          org_id: id,
          item: d.item,
          category: d.category ?? null,
          notes: d.notes ?? null,
          flags: d.flags,
          locked: true,
        })
        .select("id")
        .single();
      if (error) {
        alert(`Save failed: ${error.message}`);
        return;
      }
      d.id = String(data?.id);
    }

    // reflect in UI and local cache
    setRows((rs) => {
      const exists = rs.some((r) => r.id === d.id);
      if (exists) return rs.map((r) => (r.id === d.id ? { ...r, ...d, locked: true } as MatrixRow : r));
      return [...rs, { id: d.id!, item: d.item, category: d.category, flags: d.flags, notes: d.notes, locked: true }];
    });
  }

  async function deleteItem(idToDelete: string) {
    const id = orgId ?? (await getActiveOrgIdClient());
    if (!id) {
      // local only
      setRows((rs) => rs.filter((r) => r.id !== idToDelete));
      return;
    }
    const { error } = await supabase.from("allergen_items").delete().eq("id", idToDelete).eq("org_id", id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== idToDelete));
  }

  /* ---------- review save (cloud-first) ---------- */
  async function markReviewedToday() {
    const id = orgId ?? (await getActiveOrgIdClient());
    const payload = {
      last_reviewed_on: todayISO(),
      last_reviewed_by: "Manager",
      interval_days: review.intervalDays,
      // derive next due (so your KPI query that looks at next_due can work)
      next_due: new Date(Date.now() + review.intervalDays * 86_400_000).toISOString().slice(0, 10),
    };

    setReview((r) => ({
      ...r,
      lastReviewedOn: payload.last_reviewed_on,
      lastReviewedBy: payload.last_reviewed_by,
    }));

    if (!id) return; // local only if no org

    // Upsert (one row per org)
    const { error } = await supabase
      .from("allergen_reviews")
      .upsert({ org_id: id, ...payload }, { onConflict: "org_id" });

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

    // cloud-first upsert
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
      ? "border-red-200 bg-red-50"
      : "border-emerald-200 bg-emerald-50"
    : "border-gray-200 bg-white";

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
              {review.lastReviewedBy ? ` by ${review.lastReviewedBy}` : ""} · Interval (days):{" "}
              {review.intervalDays}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={7}
              className="w-24 rounded-xl border border-gray-300 px-2 py-1 text-sm"
              value={review.intervalDays}
              onChange={(e) =>
                setReview((r) => ({
                  ...r,
                  intervalDays: Math.max(1, Number(e.target.value || "0")),
                }))
              }
            />
            <button
              className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              onClick={markReviewedToday}
            >
              Mark reviewed today
            </button>
          </div>
        </div>
      </div>

      {/* Safe foods query */}
      <details className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
        <summary className="cursor-pointer select-none font-medium">Allergen Query (safe foods)</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-sm font-medium">Category</div>
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
              Only items <strong>without</strong> the selected allergens appear below.
            </p>
          </div>

          <div className="md:col-span-2 rounded-md border border-gray-200 bg-gray-50 p-3">
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
                className="rounded border px-2 py-1 text-xs hover:bg-white"
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
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          onClick={openAdd}
        >
          + Add item
        </button>

        <button
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => loadFromSupabase()}
          disabled={cloudBusy || !orgId}
          title={orgId ? "Reload from Supabase" : "No organisation (local only)"}
        >
          {cloudBusy ? "Loading…" : "Refresh from cloud"}
        </button>

        <button
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => triggerImport("supabase")}
          disabled={!orgId}
          title={orgId ? "Bulk import CSV → Supabase" : "No organisation"}
        >
          Import CSV → Cloud
        </button>

        <button
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => triggerImport("local")}
          title="Bulk import CSV into this device only"
        >
          Import CSV → Local
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChosen}
        />
      </div>

      {/* MATRIX – Desktop table */}
      <div className="mb-2 hidden text-sm font-semibold md:block">Allergen matrix</div>
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
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
                    <ActionMenu
                      items={[
                        { label: "Edit", onClick: () => openEdit(row) },
                        {
                          label: "Delete",
                          onClick: () => void deleteItem(row.id),
                          variant: "danger",
                        },
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
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
            {loadErr ? `Error: ${loadErr}` : "No items."}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-3">
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
                          yes ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
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

      {/* Modal (single, sticky header/footer) */}
      {modalOpen && draft && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={closeModal}>
          <form
            onSubmit={saveDraft}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-3 flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-[80vh] sm:rounded-2xl"
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">
              Allergen item
            </div>

            {/* Scrollable content */}
            <div className="grow overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Item</div>
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-gray-300 px-2 py-1.5"
                    value={draft.item}
                    onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                    required
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
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                          className={`px-2 py-1 text-xs ${
                            val ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setDraft((d) => ({ ...d!, flags: { ...d!.flags, [a.key]: true } }))}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${
                            !val ? "bg-emerald-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setDraft((d) => ({ ...d!, flags: { ...d!.flags, [a.key]: false } }))}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="mt-2 block text-sm">
                <div className="mb-1 text-gray-600">Notes</div>
                <textarea
                  className="w-full rounded-xl border border-gray-300 px-2 py-1.5"
                  rows={3}
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </label>

              <p className="mt-1 text-xs text-gray-500">
                Press <kbd>Enter</kbd> to save, or <kbd>Esc</kbd> to cancel.
              </p>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Save &amp; lock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
