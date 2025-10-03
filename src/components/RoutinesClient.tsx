// src/components/RoutinesClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  listRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  type TempRoutine,
} from "@/app/actions/routines";
import { TARGET_PRESETS } from "@/lib/temp-constants";

const targetLabel = (key?: string | null) =>
  TARGET_PRESETS.find((p) => p.key === key)?.label ?? key ?? "—";

export default function RoutinesClient() {
  const [rows, setRows] = useState<TempRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [item, setItem] = useState("");
  const [target, setTarget] = useState(TARGET_PRESETS[0]?.key ?? "ambient");
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await listRoutines();
      setRows(r);
    } catch (e: any) {
      setErr(e?.message || "Failed to load routines");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function add() {
    if (!name.trim()) return;
    setErr(null);
    try {
      await createRoutine({ name, location, item, target_key: target });
      setName("");
      setLocation("");
      setItem("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create routine");
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-6">
      <h1 className="text-xl font-semibold">Temperature Routines</h1>

      {err && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {err}
        </div>
      )}

      {/* Add */}
      <div className="grid gap-3 sm:grid-cols-5">
        <input
          className="rounded-xl border px-3 py-2"
          placeholder="Routine name (e.g., Morning fridges)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded-xl border px-3 py-2"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="rounded-xl border px-3 py-2"
          placeholder="Item"
          value={item}
          onChange={(e) => setItem(e.target.value)}
        />
        <select
          className="rounded-xl border px-3 py-2"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {TARGET_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          className="rounded-2xl bg-black px-3 py-2 text-white hover:bg-gray-900"
        >
          Add routine
        </button>
      </div>

      {/* List */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Location</th>
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3">Target</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No routines yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t align-middle">
                  <td className="py-2 pr-3">{r.name ?? "—"}</td>
                  <td className="py-2 pr-3">{r.location ?? "—"}</td>
                  <td className="py-2 pr-3">{r.item ?? "—"}</td>
                  <td className="py-2 pr-3">{targetLabel(r.target_key)}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={!!r.active}
                      onChange={async (e) => {
                        try {
                          await updateRoutine(r.id, { active: e.target.checked });
                          refresh();
                        } catch (err: any) {
                          alert(err?.message || "Failed to update routine");
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      className="rounded-xl border px-2 py-1 hover:bg-gray-50"
                      onClick={async () => {
                        if (confirm("Delete routine?")) {
                          try {
                            await deleteRoutine(r.id);
                            refresh();
                          } catch (err: any) {
                            alert(err?.message || "Failed to delete routine");
                          }
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Tip: Create multiple routines (e.g., “Morning fridges”, “Lunch hot hold”, “Close down”).
        Staff can pick a routine in the logger and everything pre-fills.
      </p>
    </div>
  );
}
