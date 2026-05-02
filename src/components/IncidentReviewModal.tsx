// src/components/IncidentReviewModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseBrowser";
import { useToast } from "@/components/ui/use-toast";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

export type IncidentReviewRow = {
  id: string;
  happened_on: string | null;
  created_at: string | null;
  type: string | null;
  details: string | null;
  immediate_action: string | null;
  preventive_action: string | null;
  created_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
};

type Props = {
  open: boolean;
  incident: IncidentReviewRow | null;
  orgId: string;
  locationId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export default function IncidentReviewModal({
  open,
  incident,
  orgId,
  locationId,
  onClose,
  onSaved,
}: Props) {
  const { addToast } = useToast();
  const { operator, locked } = useWorkstation();

  const operatorInitials = useMemo(
    () => (operator?.initials ?? "").toString().trim().toUpperCase(),
    [operator?.initials]
  );

  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [happenedOn, setHappenedOn] = useState("");
  const [type, setType] = useState("General");
  const [details, setDetails] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !incident) return;

    setHappenedOn(incident.happened_on ?? "");
    setType(incident.type ?? "General");
    setDetails(incident.details ?? "");
    setImmediateAction(incident.immediate_action ?? "");
    setPreventiveAction(incident.preventive_action ?? "");
    setResolutionNotes(incident.resolution_notes ?? "");
    setSaving(false);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, incident]);

  if (!open || !mounted || !incident) return null;

  const currentIncident = incident;
  const isResolved = !!currentIncident.resolved_at;

  function requireOperator() {
    if (locked || !operatorInitials) {
      addToast({
        title: "Workstation locked",
        message: "Select a user and enter PIN to update this incident.",
        type: "error",
      });
      return false;
    }

    return true;
  }

  async function saveChanges() {
    if (!requireOperator()) return;

    if (!happenedOn) {
      addToast({
        title: "Date required",
        message: "Pick a date.",
        type: "error",
      });
      return;
    }

    if (!details.trim()) {
      addToast({
        title: "Details required",
        message: "Add what happened.",
        type: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          happened_on: happenedOn,
          type: type || null,
          details: details.trim() || null,
          immediate_action: immediateAction.trim() || null,
          preventive_action: preventiveAction.trim() || null,
          resolution_notes: resolutionNotes.trim() || null,
        })
        .eq("id", currentIncident.id)
        .eq("org_id", orgId)
        .eq("location_id", locationId);

      if (error) throw error;

      addToast({
        title: "Incident updated",
        type: "success",
      });

      await onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      addToast({
        title: "Failed to update incident",
        message: e?.message ?? "Something went wrong.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function markResolved() {
    if (!requireOperator()) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: operatorInitials,
          resolution_notes: resolutionNotes.trim() || null,
        })
        .eq("id", currentIncident.id)
        .eq("org_id", orgId)
        .eq("location_id", locationId);

      if (error) throw error;

      addToast({
        title: "Incident resolved",
        type: "success",
      });

      await onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      addToast({
        title: "Failed to resolve incident",
        message: e?.message ?? "Something went wrong.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function reopenIncident() {
    if (!requireOperator()) return;
    if (!confirm("Reopen this incident?")) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          resolved_at: null,
          resolved_by: null,
        })
        .eq("id", currentIncident.id)
        .eq("org_id", orgId)
        .eq("location_id", locationId);

      if (error) throw error;

      addToast({
        title: "Incident reopened",
        type: "success",
      });

      await onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      addToast({
        title: "Failed to reopen incident",
        message: e?.message ?? "Something went wrong.",
        type: "error",
      });
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
        className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "88vh" }}
      >
        <div className="flex h-full flex-col" style={{ maxHeight: "88vh" }}>
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-slate-900">
                  Review incident
                </div>

                {isResolved ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">
                    Resolved
                  </span>
                ) : (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-red-800">
                    Open
                  </span>
                )}
              </div>

              <div className="mt-0.5 text-xs text-slate-500">
                Created by {currentIncident.created_by?.toUpperCase() ?? "—"}
                {currentIncident.created_at
                  ? ` · ${new Date(currentIncident.created_at).toLocaleString(
                      "en-GB"
                    )}`
                  : ""}
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

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!operatorInitials || locked ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Workstation locked. Select operator + PIN to update this incident.
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Operator: <span className="font-semibold">{operatorInitials}</span>
              </div>
            )}

            {isResolved ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Resolved by{" "}
                <span className="font-semibold">
                  {currentIncident.resolved_by?.toUpperCase() ?? "—"}
                </span>
                {currentIncident.resolved_at
                  ? ` · ${new Date(currentIncident.resolved_at).toLocaleString(
                      "en-GB"
                    )}`
                  : ""}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Date
                </label>
                <input
                  type="date"
                  value={happenedOn}
                  onChange={(e) => setHappenedOn(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
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
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Immediate action
                </label>
                <textarea
                  value={immediateAction}
                  onChange={(e) => setImmediateAction(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Preventive action
                </label>
                <textarea
                  value={preventiveAction}
                  onChange={(e) => setPreventiveAction(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Resolution notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="What confirmed this issue has been dealt with?"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            {isResolved ? (
              <button
                type="button"
                onClick={reopenIncident}
                disabled={saving || locked || !operatorInitials}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                Reopen
              </button>
            ) : (
              <button
                type="button"
                onClick={markResolved}
                disabled={saving || locked || !operatorInitials}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Mark resolved"}
              </button>
            )}

            <button
              type="button"
              onClick={saveChanges}
              disabled={saving || locked || !operatorInitials}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}