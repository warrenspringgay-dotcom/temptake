// src/components/FoodTempLogger.tsx
'use client';

import { useMemo, useState, useTransition } from "react";
import { TARGET_PRESETS } from "@/lib/temp-constants";

type Row = {
  id?: string | null;
  created_at?: string | null;
  date?: string | null;
  staff_initials?: string | null;
  location?: string | null;
  item?: string | null;
  target_key?: string | null;
  temp_c?: number | null;
  org_id?: string | null;
};

type Props = {
  initialRows: Row[];
  initials: string[];
  onUpsert: (input: Row) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const LOCATIONS = ["Kitchen", "Prep room", "Walk-in", "Delivery", "Other"];

export default function FoodTempLogger({
  initialRows,
  initials,
  onUpsert,
  onDelete,
}: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows ?? []);
  const [isPending, startTransition] = useTransition();

  const presetOptions = useMemo(
    () =>
      TARGET_PRESETS.map((p) => ({
        value: String(p.key),
        label: p.label, // ← label only (no actual temperatures)
      })),
    []
  );

  // Simple inline “add a log” state
  const [draft, setDraft] = useState<Row>({
    date: new Date().toISOString().slice(0, 10),
    staff_initials: "",
    location: LOCATIONS[0],
    item: "",
    target_key: presetOptions[0]?.value ?? null,
    temp_c: null,
  });

  const addOrUpdate = () => {
    startTransition(async () => {
      await onUpsert(draft);
      // Optimistic update; prepend
      setRows((prev) => [
        {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...draft,
        },
        ...prev,
      ]);
      // reset
      setDraft((d) => ({ ...d, item: "", temp_c: null }));
    });
  };

  const remove = (id?: string | null) => {
    if (!id) return;
    startTransition(async () => {
      await onDelete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  };

  return (
    <div className="space-y-4">
      {/* Add row */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-6">
          <input
            className="rounded-xl border border-gray-300 px-3 py-2"
            type="date"
            value={draft.date ?? ""}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
          <input
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Initials"
            list="initials"
            value={draft.staff_initials ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, staff_initials: e.target.value.toUpperCase() })
            }
          />
          <datalist id="initials">
            {initials?.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>

          <select
            className="rounded-xl border border-gray-300 px-3 py-2"
            value={draft.location ?? ""}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          >
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <input
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Item (e.g. Chicken curry)"
            value={draft.item ?? ""}
            onChange={(e) => setDraft({ ...draft, item: e.target.value })}
          />

          <select
            className="rounded-xl border border-gray-300 px-3 py-2"
            value={draft.target_key ?? ""}
            onChange={(e) => setDraft({ ...draft, target_key: e.target.value })}
          >
            {presetOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <input
            className="rounded-xl border border-gray-300 px-3 py-2 md:col-span-2"
            type="number"
            step="0.1"
            placeholder="Temp °C"
            value={draft.temp_c ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                temp_c: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />

          <button
            onClick={addOrUpdate}
            disabled={isPending}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60 md:col-span-1"
          >
            {isPending ? "Saving…" : "Add log"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Initials</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Temp °C</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const presetLabel =
                  presetOptions.find((p) => p.value === String(r.target_key))?.label ?? "—";
                const when = r.date
                  ? r.date
                  : r.created_at
                  ? new Date(r.created_at).toLocaleString()
                  : "—";
                return (
                  <tr key={r.id ?? Math.random()} className="border-t">
                    <td className="px-4 py-2">{when}</td>
                    <td className="px-4 py-2">{r.staff_initials ?? "—"}</td>
                    <td className="px-4 py-2">{r.location ?? "—"}</td>
                    <td className="px-4 py-2">{r.item ?? "—"}</td>
                    <td className="px-4 py-2">{presetLabel}</td>
                    <td className="px-4 py-2">
                      {r.temp_c == null ? "—" : Number(r.temp_c).toFixed(1)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.id ? (
                        <button
                          onClick={() => remove(r.id!)}
                          className="rounded-lg border border-gray-300 px-3 py-1 hover:bg-gray-50"
                          disabled={isPending}
                        >
                          Delete
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    No temperature logs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
