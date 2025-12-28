"use client";

import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

const COURSE_TYPES = [
  "Food Hygiene Level 2",
  "Food Hygiene Level 3",
  "Allergens (Natasha’s Law)",
  "Fire Safety",
  "First Aid",
  "Manual Handling",
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  teamMemberId: string;
  orgId: string;
  onSaved: () => Promise<void> | void;
};

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function AddEducationModal({
  open,
  onClose,
  teamMemberId,
  orgId,
  onSaved,
}: Props) {
  const [type, setType] = useState<string>(COURSE_TYPES[0]);
  const [awardedOn, setAwardedOn] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [certificateUrl, setCertificateUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const expiresOn = useMemo(() => {
    if (!awardedOn) return "";
    const d = new Date(awardedOn + "T00:00:00");
    return addMonths(d, 12).toISOString().slice(0, 10); // 12 months
  }, [awardedOn]);

  if (!open) return null;

  async function save() {
    setSaving(true);

    const { error } = await supabase.from("trainings").insert({
      org_id: orgId,
      team_member_id: teamMemberId,
      type,
      awarded_on: awardedOn,
      expires_on: expiresOn,
      certificate_url: certificateUrl || null,
      notes: notes || null,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    await onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Add education</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-600">Course</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3"
            >
              {COURSE_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Awarded on</label>
              <input
                type="date"
                value={awardedOn}
                onChange={(e) => setAwardedOn(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Expires on (12 months)</label>
              <input
                type="date"
                value={expiresOn}
                readOnly
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">Certificate URL (optional)</label>
            <input
              value={certificateUrl}
              onChange={(e) => setCertificateUrl(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
