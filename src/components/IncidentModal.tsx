"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  locationId: string;
  defaultDate: string; // YYYY-MM-DD
  defaultInitials: string;
  defaultArea?: string | null;
  onSaved: () => void;
};

export default function IncidentModal({
  open,
  onClose,
  orgId,
  locationId,
  defaultDate,
  defaultInitials,
  defaultArea, // ✅ YOU MUST DESTRUCTURE THIS
  onSaved,
}: Props) {
  const [mounted, setMounted] = useState(false);

  const [date, setDate] = useState(defaultDate);
  const [initials, setInitials] = useState(defaultInitials || "");
  const [area, setArea] = useState<string>(defaultArea?.toString() ?? "");

  const [type, setType] = useState("General");
  const [details, setDetails] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Reset fields on open (single effect, not two half-broken ones)
  useEffect(() => {
    if (!open) return;

    setDate(defaultDate);
    setInitials(defaultInitials || "");
    setArea(defaultArea?.toString() ?? "");

    setType("General");
    setDetails("");
    setImmediateAction("");
    setPreventiveAction("");

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, defaultDate, defaultInitials, defaultArea]);

  if (!open || !mounted) return null;

  async function saveIncident() {
    if (!date) {
      alert("Date is required.");
      return;
    }
    if (!details.trim()) {
      alert("Details are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        org_id: String(orgId),
        location_id: String(locationId),
        happened_on: date,
        type: type || null,
        area: area.trim() || null, // ✅ if your table has area column
        details: details.trim() || null,
        immediate_action: immediateAction.trim() || null,
        preventive_action: preventiveAction.trim() || null,
        created_by: initials.trim().toUpperCase() || null,
      };

      const { error } = await supabase.from("incidents").insert(payload);
      if (error) throw error;

      onClose();
      onSaved();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to log incident.");
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex h-full flex-col" style={{ maxHeight: "85vh" }}>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-base font-semibold text-slate-900">
                Log incident
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                Record what happened and what you did about it.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Initials
                </label>
                <input
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  placeholder="e.g. WS"
                />
              </div>

              {/* ✅ Area (prefilled) */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Area (optional)
                </label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  placeholder="e.g. Walk-in fridge"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option>General</option>
                  <option>Food safety</option>
                  <option>Cleaning</option>
                  <option>Equipment</option>
                  <option>Allergen</option>
                  <option>Pest</option>
                  <option>Staff</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Details *
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="What happened?"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Immediate action (recommended)
                </label>
                <textarea
                  value={immediateAction}
                  onChange={(e) => setImmediateAction(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="What did you do right away to make it safe?"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Preventive action (recommended)
                </label>
                <textarea
                  value={preventiveAction}
                  onChange={(e) => setPreventiveAction(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="What will you change to stop this happening again?"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveIncident}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save incident"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
