"use client";

import React, { useEffect, useMemo, useState } from "react";
import { uid } from "@/lib/uid";
import ActionMenu from "@/components/ActionMenu";
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
  lastReviewedOn?: string;
  lastReviewedBy?: string;
  intervalDays: number;
};

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
  const [orgId, setOrgId] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [review, setReview] = useState<ReviewInfo>({ intervalDays: 30 });
  const [rows, setRows] = useState<MatrixRow[]>([]);

  useEffect(() => {
    setHydrated(true);
    (async () => {
      try {
        const id = await getActiveOrgIdClient();
        setOrgId(id ?? null);
        if (!id) return;
        await loadFromSupabase(id);
      } catch (e: any) {
        setLoadErr(e?.message ?? "Failed to load allergens.");
      }
    })();
  }, []);

  async function loadFromSupabase(id = orgId) {
    if (!id) return;
    setCloudBusy(true);
    const { data: items } = await supabase
      .from("allergen_items")
      .select("id,item,category,notes,locked,organisation_id,org_id")
      .or(`organisation_id.eq.${id},org_id.eq.${id}`)
      .order("item", { ascending: true });

    const ids = (items ?? []).map((r: any) => r.id);
    const { data: flags } = await supabase
      .from("allergen_flags")
      .select("item_id,key,value")
      .in("item_id", ids);

    const flagsByItem: Record<string, Flags> = {};
    for (const i of ids) flagsByItem[i] = emptyFlags();
    for (const f of flags ?? []) {
      const k = f.key as AllergenKey;
      flagsByItem[f.item_id][k] = !!f.value;
    }

    setRows(
      (items ?? []).map((r: any) => ({
        id: r.id,
        item: r.item,
        category: r.category ?? undefined,
        notes: r.notes ?? undefined,
        flags: flagsByItem[r.id],
        locked: !!r.locked,
      }))
    );
    setCloudBusy(false);
  }

  async function upsertItem(d: {
    id?: string;
    item: string;
    category?: Category;
    notes?: string;
    flags: Flags;
  }) {
    const id = orgId ?? (await getActiveOrgIdClient());
    if (!id) return;
    let rowId = d.id;

    if (rowId) {
      await supabase
        .from("allergen_items")
        .update({
          item: d.item,
          category: d.category ?? null,
          notes: d.notes ?? null,
          locked: true,
          organisation_id: id,
        })
        .eq("id", rowId);
    } else {
      const { data } = await supabase
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
      rowId = data?.id;
    }

    if (rowId) {
      await supabase.from("allergen_flags").delete().eq("item_id", rowId);
      const payload = (Object.keys(d.flags) as AllergenKey[]).map((k) => ({
        item_id: rowId!,
        key: k,
        value: !!d.flags[k],
      }));
      await supabase.from("allergen_flags").insert(payload);
    }

    await loadFromSupabase();
  }

  async function deleteItem(id: string) {
    await supabase.from("allergen_flags").delete().eq("item_id", id);
    await supabase.from("allergen_items").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  /* ========== UI ========== */
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<MatrixRow | null>(null);
  const openAdd = () => {
    setDraft({
      id: "",
      item: "",
      category: "Starter",
      flags: emptyFlags(),
      notes: "",
      locked: false,
    });
    setModalOpen(true);
  };
  const openEdit = (r: MatrixRow) => {
    setDraft({ ...r, locked: false });
    setModalOpen(true);
  };
  const saveDraft = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft?.item.trim()) return;
    await upsertItem({
      id: draft.id || undefined,
      item: draft.item.trim(),
      category: draft.category,
      notes: draft.notes?.trim(),
      flags: draft.flags,
    });
    setModalOpen(false);
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-3 flex gap-2">
        <button
          className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          onClick={openAdd}
        >
          + Add item
        </button>
        <button
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => loadFromSupabase()}
        >
          Refresh from cloud
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-600 bg-white">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-2 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium">Category</th>
              {ALLERGENS.map((a) => (
                <th
                  key={a.key}
                  className="whitespace-nowrap px-2 py-2 text-center font-medium"
                >
                  {a.icon} <span className="font-mono text-[11px]">{a.short}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + ALLERGENS.length + 1}
                  className="px-3 py-6 text-center text-gray-500"
                >
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
                            yes
                              ? "bg-red-100 text-red-800"
                              : "bg-emerald-100 text-emerald-800"
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

      {/* Allergen legend */}
      <div className="mt-8 rounded-xl border border-gray-300 bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-gray-700">
          Allergen legend
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-700">
          {ALLERGENS.map((a) => (
            <div key={a.key} className="flex items-center gap-2">
              <span>{a.icon}</span>
              <span>{a.label}</span>
              <span className="ml-1 font-mono text-[11px] text-gray-500">
                {a.short}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && draft && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setModalOpen(false)}>
          <form
            onSubmit={saveDraft}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-3 flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow sm:mt-16 sm:h-[80vh] sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-base font-semibold">
              Allergen item
            </div>

            {/* fixed: content now visible */}
            <div className="grow min-h-0 overflow-y-auto px-4 py-3">
              <label className="text-sm block mb-3">
                <div className="mb-1 text-gray-600">Item</div>
                <input
                  className="w-full rounded-xl border border-gray-600 px-2 py-1.5"
                  value={draft.item}
                  onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                />
              </label>
              <label className="text-sm block mb-3">
                <div className="mb-1 text-gray-600">Category</div>
                <select
                  className="w-full rounded-xl border border-gray-600 px-2 py-1.5"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as Category })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 mb-3">
                {ALLERGENS.map((a) => {
                  const val = draft.flags[a.key];
                  return (
                    <div key={a.key} className="flex items-center justify-between rounded border p-2">
                      <span title={a.label} className="text-sm">
                        {a.icon}{" "}
                        <span className="font-mono text-[11px] text-gray-500">
                          {a.short}
                        </span>
                      </span>
                      <div className="inline-flex overflow-hidden rounded border">
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${
                            val
                              ? "bg-red-600 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              flags: { ...draft.flags, [a.key]: true },
                            })
                          }
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${
                            !val
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              flags: { ...draft.flags, [a.key]: false },
                            })
                          }
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
                  className="w-full rounded-xl border border-gray-600 px-2 py-1.5"
                  rows={3}
                  value={draft.notes ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                type="submit"
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
