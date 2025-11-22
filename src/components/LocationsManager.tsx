// src/components/LocationsManager.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type LocationRow = {
  id: string;
  name: string;
  active: boolean;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function LocationsManager() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const [savingId, setSavingId] = useState<string | null>(null);

  // 🔐 auth gate – hide Locations UI if not signed in
  const [user, setUser] = useState<any | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setAuthChecking(false);
    });
  }, []);

  // while checking auth, render nothing to avoid flicker
  if (authChecking) return null;
  if (!user) return null; // or return a small message if you prefer

  async function loadLocations() {
    setLoading(true);
    setErr(null);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setLocations([]);
        setErr("No organisation found for this user.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("locations")
        .select("id,name,active")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows: LocationRow[] =
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          name: (r.name ?? "Unnamed").toString(),
          active: !!r.active,
        })) || [];

      setLocations(rows);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to load locations.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setSavingNew(true);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        alert("No organisation found for this user.");
        return;
      }

      const { error } = await supabase.from("locations").insert({
        org_id: orgId,
        name,
        active: true,
      });

      if (error) throw error;

      setNewName("");
      await loadLocations();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add location.");
    } finally {
      setSavingNew(false);
    }
  }

  async function updateLocation(id: string, patch: Partial<LocationRow>) {
    setSavingId(id);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        alert("No organisation found for this user.");
        return;
      }

      const { error } = await supabase
        .from("locations")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
        })
        .eq("id", id)
        .eq("org_id", orgId);

      if (error) throw error;

      await loadLocations();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to save changes.");
    } finally {
      setSavingId((prev) => (prev === id ? null : prev));
    }
  }

  const activeCount = locations.filter((l) => l.active).length;

  return (
    <div className="space-y-4">
      {/* Summary / info */}
      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 text-sm text-slate-700 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold text-slate-900">Locations</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Active: {activeCount}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Add one location per site (for example: <strong>Pier Vista</strong>,
          <strong> Kiosk</strong>). The location you pick in the top bar is
          used to filter temperature logs and cleaning tasks.
        </p>
      </div>

      {/* Add location form */}
      <form
        onSubmit={handleAddLocation}
        className="flex flex-col gap-2 rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            New location name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm shadow-inner"
            placeholder="e.g. Pier Vista, Kiosk, Upstairs kitchen"
          />
        </div>
        <button
          type="submit"
          disabled={!newName.trim() || savingNew}
          className={cls(
            "h-10 rounded-2xl px-4 text-sm font-medium text-white shadow-sm shadow-emerald-500/30",
            newName.trim() && !savingNew
              ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 hover:brightness-105"
              : "bg-slate-400 cursor-not-allowed"
          )}
        >
          {savingNew ? "Adding…" : "Add location"}
        </button>
      </form>

      {/* List */}
      <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm backdrop-blur">
        {loading ? (
          <div className="py-4 text-center text-sm text-slate-500">
            Loading locations…
          </div>
        ) : err ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        ) : locations.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-500">
            No locations yet. Add your first location above.
          </div>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) => {
              const isSaving = savingId === loc.id;
              return (
                <div
                  key={loc.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                      Name
                    </label>
                    <input
                      type="text"
                      defaultValue={loc.name}
                      onBlur={(e) => {
                        const name = e.target.value.trim();
                        if (name && name !== loc.name) {
                          updateLocation(loc.id, { name });
                        } else {
                          e.target.value = loc.name; // reset on empty
                        }
                      }}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:w-48 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Status</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateLocation(loc.id, { active: !loc.active })
                        }
                        disabled={isSaving}
                        className={cls(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shadow-sm",
                          loc.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}
                      >
                        {loc.active ? "Active" : "Inactive"}
                      </button>
                    </div>
                    {isSaving && (
                      <span className="text-[11px] text-slate-400">
                        Saving…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
