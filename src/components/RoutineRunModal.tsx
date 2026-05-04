"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import type { RoutineRow } from "@/components/RoutinePickerModal";
import { useVoiceRoutineEntry } from "@/lib/useVoiceRoutineEntry";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { useEffectiveOperator } from "@/lib/useEffectiveOperator";

type Props = {
  open: boolean;
  routine: RoutineRow | null;
  defaultDate: string;
  defaultInitials: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type LocationDayStatus = {
  isOpen: boolean;
  source: "default" | "weekly_schedule" | "closure_override";
  note: string | null;
};

type CompletionFeedback = {
  points: number;
  compliantDays: number;
  streak: number;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function normalizeInitials(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function inferStatus(
  temp: number | null,
  preset?: TargetPreset
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

/* ---------- date / location helpers ---------- */

function isoToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDow1to7(ymd: string) {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function getLocationDayStatus(
  orgId: string,
  locationId: string | null,
  dateISO: string
): Promise<LocationDayStatus> {
  if (!locationId) {
    return {
      isOpen: true,
      source: "default",
      note: null,
    };
  }

  try {
    const { data: closure, error: closureErr } = await supabase
      .from("location_closures")
      .select("id, reason")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("date", dateISO)
      .maybeSingle();

    if (!closureErr && closure) {
      return {
        isOpen: false,
        source: "closure_override",
        note: closure.reason ? String(closure.reason) : "Marked closed for today.",
      };
    }
  } catch {
    // ignore and fall through
  }

  const weekday0to6 = new Date(dateISO).getDay();
  const weekday1to7 = getDow1to7(dateISO);

  try {
    const { data: scheduleRows, error: scheduleErr } = await supabase
      .from("location_opening_days")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .in("weekday", [weekday1to7, weekday0to6]);

    if (!scheduleErr && Array.isArray(scheduleRows) && scheduleRows.length > 0) {
      const exact1to7 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday1to7
      );
      const exact0to6 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday0to6
      );
      const row = exact1to7 ?? exact0to6 ?? scheduleRows[0];

      const isOpen = row?.is_open !== false;

      let note: string | null = null;
      if (!isOpen) {
        note = "Closed by weekly opening days.";
      } else if (row?.opens_at && row?.closes_at) {
        note = `${String(row.opens_at).slice(0, 5)}–${String(row.closes_at).slice(0, 5)}`;
      }

      return {
        isOpen,
        source: "weekly_schedule",
        note,
      };
    }
  } catch {
    // ignore and fall through
  }

  return {
    isOpen: true,
    source: "default",
    note: null,
  };
}

/* ---------- temp helpers ---------- */

function isFrozenPreset(preset?: TargetPreset) {
  if (!preset) return false;

  const label = (preset.label ?? "").toLowerCase();

  if (
    typeof preset.minC === "number" &&
    typeof preset.maxC === "number" &&
    preset.minC <= 0 &&
    preset.maxC <= 0
  ) {
    return true;
  }

  if (label.includes("frozen") || label.includes("freezer")) {
    return true;
  }

  return false;
}

function normalizeTempStringForPreset(
  raw: string,
  preset?: TargetPreset
): string {
  const value = (raw ?? "").trim();
  if (!value) return "";

  if (!preset || !isFrozenPreset(preset)) return value;

  if (value === "-" || value === "." || value === "-." || value === "+") {
    return value;
  }

  const compact = value.replace(/\s+/g, "");

  if (/^[+]?\d*\.?\d+$/.test(compact)) {
    return `-${compact.replace(/^\+/, "")}`;
  }

  if (/^-\d*\.?\d+$/.test(compact)) {
    return compact;
  }

  return value;
}

function parseTempForPreset(
  raw: string,
  preset?: TargetPreset
): number | null {
  const normalized = normalizeTempStringForPreset(raw, preset).trim();
  if (!normalized) return null;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function tempPlaceholderForPreset(preset?: TargetPreset) {
  return isFrozenPreset(preset) ? "e.g. 18 = -18°C" : "e.g. 75.1";
}

/* ---------- matching helpers ---------- */

function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(phrase: string, candidate: string) {
  const p = norm(phrase);
  const c = norm(candidate);

  if (!p || !c) return 0;
  if (c === p) return 999;
  if (c.includes(p)) return 200;

  const pTokens = new Set(p.split(" "));
  const cTokens = new Set(c.split(" "));

  let hit = 0;
  for (const t of pTokens) {
    if (cTokens.has(t)) hit++;
  }

  return hit;
}

function bestMatchIndex(phrase: string, items: { item?: string | null }[]) {
  let bestIdx = -1;
  let best = 0;

  for (let i = 0; i < items.length; i++) {
    const label = items[i]?.item ?? "";
    const score = tokenScore(phrase, label);

    if (score > best) {
      best = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0 && best >= 1) return bestIdx;
  return -1;
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}

function CompletionFeedbackModal({
  open,
  onClose,
  points,
  compliantDays,
  streak,
}: {
  open: boolean;
  onClose: () => void;
  points: number;
  compliantDays: number;
  streak: number;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/50 bg-white p-5 shadow-2xl"
          >
            <div className="text-center">
              <div className="text-4xl">🌡️</div>
              <h2 className="mt-3 text-xl font-extrabold text-slate-900">
                Routine completed
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Good. That routine is logged and your compliance score keeps
                moving instead of sitting there pretending to matter.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-center">
                <div className="text-xl font-extrabold text-slate-900">
                  +{points}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  points
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                <div className="text-xl font-extrabold text-emerald-700">
                  {compliantDays}/7
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80">
                  this week
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 p-3 text-center">
                <div className="text-xl font-extrabold text-amber-700">
                  {streak}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">
                  day streak
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
              {compliantDays >= 7
                ? "Perfect week so far. Miracles do happen."
                : `You’ve logged routine temps on ${compliantDays} day${
                    compliantDays === 1 ? "" : "s"
                  } this week.`}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Continue
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default function RoutineRunModal({
  open,
  routine,
  defaultDate,
  defaultInitials,
  onClose,
  onSaved,
}: Props) {
  const { locked } = useWorkstation();
  const effectiveOperator = useEffectiveOperator();

  const {
    orgId: activeOrgId,
    locationId: activeLocationId,
    loading: activeLocationLoading,
  } = useActiveLocation();

  const [date, setDate] = useState(defaultDate);
  const [initials, setInitials] = useState(defaultInitials || "");
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [activeIdx, setActiveIdx] = useState(0);

  const [todayStatus, setTodayStatus] = useState<LocationDayStatus>({
    isOpen: true,
    source: "default",
    note: null,
  });

  const [checkingDayStatus, setCheckingDayStatus] = useState(false);

  const [completionFeedbackOpen, setCompletionFeedbackOpen] = useState(false);
  const [completionFeedback, setCompletionFeedback] =
    useState<CompletionFeedback>({
      points: 0,
      compliantDays: 0,
      streak: 0,
    });

  const [pendingRefresh, setPendingRefresh] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rowRefs = useRef<
    Record<string, HTMLTableRowElement | HTMLDivElement | null>
  >({});

  const items = useMemo(() => routine?.items ?? [], [routine]);

  const selectedDateIsToday = useMemo(() => date === isoToday(), [date]);
  const saveBlockedByClosedDay = selectedDateIsToday && !todayStatus.isOpen;

  const operatorInitials = useMemo(
    () => normalizeInitials(effectiveOperator.initials),
    [effectiveOperator.initials]
  );

  const operatorName = effectiveOperator.name ?? null;
  const operatorTeamMemberId = effectiveOperator.teamMemberId ?? null;
  const operatorUserId = effectiveOperator.userId ?? null;

  async function refreshDayStatus(targetDate: string) {
    try {
      if (targetDate !== isoToday()) {
        setTodayStatus({
          isOpen: true,
          source: "default",
          note: null,
        });
        return;
      }

      setCheckingDayStatus(true);

      const orgId = activeOrgId ?? (await getActiveOrgIdClient());
      const locationId = activeLocationId ?? null;

      if (!orgId) {
        setTodayStatus({
          isOpen: true,
          source: "default",
          note: null,
        });
        return;
      }

      const status = await getLocationDayStatus(orgId, locationId, targetDate);
      setTodayStatus(status);
    } catch {
      setTodayStatus({
        isOpen: true,
        source: "default",
        note: null,
      });
    } finally {
      setCheckingDayStatus(false);
    }
  }

  async function resolveTempLogTeamMemberId(
    oid: string,
    lid: string,
    teamMemberId: string | null,
    initialsValue: string
  ): Promise<string | null> {
    const clean = normalizeInitials(initialsValue);
    if (!clean) return null;

    if (teamMemberId) {
      const { data, error } = await supabase
        .from("team_members")
        .select("id")
        .eq("id", teamMemberId)
        .eq("org_id", oid)
        .eq("location_id", lid)
        .limit(1)
        .maybeSingle();

      if (!error && data?.id) {
        return String(data.id);
      }
    }

    const { data, error } = await supabase
      .from("team_members")
      .select("id")
      .eq("org_id", oid)
      .eq("location_id", lid)
      .eq("initials", clean)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) {
      return String(data.id);
    }

    return null;
  }

  async function getCompletionFeedbackMetrics(
    orgId: string,
    locationId: string,
    currentDayIso: string,
    savedRowCount: number
  ): Promise<CompletionFeedback> {
    const currentDate = new Date(currentDayIso);
    currentDate.setHours(0, 0, 0, 0);

    const weekStart = startOfWeekMonday(currentDate);

    const { data: weekRows, error: weekErr } = await supabase
      .from("food_temp_logs")
      .select("at")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .gte("at", weekStart.toISOString())
      .lte(
        "at",
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          23,
          59,
          59,
          999
        ).toISOString()
      )
      .limit(5000);

    if (weekErr) throw weekErr;

    const daySet = new Set<string>();

    for (const row of (weekRows ?? []) as Array<{ at: string | null }>) {
      if (!row?.at) continue;

      const d = new Date(row.at);
      if (Number.isNaN(d.getTime())) continue;

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      daySet.add(`${y}-${m}-${day}`);
    }

    let streak = 0;
    const cursor = new Date(currentDate);

    for (let i = 0; i < 365; i++) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const day = String(cursor.getDate()).padStart(2, "0");
      const dIso = `${y}-${m}-${day}`;

      let hasLogsForDay = daySet.has(dIso);

      if (!hasLogsForDay) {
        const dayStart = new Date(cursor);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(cursor);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: oneRow, error: oneErr } = await supabase
          .from("food_temp_logs")
          .select("id")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dayStart.toISOString())
          .lte("at", dayEnd.toISOString())
          .limit(1)
          .maybeSingle();

        if (oneErr) throw oneErr;
        if (!oneRow) break;

        hasLogsForDay = true;
      }

      if (!hasLogsForDay) break;

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      points: Math.max(savedRowCount, 1),
      compliantDays: daySet.size,
      streak,
    };
  }

  useEffect(() => {
    if (!open || !routine) return;

    setDate(defaultDate);

    setTemps(() => {
      const init: Record<string, string> = {};
      routine.items.forEach((it) => {
        init[it.id] = "";
      });
      return init;
    });

    setActiveIdx(0);
    setCompletionFeedbackOpen(false);
    setCompletionFeedback({
      points: 0,
      compliantDays: 0,
      streak: 0,
    });
    setPendingRefresh(false);

    if (operatorInitials) {
      setInitials(operatorInitials);
    } else {
      setInitials(normalizeInitials(defaultInitials));
    }

    if (!activeLocationLoading) {
      void refreshDayStatus(defaultDate);
    }
  }, [
    open,
    routine,
    defaultDate,
    defaultInitials,
    operatorInitials,
    activeOrgId,
    activeLocationId,
    activeLocationLoading,
  ]);

  useEffect(() => {
    if (!open || activeLocationLoading) return;
    void refreshDayStatus(date);
  }, [date, open, activeOrgId, activeLocationId, activeLocationLoading]);

  const { supported: voiceSupported, listening, start, stop } =
    useVoiceRoutineEntry({
      lang: "en-GB",
      onResult: (r) => {
        if (!open) return;

        if (r.command === "stop") {
          stop();
          return;
        }

        let idx = activeIdx;

        if (r.itemPhrase) {
          const matched = bestMatchIndex(r.itemPhrase, items);

          if (matched >= 0) {
            idx = matched;
            setActiveIdx(matched);
          }
        }

        if (r.temp_c) {
          const it = items[idx];
          if (!it) return;

          const preset =
            (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
              it.target_key
            ];

          setTemps((t) => ({
            ...t,
            [it.id]: normalizeTempStringForPreset(String(r.temp_c), preset),
          }));
        }
      },
      onError: (msg) => {
        console.warn(msg);
      },
    });

  useEffect(() => {
    if (!open) return;

    const it = items[activeIdx];
    if (!it) return;

    const rowEl = rowRefs.current[it.id];
    rowEl?.scrollIntoView?.({ block: "center", behavior: "smooth" });

    const inputEl = inputRefs.current[it.id];
    inputEl?.focus?.();
  }, [activeIdx, open, items]);

  if (!open || !routine) return null;

  function requireOperatorOrBail(): boolean {
    if (
      locked ||
      effectiveOperator.source !== "operator" ||
      !operatorInitials
    ) {
      alert("Workstation is locked. Select a user and enter a PIN to continue.");
      return false;
    }

    return true;
  }

  function handleTempChange(itemId: string, value: string) {
    setTemps((t) => ({ ...t, [itemId]: value }));
  }

  function handleTempBlur(itemId: string, preset?: TargetPreset) {
    setTemps((t) => ({
      ...t,
      [itemId]: normalizeTempStringForPreset(t[itemId] ?? "", preset),
    }));
  }

 async function handleSave(e?: React.FormEvent) {
  e?.preventDefault();

  const currentRoutine = routine;

  if (!currentRoutine) return;
  if (!date) return;
  if (!requireOperatorOrBail()) return;
    const staffInitials = normalizeInitials(operatorInitials);

    if (!staffInitials) {
      alert("No PIN operator initials found. Unlock with a staff PIN first.");
      return;
    }

    if (!operatorUserId) {
      alert("No logged-in user found. Refresh and sign in again.");
      return;
    }

    setSaving(true);

    try {
      const org_id = activeOrgId ?? (await getActiveOrgIdClient());
      const location_id = activeLocationId ?? null;

      if (!org_id || !location_id) {
        alert("Please select a location first.");
        return;
      }

      const latestStatus = await getLocationDayStatus(org_id, location_id, date);
      setTodayStatus(latestStatus);

      if (date === isoToday() && !latestStatus.isOpen) {
        alert(
          latestStatus.note ||
            "This location is marked closed today, so routine temperatures cannot be logged."
        );
        return;
      }

      let atIso = new Date().toISOString();

      try {
        const selected = new Date(date);
        const now = new Date();

        const at = new Date(
          selected.getFullYear(),
          selected.getMonth(),
          selected.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds()
        );

        atIso = at.toISOString();
      } catch {
        // keep current timestamp
      }

      const tempLogTeamMemberId = await resolveTempLogTeamMemberId(
        org_id,
        location_id,
        operatorTeamMemberId,
        staffInitials
      );

      const invalidItems: string[] = [];

      const rows = items
        .map((it) => {
          const raw = (temps[it.id] ?? "").trim();
          if (!raw) return null;

          const preset =
            (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
              it.target_key
            ];

          const normalizedRaw = normalizeTempStringForPreset(raw, preset);
          const temp = parseTempForPreset(normalizedRaw, preset);

          if (temp == null) {
            invalidItems.push(it.item ?? it.location ?? "Unknown item");
            return null;
          }

          const status = inferStatus(temp, preset) ?? "pass";

          return {
            org_id,
            location_id,
            created_by: operatorUserId,
            at: atIso,
            area: it.location ?? "—",
            target_key: it.target_key,
            temp_c: temp,
            status,
            note: it.item ?? null,
            staff_initials: staffInitials,
            team_member_id: tempLogTeamMemberId,
          meta: {
  routine_id: currentRoutine.id ?? null,
  routine_item_id: it.id ?? null,
  routine_name: currentRoutine.name ?? null,
  operator_source: effectiveOperator.source,
},
          };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);

      if (invalidItems.length > 0) {
        alert(`Invalid temperature entered for: ${invalidItems.join(", ")}`);
        return;
      }

      if (!rows.length) {
        onClose();
        return;
      }
const { data: insertedRows, error } = await supabase
  .from("food_temp_logs")
  .insert(rows)
  .select("id,status,area,note,temp_c,target_key,location_id");

if (!error) {
  const failedRows = (insertedRows ?? []).filter(
    (row: any) => String(row.status ?? "").toLowerCase() === "fail"
  );

  const firstFailedRow = failedRows[0];

  if (failedRows.length > 0 && rows[0]?.org_id && firstFailedRow?.location_id) {
    await fetch("/api/push/temp-fail-alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orgId: rows[0].org_id,
        locationId: firstFailedRow.location_id,
        failedRows,
      }),
    });
  }
}
      if (error) {
        alert(error.message);
        return;
      }

      if (listening) stop();

      setCompletionFeedback({
        points: Math.max(rows.length, 1),
        compliantDays: 1,
        streak: 1,
      });
      setCompletionFeedbackOpen(true);
      setPendingRefresh(true);

      try {
        const metrics = await getCompletionFeedbackMetrics(
          org_id,
          location_id,
          date,
          rows.length
        );

        setCompletionFeedback(metrics);
      } catch (metricsErr) {
        console.error("[routine] completion feedback metrics failed:", metricsErr);
      }
    } finally {
      setSaving(false);
    }
  }

  const activeId = items[activeIdx]?.id ?? null;

  const handleCloseEverything = async () => {
    if (listening) stop();

    setCompletionFeedbackOpen(false);

    if (pendingRefresh) {
      try {
        await onSaved();
      } catch (err) {
        console.error("[routine] onSaved failed:", err);
      }

      setPendingRefresh(false);
    }

    onClose();
  };

  return (
    <ModalPortal>
      <CompletionFeedbackModal
        open={completionFeedbackOpen}
        onClose={handleCloseEverything}
        points={completionFeedback.points}
        compliantDays={completionFeedback.compliantDays}
        streak={completionFeedback.streak}
      />

      <div
        className="fixed inset-0 z-[999] overflow-y-auto bg-black/40 px-3 pb-6 pt-[88px]"
        onClick={() => {
          if (completionFeedbackOpen) return;
          if (listening) stop();
          onClose();
        }}
      >
        <form
          onSubmit={handleSave}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-emerald-600/30 bg-emerald-600 px-4 py-3 text-white">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-emerald-100">
                Run routine
              </div>
              <div className="truncate text-base font-semibold">
                {routine.name}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => (listening ? stop() : start())}
                  className={cls(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    listening
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-white/30 bg-white/15 text-white hover:bg-white/25"
                  )}
                >
                  {listening ? "🎤 Listening" : "🎤 Voice"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (listening) stop();
                  onClose();
                }}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-800"
              >
                Close
              </button>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Date
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>

              <label className="text-sm font-medium">
                Operator (PIN)
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm uppercase shadow-sm"
                  value={
                    operatorInitials ||
                    normalizeInitials(initials) ||
                    normalizeInitials(operatorName)
                  }
                  readOnly
                />
              </label>
            </div>

            {selectedDateIsToday && (
              <div
                className={cls(
                  "mt-3 rounded-xl border px-3 py-2 text-xs",
                  checkingDayStatus || activeLocationLoading
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : todayStatus.isOpen
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                )}
              >
                {checkingDayStatus || activeLocationLoading
                  ? "Checking today’s opening status…"
                  : todayStatus.isOpen
                  ? `Location open today${
                      todayStatus.note ? ` · ${todayStatus.note}` : ""
                    }`
                  : `Location marked closed today${
                      todayStatus.note ? ` · ${todayStatus.note}` : ""
                    }`}
              </div>
            )}

            {voiceSupported && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Say: <strong>"fish 75.2"</strong> or <strong>"stop"</strong>.
                It matches your phrase to the closest routine item name and fills
                that temp.
              </div>
            )}

            <div className="mt-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Now:</span>{" "}
              {items[activeIdx]?.item ?? "—"}{" "}
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-semibold text-slate-800">Next:</span>{" "}
              {items[Math.min(activeIdx + 1, items.length - 1)]?.item ?? "—"}
            </div>
          </div>

          <div className="max-h-[62vh] overflow-y-auto bg-white px-4 py-3">
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2 text-left text-xs font-semibold">#</th>
                    <th className="p-2 text-left text-xs font-semibold">
                      Location
                    </th>
                    <th className="p-2 text-left text-xs font-semibold">Item</th>
                    <th className="p-2 text-left text-xs font-semibold">
                      Target
                    </th>
                    <th className="p-2 text-left text-xs font-semibold">Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const preset =
                      (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
                        it.target_key
                      ];
                    const isActive = it.id === activeId;
                    const frozen = isFrozenPreset(preset);

                    return (
                      <tr
                        key={it.id}
                        ref={(el) => {
                          rowRefs.current[it.id] = el;
                        }}
                        className={cls(
                          "border-t border-slate-100 cursor-pointer",
                          isActive && "bg-emerald-50"
                        )}
                        onClick={() => setActiveIdx(idx)}
                      >
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{it.location ?? "—"}</td>
                        <td className="p-2">{it.item ?? "—"}</td>
                        <td className="p-2 text-xs text-slate-500">
                          <div>{preset?.label ?? it.target_key ?? "—"}</div>
                          {frozen && (
                            <div className="mt-1 text-[11px] text-emerald-700">
                              Frozen: typing 18 saves as -18°C
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            ref={(el) => {
                              inputRefs.current[it.id] = el;
                            }}
                            className={cls(
                              "w-28 rounded-lg border bg-white px-2 py-1 shadow-sm",
                              isActive
                                ? "border-emerald-300 ring-2 ring-emerald-200"
                                : "border-slate-300"
                            )}
                            value={temps[it.id] ?? ""}
                            onChange={(e) =>
                              handleTempChange(it.id, e.target.value)
                            }
                            onBlur={() => handleTempBlur(it.id, preset)}
                            placeholder={tempPlaceholderForPreset(preset)}
                            inputMode="decimal"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 md:hidden">
              {items.map((it, idx) => {
                const preset =
                  (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
                    it.target_key
                  ];
                const isActive = it.id === activeId;
                const frozen = isFrozenPreset(preset);

                return (
                  <div
                    key={it.id}
                    ref={(el) => {
                      rowRefs.current[it.id] = el;
                    }}
                    className={cls(
                      "rounded-xl border bg-white p-3 shadow-sm",
                      isActive
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200"
                    )}
                    onClick={() => setActiveIdx(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">
                        #{idx + 1} {isActive ? "· Active" : ""}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {preset?.label ?? it.target_key}
                      </div>
                    </div>

                    <div className="mt-1 font-medium text-slate-900">
                      {it.item ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {it.location ?? "—"}
                    </div>

                    {frozen && (
                      <div className="mt-2 text-[11px] text-emerald-700">
                        Frozen item: type 18 and it will save as -18°C
                      </div>
                    )}

                    <input
                      ref={(el) => {
                        inputRefs.current[it.id] = el;
                      }}
                      className={cls(
                        "mt-2 w-full rounded-lg border bg-white px-3 py-2 shadow-sm",
                        isActive
                          ? "border-emerald-300 ring-2 ring-emerald-200"
                          : "border-slate-300"
                      )}
                      placeholder={tempPlaceholderForPreset(preset)}
                      value={temps[it.id] ?? ""}
                      onChange={(e) => handleTempChange(it.id, e.target.value)}
                      onBlur={() => handleTempBlur(it.id, preset)}
                      inputMode="decimal"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => {
                if (listening) stop();
                onClose();
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                checkingDayStatus ||
                activeLocationLoading ||
                saveBlockedByClosedDay
              }
              className={cls(
                "rounded-xl px-5 py-1.5 text-sm font-semibold text-white shadow-sm",
                saving ||
                  checkingDayStatus ||
                  activeLocationLoading ||
                  saveBlockedByClosedDay
                  ? "bg-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-500"
              )}
            >
              {saving
                ? "Saving…"
                : saveBlockedByClosedDay
                ? "Location closed today"
                : "Save all"}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}