"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

const CARD = "rounded-2xl border border-gray-200 bg-white shadow-sm";

type Row = {
  id: string;
  item: string;
  flags: Record<string, boolean>;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
};

type ChangeRow = {
  id: string;
  created_at: string;
  action: string;
  item_name: string | null;
  staff_initials: string | null;
};

const ALLERGENS = [
  "celery",
  "cereals_gluten",
  "crustaceans",
  "egg",
  "fish",
  "lupin",
  "milk",
  "molluscs",
  "mustard",
  "peanuts",
  "sesame",
  "soya",
  "sulphites",
  "tree_nuts",
] as const;
type AllergenKey = (typeof ALLERGENS)[number];

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function fmtDDMMYYYY(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtHM(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function AllergenMatrix() {
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [initials, setInitials] = useState<string[]>([]);
  const [ini, setIni] = useState<string>("");

  // Recent changes
  const [recentChanges, setRecentChanges] = useState<ChangeRow[]>([]);

  // Review meta
  const [intervalDays, setIntervalDays] = useState<number>(90);
  const [lastReviewed, setLastReviewed] = useState<string | null>(null);

  // derived review state
  const reviewStatus = useMemo(() => {
    if (!lastReviewed) return { status: "overdue", label: "No review yet" as const };
    const last = new Date(lastReviewed);
    const due = new Date(last);
    due.setDate(due.getDate() + (intervalDays || 90));
    const today = new Date();
    if (today > due) return { status: "overdue" as const, label: "Overdue" as const };
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    if (due <= soon) return { status: "due" as const, label: "Due soon" as const };
    return { status: "ok" as const, label: "OK" as const };
  }, [lastReviewed, intervalDays]);

  async function loadRecentChanges(oid: string, locId: string | null) {
    // If you want "org-wide changes" regardless of location, remove the loc filter.
    let q = supabase
      .from("allergen_change_logs")
      .select("id, created_at, action, item_name, staff_initials")
      .eq("org_id", oid)
      .order("created_at", { ascending: false })
      .limit(10);

    // If your allergen matrix is location-specific, keep this filter on.
    // If not, comment it out so you still see logs when location_id is null.
    if (locId) q = q.eq("location_id", locId);

    const { data, error } = await q;
    if (!error && data) {
      setRecentChanges(
        (data as any[]).map((r) => ({
          id: String(r.id),
          created_at: String(r.created_at),
          action: String(r.action),
          item_name: r.item_name ?? null,
          staff_initials: r.staff_initials ?? null,
        }))
      );
    }
  }

  async function logChange(args: {
    action: "create" | "update" | "delete";
    item_id: string | null;
    item_name: string | null;
    flags_before: Record<string, boolean> | null;
    flags_after: Record<string, boolean> | null;
    notes_before: string | null;
    notes_after: string | null;
  }) {
    if (!orgId) return;

    // Don’t let logging failures block the core action. This is audit trail, not a rocket launch.
    await supabase.from("allergen_change_logs").insert({
      org_id: orgId,
      location_id: locationId,
      action: args.action,
      item_id: args.item_id,
      item_name: args.item_name,
      flags_before: args.flags_before,
      flags_after: args.flags_after,
      notes_before: args.notes_before,
      notes_after: args.notes_after,
      staff_initials: ini || null,
    });
  }

  useEffect(() => {
    (async () => {
      setLoading(true);

      const oid = await getActiveOrgIdClient();
      setOrgId(oid ?? null);

      const loc = await getActiveLocationIdClient();
      setLocationId(loc ?? null);

      // initials (for updated_by and convenience)
      if (oid) {
        const { data, error } = await supabase
          .from("team_members")
          .select("initials")
          .eq("org_id", oid)
          .order("initials");

        if (!error && data) {
          const list: string[] = Array.from(
            new Set(
              (data as { initials: string | null }[])
                .map((r) => (r.initials ?? "").toString().toUpperCase().trim())
                .filter((v): v is string => v.length > 0)
            )
          );

          setInitials(list);
          if (!ini && list[0]) setIni(list[0]);
        }
      }

      // allergen matrix
      if (oid) {
        const { data } = await supabase
          .from("allergen_matrix")
          .select("id,item,flags,notes,updated_by,updated_at")
          .eq("org_id", oid)
          .order("item", { ascending: true });

        setRows(
          (data ?? []).map((r: any) => ({
            id: String(r.id),
            item: r.item ?? "",
            flags: (r.flags ?? {}) as Record<string, boolean>,
            notes: r.notes ?? null,
            updated_by: r.updated_by ?? null,
            updated_at: r.updated_at ?? new Date().toISOString(),
          }))
        );

        // recent changes
        await loadRecentChanges(oid, loc ?? null);
      }

      // review meta
      if (oid) {
        const { data: rev } = await supabase
          .from("allergen_review")
          .select("last_reviewed, interval_days")
          .eq("org_id", oid)
          .maybeSingle();
        setIntervalDays(Number(rev?.interval_days ?? 90));
        setLastReviewed(rev?.last_reviewed ?? null);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.item.toLowerCase().includes(q));
  }, [rows, filter]);

  async function upsertRow(partial: Partial<Row> & { id?: string; item?: string }) {
    if (!orgId) return;

    const existing = partial.id ? rows.find((r) => r.id === partial.id) : undefined;

    const beforeFlags = existing ? existing.flags ?? {} : null;
    const beforeNotes = existing ? existing.notes ?? null : null;
    const beforeItem = existing ? existing.item ?? "" : null;

    const next: Row =
      existing
        ? {
            ...existing,
            ...partial,
            updated_by: ini || existing.updated_by || null,
            updated_at: new Date().toISOString(),
          }
        : {
            id: crypto.randomUUID(),
            item: partial.item || "",
            flags: (partial.flags as any) || Object.fromEntries(ALLERGENS.map((k) => [k, false])),
            notes: partial.notes ?? null,
            updated_by: ini || null,
            updated_at: new Date().toISOString(),
          };

    // persist
    // IMPORTANT: include id for create as well, so logs can reference item_id consistently.
    const payload = {
      id: existing ? existing.id : next.id,
      org_id: orgId,
      item: next.item,
      flags: next.flags,
      notes: next.notes,
      updated_by: next.updated_by,
      updated_at: next.updated_at,
    };

    const { data, error } = await supabase
      .from("allergen_matrix")
      .upsert(payload)
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error) {
      alert(error.message);
      return;
    }

    const id = String(data?.id ?? payload.id);

    // update UI state first
    if (existing) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...next, id } : r)));
    } else {
      setRows((prev) => [{ ...next, id }, ...prev].sort((a, b) => a.item.localeCompare(b.item)));
    }

    // log change
    const action: "create" | "update" = existing ? "update" : "create";

    await logChange({
      action,
      item_id: id,
      item_name: next.item ?? null,
      flags_before: beforeFlags,
      flags_after: next.flags ?? null,
      notes_before: beforeNotes,
      notes_after: next.notes ?? null,
    });

    // refresh recent changes
    await loadRecentChanges(orgId, locationId);
  }

  async function deleteRow(id: string) {
    if (!orgId) return;

    const existing = rows.find((r) => r.id === id);

    const { error } = await supabase.from("allergen_matrix").delete().eq("org_id", orgId).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== id));

    await logChange({
      action: "delete",
      item_id: id,
      item_name: existing?.item ?? null,
      flags_before: existing?.flags ?? null,
      flags_after: null,
      notes_before: existing?.notes ?? null,
      notes_after: null,
    });

    await loadRecentChanges(orgId, locationId);
  }

  async function toggleFlag(id: string, key: AllergenKey) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const nextFlags = { ...row.flags, [key]: !row.flags?.[key] };
    await upsertRow({ id, flags: nextFlags });
  }

  async function markReviewedToday() {
    if (!orgId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("allergen_review")
      .upsert({
        org_id: orgId,
        last_reviewed: today,
        interval_days: intervalDays,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      alert(error.message);
      return;
    }
    setLastReviewed(today);
  }

  return (
    <div className="space-y-6 -mx-3 sm:mx-0">
      {/* Header / Controls */}
      <div className={CARD + " p-4"}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Allergen matrix</h2>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-600">Initials</label>
            <select
              value={ini}
              onChange={(e) => setIni(e.target.value.toUpperCase())}
              className="h-9 rounded-xl border border-gray-200 px-2 py-1.5 uppercase"
            >
              {initials.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search items…"
              className="h-9 w-44 rounded-xl border border-gray-200 px-3 text-sm"
            />

            <button
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={() =>
                upsertRow({
                  item: "New item",
                  flags: Object.fromEntries(ALLERGENS.map((k) => [k, false])),
                  notes: null,
                })
              }
            >
              Add item
            </button>
          </div>
        </div>

        {/* Review status */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div
            className={cls(
              "inline-flex items-center rounded-full px-2 py-[3px] text-xs",
              reviewStatus.status === "ok" && "bg-emerald-100 text-emerald-800",
              reviewStatus.status === "due" && "bg-amber-100 text-amber-800",
              reviewStatus.status === "overdue" && "bg-red-100 text-red-800"
            )}
            title={
              lastReviewed ? `Last reviewed: ${lastReviewed} • Interval: ${intervalDays} days` : "Not reviewed yet"
            }
          >
            Allergen review: <span className="ml-1 font-medium">{reviewStatus.label}</span>
          </div>

          <button
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
            onClick={markReviewedToday}
          >
            Mark reviewed today
          </button>

          <label className="ml-2 text-xs text-gray-600">Interval</label>
          <select
            value={intervalDays}
            onChange={async (e) => {
              const v = Number(e.target.value);
              setIntervalDays(v);
              if (orgId) {
                await supabase
                  .from("allergen_review")
                  .upsert({
                    org_id: orgId,
                    last_reviewed: lastReviewed,
                    interval_days: v,
                    updated_at: new Date().toISOString(),
                  });
              }
            }}
            className="h-8 rounded-lg border border-gray-200 px-2 text-xs"
          >
            {[30, 60, 90, 120].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix table */}
      <div className={CARD + " p-4 overflow-x-auto"}>
        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-gray-500">No items.</div>
        ) : (
          <table className="min-w-[800px] w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50">
                <th className="px-3 py-2 w-[18rem]">Item</th>
                {ALLERGENS.map((k) => (
                  <th key={k} className="px-2 py-2 text-center">
                    {k.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="px-3 py-2 w-[14rem]">Notes</th>
                <th className="px-3 py-2 w-[5rem]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      value={r.item}
                      onChange={(e) =>
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, item: e.target.value } : x)))
                      }
                      onBlur={() => upsertRow({ id: r.id, item: rows.find((x) => x.id === r.id)?.item })}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                    />
                  </td>

                  {ALLERGENS.map((k) => {
                    const checked = !!r.flags?.[k];
                    return (
                      <td key={k} className="px-2 py-2 text-center">
                        <button
                          className={cls(
                            "inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs",
                            checked
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-white text-gray-700 border-gray-200"
                          )}
                          onClick={() => toggleFlag(r.id, k)}
                          title={checked ? "Contains" : "Does not contain"}
                        >
                          {checked ? "✓" : "–"}
                        </button>
                      </td>
                    );
                  })}

                  <td className="px-3 py-2">
                    <input
                      value={r.notes ?? ""}
                      onChange={(e) =>
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, notes: e.target.value } : x)))
                      }
                      onBlur={() => upsertRow({ id: r.id, notes: rows.find((x) => x.id === r.id)?.notes ?? null })}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                    />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => deleteRow(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent allergen changes */}
      <div className={CARD + " p-4"}>
        <h3 className="text-sm font-semibold">Recent allergen changes</h3>
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : recentChanges.length === 0 ? (
            <div className="text-sm text-gray-500">No recent allergen changes logged yet.</div>
          ) : (
            recentChanges.map((c) => {
              const label =
                c.action === "create" ? "Added" : c.action === "update" ? "Updated" : c.action === "delete" ? "Deleted" : c.action;
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium">
                    {label}
                  </span>
                  <span className="font-medium">{c.item_name ?? "—"}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {fmtDDMMYYYY(c.created_at)} {fmtHM(c.created_at)}
                    {c.staff_initials ? ` • ${c.staff_initials}` : ""}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
