// src/components/AllergenManager.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { uid } from "@/lib/uid";
import ActionMenu from "@/components/ActionMenu";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import AllergenChangeTimeline from "@/components/AllergenChangeTimeline";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

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
  ingredientsText?: string;
  ingredientsLabelImageUrl?: string;
  locked: boolean;
};

type ReviewInfo = {
  lastReviewedOn?: string;
  lastReviewedBy?: string;
  intervalDays: number;
};

const LS_ROWS = "tt_allergens_rows_v3";
const LS_REVIEW = "tt_allergens_review_v2";
const ALLERGEN_LABEL_BUCKET = "allergen-labels";

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
  if (typeof nav.vibrate === "function") nav.vibrate(ms);
}

async function fireConfetti() {
  try {
    const confettiModule = await import("canvas-confetti");
    confettiModule.default();
  } catch {
    // ignore
  }
}

function isManagerRole(role: string | null | undefined) {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "owner" || r === "admin" || r === "manager";
}

function initialsFromName(name: string | null | undefined) {
  const s = String(name ?? "").trim();
  if (!s) return null;
  const parts = s.split(/\s+/).filter(Boolean);
  const out = parts
    .slice(0, 2)
    .map((p) => (p[0] ? p[0].toUpperCase() : ""))
    .join("");
  return out || null;
}

function fileExtFromName(filename: string | null | undefined) {
  const name = String(filename ?? "").trim();
  const parts = name.split(".");
  if (parts.length < 2) return "jpg";
  return parts.pop()?.toLowerCase() || "jpg";
}

function buildAllergenLabelPath(params: {
  orgId: string;
  itemId: string;
  filename: string;
}) {
  const ext = fileExtFromName(params.filename);
  return `${params.orgId}/${params.itemId}/ingredients-label.${ext}`;
}

/** Write an audit row when allergen items change */
async function logAllergenChange(params: {
  orgId: string;
  action: "create" | "update" | "delete";
  itemId: string;
  before?: MatrixRow | null;
  after?: MatrixRow | null;
  staffInitials: string | null;
}) {
  try {
    const locationId = await getActiveLocationIdClient().catch(() => null);

    const { error } = await supabase.from("allergen_change_logs").insert({
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
      staff_initials: params.staffInitials,
    });

    if (error) console.error("Failed to log allergen change:", error.message);
  } catch (e) {
    console.error("Failed to log allergen change (unexpected):", e);
  }
}

async function resolveCanManage(params: {
  orgId: string | null;
  userId: string | null;
  email: string | null;
}): Promise<boolean> {
  if (!params.orgId) return !!(params.userId || params.email);

  const orgId = params.orgId;
  const email = (params.email ?? "").trim().toLowerCase();
  const userId = params.userId ?? null;

  const roleAllows = (role: any) => {
    const r = String(role ?? "").toLowerCase();
    return r === "owner" || r === "manager" || r === "admin";
  };

  if (userId) {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .limit(50);

      if (!error && Array.isArray(data) && data.some((r) => roleAllows((r as any).role)))
        return true;
    } catch {
      // ignore
    }
  }

  if (!email) return false;

  const { data, error } = await supabase
    .from("team_members")
    .select("role,email")
    .eq("org_id", orgId)
    .ilike("email", email)
    .limit(50);

  if (error || !Array.isArray(data)) return false;
  return data.some((r) => roleAllows((r as any).role));
}

/* ---------- Component ---------- */
export default function AllergenManager() {
  const { operator } = useWorkstation();

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

  // Auth user's initials (fallback when no operator session)
  const [authUserInitials, setAuthUserInitials] = useState<string>("");

  // Change log refresh token
  const [changeLogRefreshKey, setChangeLogRefreshKey] = useState(0);

  // Query (safe foods)
  const [qCat, setQCat] = useState<"All" | Category>("All");
  const [qFlags, setQFlags] = useState<Flags>(emptyFlags());

  const operatorInitials =
    (operator?.initials ?? "").trim().toUpperCase() ||
    initialsFromName(operator?.name) ||
    null;

  /* ---------- Reviewer resolution (operator-first, click-time safe) ---------- */
  async function getReviewerLabel(): Promise<string> {
    // 1) Workstation operator wins
    const opIni =
      (operator?.initials ?? "").trim().toUpperCase() ||
      initialsFromName(operator?.name) ||
      "";
    if (opIni) return opIni;

    const opName = (operator?.name ?? "").trim();
    if (opName) return opName;

    // 2) Fallback: auth user's initials if we have them
    const authIni = (authUserInitials ?? "").trim().toUpperCase();
    if (authIni) return authIni;

    // 3) Fallback: auth email (better than lying)
    try {
      const { data } = await supabase.auth.getUser();
      const email = (data.user?.email ?? "").trim();
      if (email) return email;
    } catch {
      // ignore
    }

    return "Manager";
  }

  /* ---------- boot ---------- */
  useEffect(() => {
    let cancelled = false;

    setHydrated(true);

    (async () => {
      try {
        primeLocal();

        const [{ data: auth }, org] = await Promise.all([
          supabase.auth.getUser(),
          getActiveOrgIdClient().catch(() => null),
        ]);

        if (cancelled) return;

        setOrgId(org ?? null);

        if (org) {
          await loadAuthUserInitials(org);
        }

        // ✅ Operator wins for permissions (PIN/operator mode)
        if (operator?.role) {
          setCanManage(isManagerRole(operator.role));
        } else {
          const userId = auth?.user?.id ?? null;
          const email = auth?.user?.email?.toLowerCase().trim() ?? null;

          const allowed = await resolveCanManage({
            orgId: org ?? null,
            userId,
            email,
          });

          if (!cancelled) setCanManage(allowed);
        }

        // If we have an org, load cloud data (overwrites local shadow)
        if (org) {
          await Promise.all([loadFromSupabase(org), loadReviewFromSupabase(org)]);
        }
      } catch (e: any) {
        if (!cancelled) setLoadErr(e?.message ?? "Failed to load allergens.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operator?.role]);

  function primeLocal() {
    try {
      const rawRows = localStorage.getItem(LS_ROWS);
      if (rawRows) {
        const parsed = JSON.parse(rawRows) as MatrixRow[];
        setRows(
          parsed.map((r) => ({
            ...r,
            flags: { ...emptyFlags(), ...r.flags },
            ingredientsText: r.ingredientsText ?? "",
            ingredientsLabelImageUrl: r.ingredientsLabelImageUrl ?? "",
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
            ingredientsText: "",
            ingredientsLabelImageUrl: "",
            locked: true,
          },
          {
            id: uid(),
            item: "Prawn Cocktail",
            category: "Starter",
            flags: { ...emptyFlags(), crustaceans: true },
            notes: "",
            ingredientsText: "",
            ingredientsLabelImageUrl: "",
            locked: true,
          },
          {
            id: uid(),
            item: "Fruit Salad",
            category: "Dessert",
            flags: { ...emptyFlags() },
            notes: "",
            ingredientsText: "",
            ingredientsLabelImageUrl: "",
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

  async function loadAuthUserInitials(org: string) {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      if (!userId) return;

      const lid = await getActiveLocationIdClient().catch(() => null);

      let row: any = null;

      if (lid) {
        const byLoc = await supabase
          .from("team_members")
          .select("initials")
          .eq("org_id", org)
          .eq("user_id", userId)
          .eq("location_id", lid)
          .maybeSingle();

        if (!byLoc.error && byLoc.data) row = byLoc.data;
      }

      if (!row) {
        const byOrg = await supabase
          .from("team_members")
          .select("initials")
          .eq("org_id", org)
          .eq("user_id", userId)
          .is("location_id", null)
          .maybeSingle();

        if (!byOrg.error && byOrg.data) row = byOrg.data;
      }

      const ini = String(row?.initials ?? "").trim().toUpperCase();
      if (ini) setAuthUserInitials(ini);
    } catch {
      // ignore
    }
  }

  /** Load items and flags from cloud */
  async function loadFromSupabase(id = orgId) {
    if (!id) return;
    setCloudBusy(true);
    setLoadErr(null);

    const { data: items, error: itemsErr } = await supabase
      .from("allergen_items")
      .select(
        "id,item,category,notes,ingredients_text,ingredients_label_image_url,locked,org_id"
      )
      .or(`organisation_id.eq.${id},org_id.eq.${id}`)
      .order("item", { ascending: true });

    if (itemsErr) {
      setCloudBusy(false);
      setLoadErr(itemsErr.message);
      return;
    }

    const ids = (items ?? []).map((r: any) => r.id);
    const flagsByItem: Record<string, Flags> = {};

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

      for (const id2 of ids) flagsByItem[id2] = emptyFlags();
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
      ingredientsText: r.ingredients_text ?? "",
      ingredientsLabelImageUrl: r.ingredients_label_image_url ?? "",
      locked: !!r.locked,
    }));

    setRows(list);
    setCloudBusy(false);

    try {
      localStorage.setItem(LS_ROWS, JSON.stringify(list));
    } catch {}
  }

  async function loadReviewFromSupabase(id = orgId) {
    if (!id) return;

    const nextState: ReviewInfo = { intervalDays: 30 };

    const { data: settings, error: settingsErr } = await supabase
      .from("allergen_review")
      .select("last_reviewed, interval_days, reviewer")
      .eq("org_id", id)
      .maybeSingle();

    if (!settingsErr && settings) {
      if (settings.last_reviewed) nextState.lastReviewedOn = settings.last_reviewed;
      if (typeof settings.interval_days === "number") nextState.intervalDays = settings.interval_days;
      if (settings.reviewer) nextState.lastReviewedBy = settings.reviewer;
    }

    const { data: logRow, error: logErr } = await supabase
      .from("allergen_review_log")
      .select("reviewed_on, reviewer, interval_days")
      .eq("org_id", id)
      .order("reviewed_on", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!logErr && logRow) {
      if (!nextState.lastReviewedOn && logRow.reviewed_on) nextState.lastReviewedOn = logRow.reviewed_on;
      if (typeof logRow.interval_days === "number" && !settings?.interval_days)
        nextState.intervalDays = logRow.interval_days;
      if (logRow.reviewer) nextState.lastReviewedBy = logRow.reviewer;
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
  ingredientsText?: string;
  ingredientsLabelImageUrl?: string;
  flags: Flags;
}): Promise<boolean> {
  if (!canManage) {
    alert("Only managers / owners can edit the allergen matrix.");
    return false;
  }

  const currentOrgId = orgId ?? (await getActiveOrgIdClient().catch(() => null));
  const beforeRow = d.id ? rows.find((r) => r.id === d.id) ?? null : null;
  const isExistingRow = !!beforeRow;

  const applyLocal = (forcedId?: string) => {
    setRows((rs) => {
      const idToUse = forcedId ?? d.id ?? uid();
      const patch: MatrixRow = {
        id: idToUse,
        item: d.item,
        category: d.category,
        flags: d.flags,
        notes: d.notes,
        ingredientsText: d.ingredientsText ?? "",
        ingredientsLabelImageUrl: d.ingredientsLabelImageUrl ?? "",
        locked: true,
      };
      const exists = rs.some((r) => r.id === idToUse);
      return exists ? rs.map((r) => (r.id === idToUse ? { ...r, ...patch } : r)) : [...rs, patch];
    });
  };

  if (!currentOrgId) {
    applyLocal();
    return true;
  }

  let rowId = isExistingRow ? d.id : undefined;

  try {
    if (isExistingRow && rowId) {
      const { data: updated, error } = await supabase
        .from("allergen_items")
        .update({
          item: d.item,
          category: d.category ?? null,
          notes: d.notes ?? null,
          ingredients_text: d.ingredientsText ?? null,
          ingredients_label_image_url: d.ingredientsLabelImageUrl ?? null,
          locked: true,
          org_id: currentOrgId,
          organisation_id: currentOrgId,
        })
        .eq("id", rowId)
        .select("id")
        .single();

      if (error) throw error;
      rowId = String(updated.id);
    } else {
      const { data, error } = await supabase
        .from("allergen_items")
        .insert({
          item: d.item,
          category: d.category ?? null,
          notes: d.notes ?? null,
          ingredients_text: d.ingredientsText ?? null,
          ingredients_label_image_url: d.ingredientsLabelImageUrl ?? null,
          locked: true,
          org_id: currentOrgId,
          organisation_id: currentOrgId,
        })
        .select("id")
        .single();

      if (error) throw error;
      rowId = String(data.id);
    }

    if (rowId) {
      const payload = (Object.keys(d.flags) as AllergenKey[]).map((k) => ({
        item_id: rowId!,
        key: k,
        value: !!d.flags[k],
        org_id: currentOrgId,
      }));

      if (payload.length) {
        const { error: flagsErr } = await supabase
          .from("allergen_flags")
          .upsert(payload, { onConflict: "item_id,key" });

        if (flagsErr) {
          console.warn("Saving allergen flags failed:", flagsErr.message);
          throw flagsErr;
        }
      }
    }

    if (currentOrgId && rowId) {
      const afterRow: MatrixRow = {
        id: rowId,
        item: d.item,
        category: d.category,
        flags: d.flags,
        notes: d.notes,
        ingredientsText: d.ingredientsText ?? "",
        ingredientsLabelImageUrl: d.ingredientsLabelImageUrl ?? "",
        locked: true,
      };

      await logAllergenChange({
        orgId: currentOrgId,
        action: isExistingRow ? "update" : "create",
        itemId: rowId,
        before: beforeRow,
        after: afterRow,
        staffInitials: operatorInitials,
      });

      setChangeLogRefreshKey((n) => n + 1);
    }

    applyLocal(rowId);
    return true;
  } catch (error: any) {
    console.error("Saving allergen item failed:", error);
    alert(`Save failed: ${error?.message ?? "Unknown error"}`);
    return false;
  }
}

  async function deleteItem(idToDelete: string) {
    if (!canManage) {
      alert("Only managers / owners can delete allergen rows.");
      return;
    }

    const currentOrgId = orgId ?? (await getActiveOrgIdClient().catch(() => null));
    const beforeRow = rows.find((r) => r.id === idToDelete) ?? null;

    if (!currentOrgId) {
      setRows((rs) => rs.filter((r) => r.id !== idToDelete));
      return;
    }

    try {
      await supabase.from("allergen_flags").delete().eq("item_id", idToDelete);

      const { error } = await supabase.from("allergen_items").delete().eq("id", idToDelete);
      if (error) {
        alert(`Delete failed: ${error.message}`);
        return;
      }

      if (beforeRow) {
        await logAllergenChange({
          orgId: currentOrgId,
          action: "delete",
          itemId: idToDelete,
          before: beforeRow,
          after: null,
          staffInitials: operatorInitials,
        });
        setChangeLogRefreshKey((n) => n + 1);
      }

      setRows((rs) => rs.filter((r) => r.id !== idToDelete));
    } catch (e: any) {
      alert(e?.message || "Delete failed.");
    }
  }

  async function markReviewedToday() {
    if (!canManage) {
      alert("Only managers / owners can mark the allergen register as reviewed.");
      return;
    }

    const id = orgId ?? (await getActiveOrgIdClient().catch(() => null));
    const today = todayISO();

    // ✅ Operator-first, click-time computed (no stale render values)
    const reviewer = await getReviewerLabel();
    const newInterval = review.intervalDays || 30;

    setReview((r) => ({
      ...r,
      lastReviewedOn: today,
      lastReviewedBy: reviewer,
      intervalDays: newInterval,
    }));

    if (!id) {
      await fireConfetti();
      bumpVibrate();
      return;
    }

    const { data: existing, error: existingErr } = await supabase
      .from("allergen_review")
      .select("org_id")
      .eq("org_id", id)
      .maybeSingle();

    if (existingErr) {
      alert(`Failed to save review: ${existingErr.message}`);
      return;
    }

    if (existing) {
      const { error: updErr } = await supabase
        .from("allergen_review")
        .update({
          last_reviewed: today,
          interval_days: newInterval,
          reviewer,
        })
        .eq("org_id", id);

      if (updErr) {
        alert(`Failed to save review: ${updErr.message}`);
        return;
      }
    } else {
      const { error: insErr } = await supabase.from("allergen_review").insert({
        org_id: id,
        last_reviewed: today,
        interval_days: newInterval,
        reviewer,
      });

      if (insErr) {
        alert(`Failed to save review: ${insErr.message}`);
        return;
      }
    }

    const { error: logErr } = await supabase.from("allergen_review_log").insert({
      org_id: id,
      reviewed_on: today,
      reviewer,
      interval_days: newInterval,
      notes: null,
    });

    if (logErr) {
      alert(`Failed to save review: ${logErr.message}`);
      return;
    }

    await fireConfetti();
    bumpVibrate(15);
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
  const [viewRow, setViewRow] = useState<MatrixRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const openAdd = () => {
    if (!canManage) {
      alert("Only managers / owners can add allergen items.");
      return;
    }
    setDraft({
      item: "",
      category: "Starter",
      flags: emptyFlags(),
      notes: "",
      ingredientsText: "",
      ingredientsLabelImageUrl: "",
    });
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
      ingredientsText: row.ingredientsText ?? "",
      ingredientsLabelImageUrl: row.ingredientsLabelImageUrl ?? "",
    });
    setModalOpen(true);
  };

  const openView = (row: MatrixRow) => {
    setViewRow(row);
    setViewOpen(true);
  };

  const closeModal = () => setModalOpen(false);
  const closeViewModal = () => setViewOpen(false);

  async function uploadIngredientsLabel(file: File) {
    if (!draft) return;
    if (!orgId) {
      alert("No organisation found. Please refresh and try again.");
      return;
    }

    const itemIdForPath = draft.id ?? uid();
    const path = buildAllergenLabelPath({
      orgId,
      itemId: itemIdForPath,
      filename: file.name,
    });

    setUploadingImage(true);

    try {
      const { error: uploadErr } = await supabase.storage
        .from(ALLERGEN_LABEL_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from(ALLERGEN_LABEL_BUCKET)
        .getPublicUrl(path);

      const url = publicUrlData?.publicUrl ?? "";
      if (!url) throw new Error("Image uploaded but URL could not be created.");

      setDraft((d) =>
        d
          ? {
              ...d,
              id: d.id ?? itemIdForPath,
              ingredientsLabelImageUrl: url,
            }
          : d
      );
    } catch (e: any) {
      alert(`Image upload failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setUploadingImage(false);
    }
  }

const saveDraft = async (e?: React.FormEvent) => {
  e?.preventDefault();
  if (!draft || !draft.item.trim()) return;

  const ok = await upsertItem({
    id: draft.id,
    item: draft.item.trim(),
    category: draft.category,
    flags: draft.flags,
    notes: (draft.notes ?? "").trim(),
    ingredientsText: (draft.ingredientsText ?? "").trim(),
    ingredientsLabelImageUrl: (draft.ingredientsLabelImageUrl ?? "").trim(),
  });

  if (ok) {
    setModalOpen(false);
  }
};

  const reviewPanelTone = hydrated
    ? overdue(review)
      ? "border-red-200 bg-red-50/80"
      : "border-emerald-200 bg-emerald-50/80"
    : "border-slate-200 bg-white/70";

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Allergens</h1>
      </div>

      <div className={`rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm ${reviewPanelTone}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-medium text-slate-900">Allergen register review</div>
            <div className="text-xs text-slate-600">
              Last reviewed:{" "}
              {review.lastReviewedOn ? (
                <span className="font-medium">{formatDateUK(review.lastReviewedOn)}</span>
              ) : (
                <span className="italic">never</span>
              )}
              {review.lastReviewedBy ? ` by ${review.lastReviewedBy}` : ""} · Interval (days):{" "}
              {review.intervalDays}
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

      <details className="mb-4 rounded-2xl border border-slate-200 bg-white/70 p-3 backdrop-blur-sm">
        <summary className="cursor-pointer select-none text-sm font-medium text-slate-900">
          Allergen Query (safe foods)
        </summary>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">Category</div>
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
              Only items <strong>without</strong> the selected allergens appear below.
            </p>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">Select allergens to exclude</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {ALLERGENS.map((a) => (
                <label key={a.key} className="inline-flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={qFlags[a.key]}
                    onChange={(e) => setQFlags((f) => ({ ...f, [a.key]: e.target.checked }))}
                    className="accent-emerald-600"
                  />
                  <span title={a.label}>
                    {a.icon} <span className="font-mono text-[11px] text-slate-500">{a.short}</span>
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
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                        No safe items for this selection.
                      </td>
                    </tr>
                  )}
                  {safeFoods.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-900">{r.item}</td>
                      <td className="px-3 py-2 text-slate-900">{r.category ?? ""}</td>
                      <td className="px-3 py-2 text-slate-900">{r.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </details>

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

      <div className="mb-2 hidden text-sm font-semibold text-slate-900 md:block">Allergen matrix</div>

      {/* Desktop: scrollable grid with sticky header */}
      <div className="hidden md:block">
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="max-h-[70vh] overflow-auto rounded-2xl">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur">
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  {ALLERGENS.map((a) => (
                    <th key={a.key} className="whitespace-nowrap px-2 py-2 text-center font-medium">
                      {a.icon} <span className="font-mono text-[11px] text-slate-500">{a.short}</span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2 + ALLERGENS.length + 1} className="px-3 py-6 text-center text-slate-500">
                      {loadErr ? `Error: ${loadErr}` : "No items."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{row.item}</span>
                          {(row.ingredientsText || row.ingredientsLabelImageUrl) && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              extra info
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-900">{row.category ?? ""}</td>
                      {ALLERGENS.map((a) => {
                        const yes = row.flags[a.key];
                        return (
                          <td key={a.key} className="px-2 py-2 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
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
                            { label: "View", onClick: () => openView(row) },
                            ...(canManage
                              ? [
                                  { label: "Edit", onClick: () => openEdit(row) },
                                  {
                                    label: "Delete",
                                    onClick: () => void deleteItem(row.id),
                                    variant: "danger" as const,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-center text-slate-500">
            {loadErr ? `Error: ${loadErr}` : "No items."}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{row.item}</div>
                    {row.category ? <div className="text-xs text-slate-500">{row.category}</div> : null}
                    {(row.ingredientsText || row.ingredientsLabelImageUrl) && (
                      <div className="mt-1">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          extra info
                        </span>
                      </div>
                    )}
                  </div>
                  <ActionMenu
                    items={[
                      { label: "View", onClick: () => openView(row) },
                      ...(canManage
                        ? [
                            { label: "Edit", onClick: () => openEdit(row) },
                            {
                              label: "Delete",
                              onClick: () => void deleteItem(row.id),
                              variant: "danger" as const,
                            },
                          ]
                        : []),
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

                {row.notes ? <div className="mt-2 text-xs text-slate-600">{row.notes}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm">
        <div className="mb-2 text-sm font-semibold text-slate-900">Allergen legend</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {ALLERGENS.map((a) => (
            <div key={a.key} className="flex items-center gap-2 text-sm">
              <span>{a.icon}</span>
              <span className="truncate text-slate-800">
                {a.label} <span className="font-mono text-[11px] text-slate-500">{a.short}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <AllergenChangeTimeline refreshKey={changeLogRefreshKey} />

      {modalOpen && draft && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={closeModal}>
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
                    onChange={(e) => setDraft((d) => ({ ...d!, item: e.target.value }))}
                    required
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Category</div>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5"
                    value={draft.category ?? "Starter"}
                    onChange={(e) => setDraft((d) => ({ ...d!, category: e.target.value as Category }))}
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
                      <span title={a.label} className="text-sm text-slate-800">
                        {a.icon} <span className="font-mono text-[11px] text-slate-500">{a.short}</span>
                      </span>
                      <div className="inline-flex overflow-hidden rounded border border-slate-200 bg-white/80">
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${
                            val ? "bg-red-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => setDraft((d) => ({ ...d!, flags: { ...d!.flags, [a.key]: true } }))}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 text-xs ${
                            !val ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
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

             <label className="mt-3 block text-sm">
  <div className="mb-1 text-slate-600">Prep / cross-contamination notes</div>
  <textarea
    className="w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5"
    rows={3}
    value={draft.notes ?? ""}
    onChange={(e) => setDraft((d) => ({ ...d!, notes: e.target.value }))}
    placeholder="Example: Cooked in shared fryer with gluten items, or may contain traces from shared prep surfaces."
  />
  <p className="mt-1 text-xs text-slate-500">
    Add anything important about shared equipment, frying oil, prep areas, or trace contamination risk.
  </p>
</label>

              <label className="mt-3 block text-sm">
                <div className="mb-1 text-slate-600">Ingredients</div>
                <textarea
                  className="w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5"
                  rows={5}
                  value={draft.ingredientsText ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d!, ingredientsText: e.target.value }))}
                  placeholder="Add the full ingredient list from the packaging"
                />
              </label>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-2 text-sm font-medium text-slate-900">
                  Ingredients label photo
                </div>

                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-slate-700"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await uploadIngredientsLabel(file);
                    e.currentTarget.value = "";
                  }}
                  disabled={uploadingImage || !orgId}
                />

                <div className="mt-2 text-xs text-slate-500">
                  {uploadingImage
                    ? "Uploading image…"
                    : !orgId
                    ? "Image upload is available once the organisation is loaded."
                    : "Upload a photo of the packaging ingredient label."}
                </div>

                {draft.ingredientsLabelImageUrl ? (
                  <div className="mt-3 space-y-2">
                    <img
                      src={draft.ingredientsLabelImageUrl}
                      alt="Ingredients label"
                      className="max-h-64 rounded-xl border border-slate-200 object-contain"
                    />
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={draft.ingredientsLabelImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Open image
                      </a>
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  ingredientsLabelImageUrl: "",
                                }
                              : d
                          )
                        }
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-slate-500">
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
              <button
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={uploadingImage}
              >
                Save &amp; lock
              </button>
            </div>
          </form>
        </div>
      )}

      {viewOpen && viewRow && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={closeViewModal}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur sm:mt-16 sm:h-[70vh] sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 text-base font-semibold text-slate-900 backdrop-blur">
              {viewRow.item}
            </div>

            <div className="grow overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Category</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {viewRow.category ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                    {viewRow.notes?.trim() ? viewRow.notes : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-900">Allergens</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ALLERGENS.map((a) => {
                    const yes = viewRow.flags[a.key];
                    return (
                      <div
                        key={a.key}
                        className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                          yes
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        <span>
                          {a.icon} {a.label}
                        </span>
                        <span className="font-medium">{yes ? "Yes" : "No"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-900">Ingredients</div>
                <div className="whitespace-pre-wrap text-sm text-slate-800">
                  {viewRow.ingredientsText?.trim() ? viewRow.ingredientsText : "No ingredients added."}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-900">Ingredients label photo</div>

                {viewRow.ingredientsLabelImageUrl ? (
                  <div className="space-y-3">
                    <img
                      src={viewRow.ingredientsLabelImageUrl}
                      alt="Ingredients label"
                      className="max-h-[420px] rounded-xl border border-slate-200 object-contain"
                    />
                    <a
                      href={viewRow.ingredientsLabelImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Open image
                    </a>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No image uploaded.</div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={closeViewModal}
              >
                Close
              </button>
              {canManage && (
                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  onClick={() => {
                    closeViewModal();
                    openEdit(viewRow);
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}