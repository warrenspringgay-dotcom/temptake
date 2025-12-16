"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type Frequency = "daily" | "weekly" | "monthly";

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

const WEEKDAY_LABEL: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export default function AddCleaningTaskModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [area, setArea] = useState("");
  const [task, setTask] = useState("");
  const [category, setCategory] = useState("Opening checks");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [weekday, setWeekday] = useState<number>(1);
  const [monthDay, setMonthDay] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // reset on open
  useEffect(() => {
    if (!open) return;
    setArea("");
    setTask("");
    setCategory("Opening checks");
    setFrequency("daily");
    setWeekday(1);
    setMonthDay(1);
    setSaving(false);
  }, [open]);

  async function save() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId) return alert("No organisation found.");
    if (!locationId) return alert("Select a location first.");

    const t = task.trim();
    if (!t) return alert("Task is required.");

    setSaving(true);
    try {
      const payload: any = {
        org_id: orgId,
        location_id: locationId,
        task: t,
        name: t, // keeps backwards compatibility if your table used name
        area: area.trim() || null,
        category: category.trim() || null,
        frequency,
        weekday: frequency === "weekly" ? weekday : null,
        month_day: frequency === "monthly" ? monthDay : null,
      };

      const { error } = await supabase.from("cleaning_tasks").insert(payload);
      if (error) throw error;

      await onSaved?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[2000]"
          role="dialog"
          aria-modal="true"
        >
          {/* overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* FULL SCREEN SHEET */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={cls(
              "absolute inset-x-0 bottom-0",
              "mx-auto w-full",
              "rounded-t-3xl border border-white/30 bg-white/85 shadow-2xl backdrop-blur-md",
              "max-h-[92vh] overflow-hidden"
            )}
            style={{
              // helps on iOS safe area
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Cleaning rota
                </div>
                <div className="truncate text-base font-semibold text-slate-900">
                  Add task
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* scrollable body */}
            <div className="max-h-[calc(92vh-56px)] overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Area
                  </label>
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="e.g. Kitchen, Bar"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Task
                  </label>
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="e.g. Clean grill, Mop floor"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Category
                  </label>
                  <select
                    className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Opening checks</option>
                    <option>Mid-shift</option>
                    <option>Closing down</option>
                    <option>Front of house</option>
                    <option>Back of house</option>
                    <option>Weekly deep clean</option>
                    <option>Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Frequency
                  </label>
                  <select
                    className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as Frequency)
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {frequency === "weekly" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Day of week
                    </label>
                    <select
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      value={weekday}
                      onChange={(e) => setWeekday(Number(e.target.value))}
                    >
                      {Object.entries(WEEKDAY_LABEL).map(([k, v]) => (
                        <option key={k} value={Number(k)}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {frequency === "monthly" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Day of month
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      value={monthDay}
                      onChange={(e) => setMonthDay(Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="h-11 w-full rounded-2xl bg-emerald-600 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save task"}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white/70 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
