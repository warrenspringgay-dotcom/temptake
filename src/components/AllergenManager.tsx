// src/components/AllergenManager.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { uid } from "@/lib/uid";
import ActionMenu from "@/components/ActionMenu";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import AllergenChangeTimeline from "@/components/AllergenChangeTimeline";

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
  { key: "gluten",      icon: "🌾", label: "Gluten",      short: "GLU" },
  { key: "crustaceans", icon: "🦐", label: "Crustaceans", short: "CRU" },
  { key: "eggs",        icon: "🥚", label: "Eggs",        short: "EGG" },
  { key: "fish",        icon: "🐟", label: "Fish",        short: "FIS" },
  { key: "peanuts",     icon: "🥜", label: "Peanuts",     short: "PEA" },
  { key: "soybeans",    icon: "🌱", label: "Soy",         short: "SOY" },
  { key: "milk",        icon: "🥛", label: "Milk",        short: "MIL" },
  { key: "nuts",        icon: "🌰", label: "Tree nuts",   short: "NUT" },
  { key: "celery",      icon: "🥬", label: "Celery",      short: "CEL" },
  { key: "mustard",     icon: "🌿", label: "Mustard",     short: "MUS" },
  { key: "sesame",      icon: "🧴", label: "Sesame",      short: "SES" },
  { key: "sulphites",   icon: "🧪", label: "Sulphites",   short: "SUL" },
  { key: "lupin",       icon: "🌼", label: "Lupin",       short: "LUP" },
  { key: "molluscs",    icon: "🐚", label: "Molluscs",    short: "MOL" },
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

const formatDateUK = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB");
};

function bumpVibrate(ms = 10) {
  if (typeof window === "undefined") return;
  const nav = window.navigator as any;
  if (typeof nav.vibrate === "function") {
    nav.vibrate(ms);
  }
}

async function fireConfetti() {
  try {
    const confettiModule = await import("canvas-confetti");
    confettiModule.default();
  } catch {
    // ignore
  }
}

/** Write an audit row when allergen items change */
async function logAllergenChange(params: {
  orgId: string;
  action: "create" | "update" | "delete";
  itemId: string;
  before?: MatrixRow | null;
  after?: MatrixRow | null;
}) {
  try {
    const locationId = await getActiveLocationIdClient().catch(() => null);

    await supabase.from("allergen_change_logs").insert({
      org_id: params.orgId,
      location_id: locationId,
      item_id: params.itemId,
      item_name: params.after?.item ?? params.before?.item ?? null,
      action: params.action,
      category_before: params.before?.category ?? null,
      category_after: params.after?.category ?? null,
      flags_before: params.before?.flags ?? null,
      flags_after: params.after?.flags ?? null,
      notes_before: params.before?.notes ?? null,
      notes_after: params.after?.notes ?? null,
      staff_initials: null, // can be wired to team_members.initials later
    });
  } catch (e) {
    console.error("Failed to log allergen change", e);
  }
}

/* ---------- Component ---------- */
export default function AllergenManager() {
  const [hydrated, setHydrated] = useState(false);

  // Cloud context
  const [orgId, setOrgId] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Permissions
  const [canManage, setCanManage] = useState(false);

  // State
  const [review, setReview] = useState<ReviewInfo>({ intervalDays: 30 });
  const [rows, setRows] = useState<MatrixRow[]>([]);

  // Change log refresh token
  const [changeLogRefreshKey, setChangeLogRefreshKey] = useState(0);

  // Query (safe foods)
  const [qCat, setQCat] = useState<"All" | Category>("All");
  const [qFlags, setQFlags] = useState<Flags>(emptyFlags());

  /* ---------- boot ---------- */
  useEffect(() => {
    setHydrated(true);
    (async () => {
      try {
        const id = await getActiveOrgIdClient();
        setOrgId(id ?? null);

        // determine permissions via team_members
        try {
          const userRes = await supabase.auth.getUser();
          const email = userRes.data.user?.email?.toLowerCase() ?? null;
          if (!id || !email) {
            setCanManage(false);
          } else {
            const { data, error } = await supabase
              .from("team_members")
              .select("role,email")
              .eq("org_id", id)
              .eq("email", email)
              .maybeSingle();
            if (error) {
              setCanManage(false);
            } else {
              const role = (data?.role ?? "").toLowerCase();
              setCanManage(
                role === "owner" || role === "manager" || role === "admin"
              );
            }
          }
        } catch {
          setCanManage(false);
        }

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

  /** Load items and flags from cloud */
  async function loadFromSupabase(id = orgId) {
    if (!id) return;
    setCloudBusy(true);
    setLoadErr(null);

    const { data: items, error: itemsErr } = await supabase
      .from("allergen_items")
      .select("id,item,category,notes,locked,org_id")
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
      const { data: flags, error: flagsErr } = await supabase
        .from("allergen_flags")
        .select("item_id,key,value")
        .in("item_id", ids);

      if (flagsErr) {
        setCloudBusy(false);
        setLoadErr(flagsErr.message);
        return;
      }

      for (const id of ids) flagsByItem[id] = emptyFlags();
      for (const f of flags ?? []) {
        const k = (f.key as AllergenKey) ?? null;
        if (!k) continue;
        if (!flagsByItem[f.item_id]) flagsByItem[f.item_id] = emptyFlags();
        flagsByItem[f.item_id][k] = !!(f as any).value;
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

    try {
      localStorage.setItem(LS_ROWS, JSON.stringify(list));
    } catch {}
  }

  // Load last review info – primary source: allergen_review (for KPIs),
  // fallback: allergen_review_log (for reviewer name / history).
  async function loadReviewFromSupabase(id = orgId) {
    if (!id) return;

    const nextState: ReviewInfo = {
      intervalDays: 30,
    };

    // 1) Settings row used by FoodTempLogger KPIs
    const { data: settings, error: settingsErr } = await supabase
      .from("allergen_review")
      .select("last_reviewed, interval_days")
      .eq("org_id", id)
      .maybeSingle();

    if (!settingsErr && settings) {
      if (settings.last_reviewed) {
        nextState.lastReviewedOn = settings.last_reviewed;
      }
      if (typeof settings.interval_days === "number") {
        nextState.intervalDays = settings.interval_days;
      }
    }

    // 2) Latest log row – mainly to get reviewer name
    const { data: logRow, error: logErr } = await supabase
      .from("allergen_review_log")
      .select("reviewed_on, reviewer, interval_days")
      .eq("org_id", id)
      .order("reviewed_on", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!logErr && logRow) {
      if (!nextState.lastReviewedOn && logRow.reviewed_on) {
        nextState.lastReviewedOn = logRow.reviewed_on;
      }
      if (
        typeof logRow.interval_days === "number" &&
        !settings?.interval_days
      ) {
        nextState.intervalDays = logRow.interval_days;
      }
      if (logRow.reviewer) {
        nextState.lastReviewedBy = logRow.reviewer;
      }
    }

    setReview(nextState);
    try {
      localStorage.setItem(LS_REVIEW, JSON.stringify(nextState));
    } catch {}
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

  /* ---------- CRUD ---------- */

  async function upsertItem(d: {
    id?: string;
    item: string;
    category?: Category;
    notes?: string;
    flags: Flags;
  }) {
    if (!canManage) {
      alert("Only managers / owners can edit the allergen matrix.");
      return;
    }

    const currentOrgId = orgId ?? (await getActiveOrgIdClient());

    // capture "before" snapshot for change log
    const beforeRow = d.id ? rows.find((r) => r.id === d.id) ?? null : null;

    const applyLocal = (forcedId?: string) => {
      setRows((rs) => {
        const idToUse = forcedId ?? d.id ?? uid();
        const patch: MatrixRow = {
          id: idToUse,
          item: d.item,
          category: d.category,
          flags: d.flags,
          notes: d.notes,
          locked: true,
        };
        const exists = rs.some((r) => r.id === idToUse);
        return exists
          ? rs.map((r) => (r.id === idToUse ? { ...r, ...patch } : r))
          : [...rs, patch];
      });
    };

    // No org => purely local
    if (!currentOrgId) {
      applyLocal();
      return;
    }

    let rowId = d.id as string | undefined;

    try {
      // 1) Save / update the main allergen_items row
      if (rowId) {
        const { error } = await supabase
          .from("allergen_items")
          .update({
            item: d.item,
            category: d.category ?? null,
            notes: d.notes ?? null,
            locked: true,
            org_id: currentOrgId,
            organisation_id: currentOrgId,
          })
          .eq("id", rowId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("allergen_items")
          .insert({
            item: d.item,
            category: d.category ?? null,
            notes: d.notes ?? null,
            locked: true,
            org_id: currentOrgId,
            organisation_id: currentOrgId,
          })
          .select("id")
          .single();

        if (error) throw error;
        rowId = String(data!.id);
      }

      // 2) Upsert all flags for that item
      // 2) Upsert all flags for that item
if (rowId) {
  const payload = (Object.keys(d.flags) as AllergenKey[]).map((k) => ({
    item_id: rowId!,
    key: k,
    value: !!d.flags[k],
  }));

  if (payload.length) {
    const { error: flagsErr } = await supabase
      .from("allergen_flags")
      .upsert(payload, {
        onConflict: "item_id,key",
      });

    if (flagsErr) {
      console.warn(
        "Saving allergen flags failed (ignored — item still saved):",
        flagsErr.message
      );
    }
  }
}

      // 3) Log change
      if (currentOrgId && rowId) {
        const afterRow: MatrixRow = {
          id: rowId,
          item: d.item,
          category: d.category,
          flags: d.flags,
          notes: d.notes,
          locked: true,
        };

        await logAllergenChange({
          orgId: currentOrgId,
          action: d.id ? "update" : "create",
          itemId: rowId,
          before: beforeRow,
          after: afterRow,
        });

        // poke the timeline to re-fetch
        setChangeLogRefreshKey((n) => n + 1);
      }

      applyLocal(rowId);
    } catch (error: any) {
      console.error("Saving allergen item failed:", error);
      alert(`Save failed: ${error?.message ?? "Unknown error"}`);
    }
  }

  async function deleteItem(idToDelete: string) {
    if (!canManage) {
      alert("Only managers / owners can delete allergen rows.");
      return;
    }

    const currentOrgId = orgId ?? (await getActiveOrgIdClient());
    const beforeRow = rows.find((r) => r.id === idToDelete) ?? null;

    if (!currentOrgId) {
      // local only
      setRows((rs) => rs.filter((r) => r.id !== idToDelete));
      return;
    }

    try {
      await supabase.from("allergen_flags").delete().eq("item_id", idToDelete);

      const { error } = await supabase
        .from("allergen_items")
        .delete()
        .eq("id", idToDelete);

      if (error) {
        alert(`Delete failed: ${error.message}`);
        return;
      }

      // log delete
      if (beforeRow) {
        await logAllergenChange({
          orgId: currentOrgId,
          action: "delete",
          itemId: idToDelete,
          before: beforeRow,
          after: null,
        });
        setChangeLogRefreshKey((n) => n + 1);
      }

      setRows((rs) => rs.filter((r) => r.id !== idToDelete));
    } catch (e: any) {
      alert(e?.message || "Delete failed.");
    }
  }

  /* ---------- review save ---------- */
  async function markReviewedToday() {
    if (!canManage) {
      alert(
        "Only managers / owners can mark the allergen register as reviewed."
      );
      return;
    }

    const id = orgId ?? (await getActiveOrgIdClient());
    const today = todayISO();

    // Who is reviewing (prefer team member name)
    let reviewer = "Manager";

    try {
      const userRes = await supabase.auth.getUser();
      const email = userRes.data.user?.email?.toLowerCase() ?? null;

      if (email && id) {
        const { data: tm } = await supabase
          .from("team_members")
          .select("name")
          .eq("email", email)
          .eq("org_id", id)
          .maybeSingle();

        reviewer = tm?.name ?? email ?? reviewer;
      }
    } catch {
      // ignore
    }

    // Update local pill state immediately
    setReview((r) => ({
      ...r,
      lastReviewedOn: today,
      lastReviewedBy: reviewer,
    }));

    // No org: local only (still give a little celebration)
    if (!id) {
      await fireConfetti();
      bumpVibrate();
      return;
    }

    // Persist both settings row (used by KPIs) and history log
    const newInterval = review.intervalDays || 30;

    const { error: settingsErr } = await supabase
      .from("allergen_review")
      .upsert(
        {
          org_id: id,
          last_reviewed: today,
          interval_days: newInterval,
        },
        { onConflict: "org_id" }
      );

    const { error: logErr } = await supabase.from("allergen_review_log").insert({
      org_id: id,
      reviewed_on: today,
      reviewer,
      interval_days: newInterval,
      notes: null,
      created_at: new Date().toISOString(),
    });

    if (settingsErr || logErr) {
      const msg = settingsErr?.message ?? logErr?.message ?? "Unknown error";
      alert(`Failed to save review: ${msg}`);
      return;
    }

    await fireConfetti();
    bumpVibrate(15);
  }

  /* ===== Query (SAFE FOODS) ===== */
  const selectedAllergenKeys = useMemo(
    () =>
      (ALLERGENS.map((a) => a.key) as AllergenKey[]).filter((k) => qFlags[k]),
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
  type Draft = Omit<MatrixRow, "id" | "locked"> & {
    id?: string;
    locked?: boolean;
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const openAdd = () => {
    if (!canManage) {
      alert("Only managers / owners can add allergen items.");
      return;
    }
    setDraft({ item: "", category: "Starter", flags: emptyFlags(), notes: "" });
    setModalOpen(true);
  };
  const openEdit = (row: MatrixRow) => {
    if (!canManage) {
      alert("Only managers / owners can edit allergen items.");
      return;
    }
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
      ? "border-red-200 bg-red-50/80"
      : "border-emerald-200 bg-emerald-50/80"
    : "border-slate-200 bg-white/70";

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur">
      {/* Header row – matches other pages, no date */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Allergens</h1>
      </div>

      {/* Review panel */}
      <div
        className={`rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm ${reviewPanelTone}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-medium text-slate-900">
              Allergen register review
            </div>
            <div className="text-xs text-slate-600">
              Last reviewed:{" "}
              {review.lastReviewedOn ? (
                <span className="font-medium">
                  {formatDateUK(review.lastReviewedOn)}
                </span>
              ) : (
                <span className="italic">never</span>
              )}
              {review.lastReviewedBy ? ` by ${review.lastReviewedBy}` : ""} ·
              Interval (days): {review.intervalDays}
            </div>
          </div>
          <div className="flex w-full max-w-[360px] items-center gap-2 sm:w-auto sm:max-w-none">
            <input
              type="number"
              min={7}
              className="w-24 flex-1 rounded-xl border border-slate-300 bg-white/80 px-2 py-1 text-sm"
              value={review.intervalDays}
              onChange={(e) =>
                setReview((r) => ({
                  ...r,
                  intervalDays: Math.max(1, Number(e.target.value || "0")),
                }))
              }
              disabled={!canManage}
            />
            <button
              className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              onClick={markReviewedToday}
              disabled={!canManage}
            >
              Mark reviewed today
            </button>
          </div>
        </div>
      </div>

      {/* QUERY – SAFE FOODS */}
      <details className="mb-4 rounded-2xl border border-slate-200 bg-white/70 p-3 backdrop-blur-sm">
        <summary className="cursor-pointer select-none text-sm font-medium text-slate-900">
          Allergen Query (safe foods)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">
              Category
            </div>
            <select
              className="w-full rounded-md border border-slate-300 bg-white/80 px-2 py-1.5 text-sm"
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
            <p className="mt-2 text-xs text-slate-600">
              Only items <strong>without</strong> the selected allergens appear
              below.
            </p>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">
              Select allergens to exclude
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {ALLERGENS.map((a) => (
                <label
                  key={a.key}
                  className="inline-flex items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={qFlags[a.key]}
                    onChange={(e) =>
                      setQFlags((f) => ({ ...f, [a.key]: e.target.checked }))
                    }
                    className="accent-emerald-600"
                  />
                  <span title={a.label}>
                    {a.icon}{" "}
                    <span className="font-mono text-[11px] text-slate-500">
                      {a.short}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => setQFlags(emptyFlags())}
              >
                Clear selection
              </button>
              <span className="text-xs text-slate-600">
                Selected: {Object.values(qFlags).filter(Boolean).length}
              </span>
            </div>
          </div>
        </div>

        {/* Safe results */}
        {hydrated && selectedAllergenKeys.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Safe foods ({safeFoods.length})
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50/80">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {safeFoods.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No safe items for this selection.
                      </td>
                    </tr>
                  )}
                  {safeFoods.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-900">{r.item}</td>
                      <td className="px-3 py-2 text-slate-900">
                        {r.category ?? ""}
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        {r.notes ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </details>

      {/* Top actions */}
      <div className="mb-1 flex flex-col gap-2 sm:flex-row">
        <button
          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          onClick={openAdd}
          disabled={!canManage}
        >
          + Add item
        </button>

        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => loadFromSupabase()}
          disabled={cloudBusy || !orgId}
          title={orgId ? "Reload from cloud" : "No organisation (local only)"}
        >
          {cloudBusy ? "Loading…" : "Refresh from cloud"}
        </button>
      </div>

      {/* MATRIX – Desktop table */}
      <div className="mb-2 hidden text-sm font-semibold text-slate-900 md:block">
        Allergen matrix
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm md:block">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-slate-500">
              <th className="px-2 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium">Category</th>
              {ALLERGENS.map((a) => (
                <th
                  key={a.key}
                  className="whitespace-nowrap px-2 py-2 text-center font-medium"
                >
                  {a.icon}{" "}
                  <span className="font-mono text-[11px] text-slate-500">
                    {a.short}
                  </span>
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
                  className="px-3 py-6 text-center text-slate-500"
                >
                  {loadErr ? `Error: ${loadErr}` : "No items."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 align-top"
                >
                  <td className="px-3 py-2 text-slate-900">{row.item}</td>
                  <td className="px-3 py-2 text-slate-900">
                    {row.category ?? ""}
                  </td>
                  {ALLERGENS.map((a) => {
                    const yes = row.flags[a.key];
                    return (
                      <td key={a.key} className="px-2 py-2 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
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
                    {canManage && (
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
                    )}
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
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-center text-slate-500">
            {loadErr ? `Error: ${loadErr}` : "No items."}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">
                      {row.item}
                    </div>
                    {row.category ? (
                      <div className="text-xs text-slate-500">
                        {row.category}
                      </div>
                    ) : null}
                  </div>
                  {canManage && (
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
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {ALLERGENS.map((a) => {
                    const yes = row.flags[a.key];
                    return (
                      <div
                        key={a.key}
                        className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                          yes
                            ? "bg-red-50 text-red-800"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <span>{a.icon}</span>
                          <span className="font-mono">{a.short}</span>
                        </span>
                        <span className="font-medium">
                          {yes ? "Yes" : "No"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {row.notes ? (
                  <div className="mt-2 text-xs text-slate-600">
                    {row.notes}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm">
        <div className="mb-2 text-sm font-semibold text-slate-900">
          Allergen legend
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {ALLERGENS.map((a) => (
            <div key={a.key} className="flex items-center gap-2 text-sm">
              <span>{a.icon}</span>
              <span className="truncate text-slate-800">
                {a.label}{" "}
                <span className="font-mono text-[11px] text-slate-500">
                  {a.short}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent allergen change log */}
      <AllergenChangeTimeline refreshKey={changeLogRefreshKey} />

      {/* Modal */}
      {modalOpen && draft && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={closeModal}
        >
          <form
            onSubmit={saveDraft}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur sm:mt-16 sm:h-[70vh] sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 text-base font-semibold text-slate-900 backdrop-blur">
              Allergen item
            </div>

            <div className="grow overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Item</div>
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5"
                    value={draft.item}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d!, item: e.target.value }))
                    }
                    required
                  />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Category</div>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5"
                    value={draft.category ?? "Starter"}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d!,
                        category: e.target.value as Category,
                      }))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ALLERGENS.map((a) => {
                  const val = draft.flags[a.key];
                  return (
                    <div
                      key={a.key}
                      className="flex items-center justify-between rounded border border-slate-200 bg-white/80 p-2"
                    >
                      <span
                        title={a.label}
                        className="text-sm text-slate-800"
                      >
                        {a.icon}{" "}
                        <span className="font-mono text-[11px] text-slate-500">
                          {a.short}
                        </span>
                      </span>
                      <div className="inline-flex overflow-hidden rounded border border-slate-200 bg-white/80">
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${
                            val
                              ? "bg-red-600 text-white"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() =>
                            setDraft((d) => ({
                              ...d!,
                              flags: { ...d!.flags, [a.key]: true },
                            }))
                          }
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${
                            !val
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() =>
                            setDraft((d) => ({
                              ...d!,
                              flags: { ...d!.flags, [a.key]: false },
                            }))
                          }
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="mt-2 block text-sm">
                <div className="mb-1 text-slate-600">Notes</div>
                <textarea
                  className="w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5"
                  rows={3}
                  value={draft.notes ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d!, notes: e.target.value }))
                  }
                />
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Press <kbd>Enter</kbd> to save, or <kbd>Esc</kbd> to cancel.
              </p>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                Save &amp; lock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
