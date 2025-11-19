// src/components/StaffReviewModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type StaffReviewModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type StaffOption = {
  id: string;
  name: string;
  initials: string | null;
  role: string | null;
};

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export default function StaffReviewModal({
  open,
  onClose,
  onSaved,
}: StaffReviewModalProps) {
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [staffId, setStaffId] = useState<string>("");
  const [category, setCategory] = useState<string>("Temps");
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever it opens
  useEffect(() => {
    if (!open) return;
    setStaffId("");
    setCategory("Temps");
    setRating(5);
    setNotes("");
    setError(null);
  }, [open]);

  // Load active staff members from team_members
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        setLoadingStaff(true);
        setError(null);

        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          setStaffOptions([]);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("id, name, initials, role, active")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("name");

        if (error) throw error;

        const rows: StaffOption[] =
          (data ?? []).map((r: any) => ({
            id: String(r.id),
            name: r.name ?? r.email ?? "Unnamed",
            initials: r.initials ?? null,
            role: r.role ?? null,
          })) || [];

        setStaffOptions(rows);
      } catch (e: any) {
        console.error("Failed to load staff:", e);
        setError("Could not load staff list.");
        setStaffOptions([]);
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId) {
      setError("Please choose a staff member.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setError("No organisation selected.");
        return;
      }

      const staff = staffOptions.find((s) => s.id === staffId);
      const { error } = await supabase.from("staff_reviews").insert({
        org_id: orgId,
        staff_id: staffId,
        staff_name: staff?.name ?? null,
        staff_initials: staff?.initials ?? null,
        category,
        rating,
        notes: notes.trim() || null,
        review_date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
      });

      if (error) throw error;

      if (onSaved) onSaved();
      onClose();
    } catch (e: any) {
      console.error("Failed to save staff review:", e);
      setError(e?.message || "Failed to save review.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-3">
      <form
        onSubmit={handleSave}
        className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Log staff review
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {/* Staff member */}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Staff member</span>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={loadingStaff}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">
                {loadingStaff
                  ? "Loading staff…"
                  : staffOptions.length === 0
                  ? "No active staff"
                  : "Select…"}
              </option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.initials ? ` (${s.initials})` : ""}
                  {s.role ? ` – ${s.role}` : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Category */}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Area / category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="Temps">Temps</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Allergens">Allergens</option>
              <option value="General">General</option>
            </select>
          </label>

          {/* Rating */}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Rating (1–5)</span>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {RATING_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          {/* Notes */}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Notes / feedback</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="What did they do well? Any corrective advice?"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingStaff}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save review"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
