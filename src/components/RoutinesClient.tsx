// src/components/RoutinesClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  listRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
} from "@/app/actions/routines";
import type { RoutineWithItems } from "@/types/routines";
import { TARGET_PRESETS } from "@/lib/temp-constants";

export default function RoutinesClient() {
  const [rows, setRows] = useState<RoutineWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [item, setItem] = useState("");
  const [target, setTarget] = useState<string>(TARGET_PRESETS[0]?.key ?? "chill");

  async function refresh() {
    setLoading(true);
    try {
      const r = await listRoutines();
      setRows(r);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load routines");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add() {
    if (!name.trim()) return;

    // Minimal item payload. Include notes: null so we satisfy servers that require it,
    // but keep it optional in the local type to handle either schema.
    type PayloadItem = {
      position: number;
      location: string | null;
      item: string | null;
      target_key: string;
      notes?: string | null;
    };

    const newItems: PayloadItem[] = [
      {
        position: 0,
        location: location.trim() || null,
        item: item.trim() || null,
        target_key: target,
        notes: null, // harmless if not used; required by some server types
      },
    ];

    try {
      // Cast to the action’s expected type to avoid mismatched local typings.
      await createRoutine({ name: name.trim(), items: newItems as any });
      setName("");
      setLocation("");
      setItem("");
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed to create routine");
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-6">
      <h1 className="text-xl font-semibold">Temperature Routines</h1>

      {/* Add (quick 1-item) */}
      <div className="grid gap-3 sm:grid-cols-5">
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Routine name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Item"
          value={item}
          onChange={(e) => setItem(e.target.value)}
        />
        <select
          className="rounded-lg border px-3 py-2"
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
          className="rounded-lg bg-black px-3 py-2 text-white hover:bg-gray-900"
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
              <th className="py-2 pr-3"># Items</th>
              <th className="py-2 pr-3">Last used</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  No routines yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t align-middle">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.items.length}</td>
                  <td className="py-2 pr-3">
                    {r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => alert("Open editor modal here")}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={async () => {
                          if (!confirm("Delete routine?")) return;
                          await deleteRoutine(r.id);
                          refresh();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Tip: You can create multi-item routines by passing a full <code>items</code> array.
      </p>
    </div>
  );
}
