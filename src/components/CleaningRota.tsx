"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import ManageCleaningTasksModal, {
  CLEANING_CATEGORIES,
} from "@/components/ManageCleaningTasksModal";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";
import { useActiveLocation } from "@/hooks/useActiveLocation";

const PAGE = "w-full px-3 sm:px-4 md:mx-auto max-w-screen-2xl";
const CARD =
  "rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md";

type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string;
  location_id: string;
  org_id: string;
  task: string;
  area: string | null;
  category: string | null;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
};

type Run = {
  task_id: string;
  run_on: string;
  done_by: string | null;
  done_at?: string | null;
};

type Deferral = {
  task_id: string;
  from_on: string;
  to_on: string;
};

type DaySignoff = {
  id: string;
  signoff_on: string;
  signed_by: string | null;
  signed_by_team_member_id: string | null;
  signed_by_user_id: string | null;
  notes: string | null;
  created_at: string | null;
};

type TeamMemberOption = {
  id: string;
  initials: string;
  name: string | null;
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

function isoDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function getDow1to7(ymd: string) {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1;
}

function isDueOn(task: Task, date: Date) {
  if (task.frequency === "daily") return true;

  if (task.frequency === "weekly") {
    if (task.weekday === null || task.weekday === undefined) return false;
    const d0to6 = date.getDay();
    const d1to7 = getDow1to7(isoDate(date));
    return task.weekday === d0to6 || task.weekday === d1to7;
  }

  if (task.frequency === "monthly") {
    if (!task.month_day) return false;
    return date.getDate() === task.month_day;
  }

  return false;
}

function initialsFromName(name?: string | null) {
  const s = String(name ?? "").trim();
  if (!s) return "";
  const parts = s.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ? p[0].toUpperCase() : ""))
    .join("");
}

function bestInitials(operatorInitials: string, typedInitials: string) {
  return (operatorInitials || typedInitials).trim().toUpperCase();
}

function normalizeInitials(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

async function getLocationDayStatus(
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
    // ignore and continue
  }

  const weekday0to6 = new Date(dateISO).getDay();
  const weekday1to7 = getDow1to7(dateISO);

  try {
    const { data: scheduleRows, error: scheduleErr } = await supabase
      .from("location_opening_days")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("location_id", locationId)
      .in("weekday", [weekday0to6, weekday1to7]);

    if (!scheduleErr && Array.isArray(scheduleRows) && scheduleRows.length > 0) {
      const exact0to6 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday0to6
      );
      const exact1to7 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday1to7
      );
      const row = exact0to6 ?? exact1to7 ?? scheduleRows[0];

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
    // ignore and continue
  }

  return {
    isOpen: true,
    source: "default",
    note: null,
  };
}

function ClassicConfetti({ show }: { show: boolean }) {
  const pieces = useMemo(() => Array.from({ length: 34 }, (_, i) => i), []);

  if (!show) return null;

  const colors = [
    "bg-emerald-400",
    "bg-amber-400",
    "bg-sky-400",
    "bg-rose-400",
    "bg-indigo-400",
    "bg-lime-400",
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {pieces.map((i) => {
        const leftVw = (i * 17) % 100;
        const size = 6 + ((i * 3) % 8);
        const isStrip = i % 3 === 0;

        return (
          <motion.div
            key={i}
            className={[
              "absolute top-[-20px]",
              colors[i % colors.length],
              "shadow-sm",
              isStrip ? "rounded-sm" : "rounded-full",
            ].join(" ")}
            style={{
              left: `${leftVw}vw`,
              width: isStrip ? size + 6 : size,
              height: isStrip ? size - 2 : size,
            }}
            initial={{ opacity: 0, y: -20, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: ["-20px", "110vh"],
              rotate: [0, 520 + i * 25],
            }}
            transition={{
              duration: 1.55,
              ease: "easeOut",
              delay: (i % 10) * 0.02,
            }}
          />
        );
      })}
    </div>
  );
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
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm"
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
              <div className="text-4xl">✅</div>
              <h2 className="mt-3 text-xl font-extrabold text-slate-900">
                Cleaning day signed off
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Nice. You’re building your compliance score instead of just logging and disappearing like everyone else.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-center">
                <div className="text-xl font-extrabold text-slate-900">+{points}</div>
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
                <div className="text-xl font-extrabold text-amber-700">{streak}</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">
                  day streak
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
              {compliantDays >= 7
                ? "Perfect week so far. Try not to ruin it."
                : `You’ve signed off ${compliantDays} day${compliantDays === 1 ? "" : "s"} this week.`}
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

export default function CleaningRotaPage() {
  const { operator } = useWorkstation();
  const {
    orgId,
    locationId,
    loading: activeLocationLoading,
  } = useActiveLocation();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayIso = useMemo(() => isoDate(today), [today]);
  const tomorrowIso = useMemo(() => isoDate(addDays(today, 1)), [today]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [deferrals, setDeferrals] = useState<Deferral[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);

  const [dayStatus, setDayStatus] = useState<LocationDayStatus>({
    isOpen: true,
    source: "default",
    note: null,
  });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [manageOpen, setManageOpen] = useState(false);

  const [initials, setInitials] = useState<string>("");
  const [initialsDirty, setInitialsDirty] = useState(false);

  const [taskInitials, setTaskInitials] = useState<Record<string, string>>({});

  const operatorInitials = useMemo(() => {
    const ini = String(operator?.initials ?? "").trim().toUpperCase();
    return ini || initialsFromName(operator?.name) || "";
  }, [operator?.initials, operator?.name]);

  const operatorTeamMemberId = operator?.teamMemberId ?? null;

  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [showConfetti, setShowConfetti] = useState(false);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const initializedRef = useRef(false);
  const userActionRef = useRef(false);
  const prevAllDoneRef = useRef<boolean>(false);

  const [signoff, setSignoff] = useState<DaySignoff | null>(null);
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffInitials, setSignoffInitials] = useState("");
  const [signoffInitialsDirty, setSignoffInitialsDirty] = useState(false);
  const [signoffNotes, setSignoffNotes] = useState("");
  const [signoffSaving, setSignoffSaving] = useState(false);

  const [completionFeedbackOpen, setCompletionFeedbackOpen] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState<CompletionFeedback>({
    points: 10,
    compliantDays: 0,
    streak: 0,
  });

  const defaultRowInitials = useMemo(
    () => normalizeInitials(bestInitials(operatorInitials, initials)),
    [operatorInitials, initials]
  );

  const deferralsFromMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const d of deferrals) {
      if (!m.has(d.from_on)) m.set(d.from_on, new Set());
      m.get(d.from_on)!.add(d.task_id);
    }
    return m;
  }, [deferrals]);

  const deferralsToMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const d of deferrals) {
      if (!m.has(d.to_on)) m.set(d.to_on, new Set());
      m.get(d.to_on)!.add(d.task_id);
    }
    return m;
  }, [deferrals]);

  function isDueEffective(task: Task, date: Date) {
    const dIso = isoDate(date);
    const deferredFrom = deferralsFromMap.get(dIso)?.has(task.id) ?? false;
    const deferredTo = deferralsToMap.get(dIso)?.has(task.id) ?? false;

    if (deferredFrom) return false;
    if (deferredTo) return true;

    return isDueOn(task, date);
  }

  const runsByTask = useMemo(() => {
    const m = new Map<string, Run>();
    for (const r of runs) m.set(r.task_id, r);
    return m;
  }, [runs]);

  const initialsOptions = useMemo(() => {
    const map = new Map<string, TeamMemberOption>();

    if (defaultRowInitials) {
      map.set(defaultRowInitials, {
        id: `default-${defaultRowInitials}`,
        initials: defaultRowInitials,
        name: operator?.name ?? "Current user",
      });
    }

    for (const tm of teamMembers) {
      const clean = normalizeInitials(tm.initials);
      if (!clean) continue;
      if (!map.has(clean)) {
        map.set(clean, {
          id: tm.id,
          initials: clean,
          name: tm.name,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.initials === defaultRowInitials) return -1;
      if (b.initials === defaultRowInitials) return 1;
      return a.initials.localeCompare(b.initials);
    });
  }, [teamMembers, defaultRowInitials, operator?.name]);

  function getTaskInitials(taskId: string) {
    return normalizeInitials(taskInitials[taskId] || defaultRowInitials);
  }

  function setTaskInitialsValue(taskId: string, value: string) {
    const clean = normalizeInitials(value);
    setTaskInitials((prev) => ({ ...prev, [taskId]: clean }));
  }

  async function getCompletionFeedbackMetrics(
    oid: string,
    lid: string,
    currentDayIso: string
  ): Promise<CompletionFeedback> {
    const currentDate = new Date(currentDayIso);
    currentDate.setHours(0, 0, 0, 0);

    const weekStart = startOfWeekMonday(currentDate);
    const weekEnd = endOfWeekSunday(currentDate);

    const { data: weekRows, error: weekErr } = await supabase
      .from("daily_signoffs")
      .select("signoff_on")
      .eq("org_id", oid)
      .eq("location_id", lid)
      .gte("signoff_on", isoDate(weekStart))
      .lte("signoff_on", isoDate(weekEnd));

    if (weekErr) throw weekErr;

    const compliantDaySet = new Set(
      ((weekRows ?? []) as Array<{ signoff_on: string }>)
        .map((r) => String(r.signoff_on))
        .filter(Boolean)
    );

    let streak = 0;
    const cursor = new Date(currentDate);

    for (let i = 0; i < 365; i++) {
      const dIso = isoDate(cursor);
      if (!compliantDaySet.has(dIso)) {
        if (i === 0) {
          const { data: oneRow, error: oneErr } = await supabase
            .from("daily_signoffs")
            .select("signoff_on")
            .eq("org_id", oid)
            .eq("location_id", lid)
            .eq("signoff_on", dIso)
            .limit(1)
            .maybeSingle();

          if (oneErr) throw oneErr;
          if (!oneRow) break;
        } else {
          const { data: oneRow, error: oneErr } = await supabase
            .from("daily_signoffs")
            .select("signoff_on")
            .eq("org_id", oid)
            .eq("location_id", lid)
            .eq("signoff_on", dIso)
            .limit(1)
            .maybeSingle();

          if (oneErr) throw oneErr;
          if (!oneRow) break;
        }
      }

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      points: 10,
      compliantDays: compliantDaySet.size,
      streak,
    };
  }

  useEffect(() => {
    if (initialsDirty) return;
    if (!operatorInitials) return;
    setInitials(operatorInitials);
  }, [operatorInitials, initialsDirty]);

  useEffect(() => {
    if (!dueToday.length) return;

    setTaskInitials((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const task of dueToday) {
        if (!next[task.id]) {
          next[task.id] = defaultRowInitials;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [defaultRowInitials, tasks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSignoff(oid: string, lid: string) {
    const { data, error } = await supabase
      .from("daily_signoffs")
      .select(
        "id, signoff_on, signed_by, signed_by_team_member_id, signed_by_user_id, notes, created_at"
      )
      .eq("org_id", oid)
      .eq("location_id", lid)
      .eq("signoff_on", todayIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[cleaning] signoff fetch failed:", error.message);
      setSignoff(null);
      return;
    }

    if (!data) {
      setSignoff(null);
      return;
    }

    setSignoff({
      id: String((data as any).id),
      signoff_on: String((data as any).signoff_on),
      signed_by: (data as any).signed_by ? String((data as any).signed_by) : null,
      signed_by_team_member_id: (data as any).signed_by_team_member_id
        ? String((data as any).signed_by_team_member_id)
        : null,
      signed_by_user_id: (data as any).signed_by_user_id
        ? String((data as any).signed_by_user_id)
        : null,
      notes: (data as any).notes ? String((data as any).notes) : null,
      created_at: (data as any).created_at ? String((data as any).created_at) : null,
    });
  }

  async function loadAuthUserIdOnly() {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      setAuthUserId(userRes.user?.id ?? null);
    } catch {
      setAuthUserId(null);
    }
  }

  async function loadTeamMembers(oid: string, lid: string) {
    const { data, error } = await supabase
      .from("team_members")
      .select("id,name,initials,location_id")
      .eq("org_id", oid)
      .or(`location_id.eq.${lid},location_id.is.null`)
      .order("name", { ascending: true });

    if (error) {
      console.warn("[cleaning] team members fetch failed:", error.message);
      setTeamMembers([]);
      return;
    }

    const deduped = new Map<string, TeamMemberOption>();

    for (const row of data ?? []) {
      const clean = normalizeInitials((row as any).initials);
      if (!clean) continue;

      if (!deduped.has(clean)) {
        deduped.set(clean, {
          id: String((row as any).id),
          initials: clean,
          name: (row as any).name ? String((row as any).name) : null,
        });
      }
    }

    setTeamMembers(Array.from(deduped.values()));
  }

  async function resolveSignerTeamMemberId(
    oid: string,
    lid: string,
    ini: string
  ): Promise<string | null> {
    const clean = normalizeInitials(ini);
    if (!clean) return null;

    if (operatorTeamMemberId && operatorInitials && clean === operatorInitials) {
      return operatorTeamMemberId;
    }

    const byLoc = await supabase
      .from("team_members")
      .select("id")
      .eq("org_id", oid)
      .eq("location_id", lid)
      .eq("initials", clean)
      .limit(1)
      .maybeSingle();

    if (!byLoc.error && byLoc.data?.id) return String(byLoc.data.id);

    const byOrgWide = await supabase
      .from("team_members")
      .select("id")
      .eq("org_id", oid)
      .is("location_id", null)
      .eq("initials", clean)
      .limit(1)
      .maybeSingle();

    if (!byOrgWide.error && byOrgWide.data?.id) return String(byOrgWide.data.id);

    return null;
  }

  async function loadAll() {
    if (activeLocationLoading) return;

    setLoading(true);
    setErr(null);

    try {
      const oid = orgId;
      const lid = locationId;

      await loadAuthUserIdOnly();

      if (!oid || !lid) {
        setTasks([]);
        setRuns([]);
        setDeferrals([]);
        setTeamMembers([]);
        setSignoff(null);
        setDayStatus({ isOpen: true, source: "default", note: null });
        setLoading(false);
        return;
      }

      const status = await getLocationDayStatus(lid, todayIso);
      setDayStatus(status);

      const { data: tData, error: tErr } = await supabase
        .from("cleaning_tasks")
        .select("id,org_id,task,area,category,frequency,weekday,month_day,location_id")
        .eq("org_id", oid)
        .eq("location_id", lid)
        .order("category", { ascending: true })
        .order("task", { ascending: true });

      if (tErr) throw tErr;

      const { data: rData, error: rErr } = await supabase
        .from("cleaning_task_runs")
        .select("task_id,run_on,done_by,done_at")
        .eq("org_id", oid)
        .eq("location_id", lid)
        .eq("run_on", todayIso);

      if (rErr) throw rErr;

      const weekStart = isoDate(startOfWeekMonday(today));
      const weekEnd = isoDate(endOfWeekSunday(today));

      const { data: dData, error: dErr } = await supabase
        .from("cleaning_task_deferrals")
        .select("task_id,from_on,to_on")
        .eq("org_id", oid)
        .eq("location_id", lid)
        .gte("from_on", weekStart)
        .lte("from_on", weekEnd);

      if (dErr) console.warn("[cleaning] deferrals fetch failed:", dErr.message);

      setTasks((tData ?? []) as Task[]);
      setRuns((rData ?? []) as Run[]);
      setDeferrals(((dData ?? []) as Deferral[]) || []);

      await Promise.all([loadSignoff(oid, lid), loadTeamMembers(oid, lid)]);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId, activeLocationLoading]);

  const dueToday = useMemo(() => {
    if (!dayStatus.isOpen) return [];
    return tasks.filter((t) => isDueEffective(t, today));
  }, [tasks, today, deferralsFromMap, deferralsToMap, dayStatus.isOpen]);

  const doneCount = useMemo(() => {
    let done = 0;
    for (const t of dueToday) {
      if (runsByTask.has(t.id)) done++;
    }
    return done;
  }, [dueToday, runsByTask]);

  const allDone = useMemo(() => {
    return dayStatus.isOpen && dueToday.length > 0 && doneCount === dueToday.length;
  }, [dayStatus.isOpen, dueToday.length, doneCount]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevAllDoneRef.current = allDone;
      return;
    }

    const wasAllDone = prevAllDoneRef.current;

    if (!wasAllDone && allDone && userActionRef.current) {
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 1600);

      if (!signoff) {
        const best = bestInitials(operatorInitials, initials);
        if (!signoffInitialsDirty) {
          setSignoffInitials((prev) => (prev.trim() ? prev : best));
        }
        setSignoffNotes("");
        setSignoffOpen(true);
      }

      userActionRef.current = false;
    }

    prevAllDoneRef.current = allDone;
  }, [allDone, initials, operatorInitials, signoff, signoffInitialsDirty]);

  const groupedByCategory = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of dueToday) {
      const cat = t.category?.trim() || "Other";
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat)!.push(t);
    }
    const ordered: Array<[string, Task[]]> = [];
    for (const c of CLEANING_CATEGORIES) {
      if (m.has(c)) ordered.push([c, m.get(c)!]);
    }
    for (const [k, v] of m.entries()) {
      if (!ordered.find(([ok]) => ok === k)) ordered.push([k, v]);
    }
    return ordered;
  }, [dueToday]);

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const [category] of groupedByCategory) {
        if (typeof next[category] !== "boolean") next[category] = false;
      }
      return next;
    });
  }, [groupedByCategory]);

  function toggleCategory(category: string) {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  async function tickTask(taskId: string) {
    if (!orgId || !locationId || !dayStatus.isOpen) return;

    userActionRef.current = true;

    const doneBy = getTaskInitials(taskId) || null;

    const doneByTeamMemberId =
      doneBy && operatorTeamMemberId && operatorInitials && doneBy === operatorInitials
        ? operatorTeamMemberId
        : doneBy
        ? await resolveSignerTeamMemberId(orgId, locationId, doneBy)
        : null;

    const payload = {
      org_id: orgId,
      location_id: locationId,
      task_id: taskId,
      run_on: todayIso,
      done_by: doneBy,
      done_by_team_member_id: doneByTeamMemberId,
      done_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("cleaning_task_runs")
      .upsert(payload, { onConflict: "org_id,location_id,task_id,run_on" })
      .select("task_id,run_on,done_by,done_at")
      .maybeSingle();

    if (error) {
      alert(error.message);
      return;
    }

    const row: Run = (data as any) ?? {
      task_id: taskId,
      run_on: todayIso,
      done_by: payload.done_by,
      done_at: payload.done_at,
    };

    setRuns((prev) => {
      const next = prev.filter((r) => r.task_id !== taskId);
      next.push(row);
      return next;
    });
  }

  async function undoTask(taskId: string) {
    if (!orgId || !locationId || !dayStatus.isOpen) return;

    userActionRef.current = true;

    const { error } = await supabase
      .from("cleaning_task_runs")
      .delete()
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("task_id", taskId)
      .eq("run_on", todayIso);

    if (error) {
      alert(error.message);
      return;
    }

    setRuns((prev) => prev.filter((r) => r.task_id !== taskId));
  }

  async function deferToTomorrow(taskId: string) {
    if (!orgId || !locationId || !dayStatus.isOpen) return;
    if (runsByTask.has(taskId)) return;

    const weekEnd = endOfWeekSunday(today);
    const tomorrow = addDays(today, 1);
    if (tomorrow.getTime() > weekEnd.getTime()) return;

    const payload = {
      org_id: orgId,
      location_id: locationId,
      task_id: taskId,
      from_on: todayIso,
      to_on: tomorrowIso,
    };

    const { error } = await supabase
      .from("cleaning_task_deferrals")
      .upsert(payload, { onConflict: "org_id,location_id,task_id,from_on" });

    if (error) {
      alert(error.message);
      return;
    }

    setDeferrals((prev) => [
      ...prev.filter((d) => !(d.task_id === taskId && d.from_on === todayIso)),
      { task_id: taskId, from_on: todayIso, to_on: tomorrowIso },
    ]);
  }

  async function completeAllInCategory(taskIds: string[]) {
    if (!orgId || !locationId || !dayStatus.isOpen) return;

    const idsToDo = taskIds.filter((id) => !runsByTask.has(id));
    if (idsToDo.length === 0) return;

    userActionRef.current = true;

    const nowIso = new Date().toISOString();
    const initialsUsed = Array.from(
      new Set(idsToDo.map((taskId) => getTaskInitials(taskId)).filter(Boolean))
    );

    const initialsToMemberId = new Map<string, string | null>();

    await Promise.all(
      initialsUsed.map(async (ini) => {
        const memberId =
          ini && operatorTeamMemberId && operatorInitials && ini === operatorInitials
            ? operatorTeamMemberId
            : ini
            ? await resolveSignerTeamMemberId(orgId, locationId, ini)
            : null;

        initialsToMemberId.set(ini, memberId);
      })
    );

    const payloads = idsToDo.map((task_id) => {
      const doneBy = getTaskInitials(task_id) || null;
      return {
        org_id: orgId,
        location_id: locationId,
        task_id,
        run_on: todayIso,
        done_by: doneBy,
        done_by_team_member_id: doneBy ? initialsToMemberId.get(doneBy) ?? null : null,
        done_at: nowIso,
      };
    });

    const { data, error } = await supabase
      .from("cleaning_task_runs")
      .upsert(payloads, { onConflict: "org_id,location_id,task_id,run_on" })
      .select("task_id,run_on,done_by,done_at");

    if (error) {
      alert(error.message);
      return;
    }

    const returned = (data ?? []) as any[];
    const returnedRuns: Run[] =
      returned.length > 0
        ? returned.map((r) => ({
            task_id: r.task_id,
            run_on: r.run_on,
            done_by: r.done_by,
            done_at: r.done_at,
          }))
        : payloads.map((p) => ({
            task_id: p.task_id,
            run_on: p.run_on,
            done_by: p.done_by,
            done_at: p.done_at,
          }));

    setRuns((prev) => {
      const keep = prev.filter((r) => !idsToDo.includes(r.task_id));
      return [...keep, ...returnedRuns];
    });
  }
async function createSignoff() {
  if (!orgId || !locationId) return;

  if (!dayStatus.isOpen) {
    alert("This location is marked closed today, so sign-off is not required.");
    return;
  }

  if (!allDone) {
    alert("Complete all cleaning tasks due today before signing off.");
    return;
  }

  if (signoff) return;

  const ini = signoffInitials.trim().toUpperCase();
  if (!ini) {
    alert("Enter initials to sign off.");
    return;
  }

  setSignoffSaving(true);

  try {
    const signerTeamMemberId = await resolveSignerTeamMemberId(
      orgId,
      locationId,
      ini
    );

    const payload = {
      org_id: orgId,
      location_id: locationId,
      signoff_on: todayIso,
      signed_by: ini,
      signed_by_team_member_id: signerTeamMemberId,
      signed_by_user_id: authUserId,
      notes: signoffNotes.trim() || null,
    };

    const { data, error } = await supabase
      .from("daily_signoffs")
      .insert(payload)
      .select(
        "id, signoff_on, signed_by, signed_by_team_member_id, signed_by_user_id, notes, created_at"
      )
      .single();

    if (error) throw error;

    setSignoff({
      id: String((data as any).id),
      signoff_on: String((data as any).signoff_on),
      signed_by: (data as any).signed_by ? String((data as any).signed_by) : null,
      signed_by_team_member_id: (data as any).signed_by_team_member_id
        ? String((data as any).signed_by_team_member_id)
        : null,
      signed_by_user_id: (data as any).signed_by_user_id
        ? String((data as any).signed_by_user_id)
        : null,
      notes: (data as any).notes ? String((data as any).notes) : null,
      created_at: (data as any).created_at ? String((data as any).created_at) : null,
    });

    // Close sign-off modal first so the feedback card is not fighting another overlay.
    setSignoffOpen(false);
    setSignoffNotes("");
    setSignoffInitialsDirty(false);

    // Open feedback immediately with safe fallback values.
    setCompletionFeedback({
      points: 10,
      compliantDays: 1,
      streak: 1,
    });
    setCompletionFeedbackOpen(true);

    // Then try to replace with real metrics.
    try {
      const metrics = await getCompletionFeedbackMetrics(orgId, locationId, todayIso);
      setCompletionFeedback(metrics);
    } catch (metricsErr) {
      console.error("[cleaning] completion feedback metrics failed:", metricsErr);
    }
  } catch (e: any) {
    console.error(e);
    alert(e?.message ?? "Failed to sign off the day.");
  } finally {
    setSignoffSaving(false);
  }
}

  useEffect(() => {
    if (!signoffOpen) return;
    if (signoffInitialsDirty) return;

    const best = bestInitials(operatorInitials, initials);
    if (!best) return;

    setSignoffInitials((prev) => (prev.trim() ? prev : best));
  }, [signoffOpen, signoffInitialsDirty, operatorInitials, initials]);

  if (loading || activeLocationLoading) {
    return (
      <div className={PAGE}>
        <div className={`${CARD} p-5`}>Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={PAGE}>
        <div className={`${CARD} p-5 text-red-700`}>{err}</div>
      </div>
    );
  }

  const doneCountDisplay = dayStatus.isOpen
    ? `${doneCount}/${dueToday.length}`
    : "Closed";

  return (
    <div className={PAGE}>
      <ClassicConfetti show={showConfetti} />

      <CompletionFeedbackModal
        open={completionFeedbackOpen}
        onClose={() => setCompletionFeedbackOpen(false)}
        points={completionFeedback.points}
        compliantDays={completionFeedback.compliantDays}
        streak={completionFeedback.streak}
      />

      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">Cleaning rota</div>
            <div className="text-xs text-slate-500">{todayIso}</div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <button
              onClick={() => setManageOpen(true)}
              className="h-9 whitespace-nowrap rounded-full bg-indigo-600 px-3 text-xs font-semibold leading-none text-white hover:bg-indigo-700"
            >
              Manage tasks
            </button>

            <button
              onClick={() => {
                if (!dayStatus.isOpen) return;
                const best = bestInitials(operatorInitials, initials);
                if (!signoffInitialsDirty) {
                  setSignoffInitials((prev) => (prev.trim() ? prev : best));
                }
                setSignoffNotes("");
                setSignoffOpen(true);
              }}
              disabled={!dayStatus.isOpen || !allDone || !!signoff}
              className={[
                "h-9 whitespace-nowrap rounded-full px-3 text-xs font-semibold leading-none",
                signoff
                  ? "bg-slate-200 text-slate-700"
                  : !dayStatus.isOpen || !allDone
                  ? "bg-slate-200 text-slate-700 opacity-70"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              ].join(" ")}
              title={
                signoff
                  ? "Day signed off"
                  : !dayStatus.isOpen
                  ? "Location is closed today"
                  : allDone
                  ? "Sign off the day"
                  : "Complete all tasks first"
              }
            >
              {signoff ? "Day signed off" : "Sign off day"}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-500">Initials</span>
              <input
                value={initials}
                onChange={(e) => {
                  setInitialsDirty(true);
                  setInitials(e.target.value.toUpperCase());
                }}
                placeholder="ED"
                className="h-9 w-20 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
              />
            </div>

            <div className="flex h-9 items-center whitespace-nowrap rounded-full bg-slate-900 px-3 text-xs font-semibold leading-none text-white">
              {doneCountDisplay}
            </div>

            <button
              onClick={() => completeAllInCategory(dueToday.map((t) => t.id))}
              disabled={!dayStatus.isOpen || dueToday.length === 0}
              className={[
                "h-9 whitespace-nowrap rounded-full px-3 text-xs font-semibold leading-none",
                !dayStatus.isOpen || dueToday.length === 0
                  ? "bg-slate-200 text-slate-700 opacity-70"
                  : "bg-emerald-500 text-white hover:bg-emerald-600",
              ].join(" ")}
            >
              Complete all today
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          {dayStatus.isOpen
            ? "Log tasks completed or defer if not completed today."
            : "This location is marked closed today, so no cleaning tasks are required."}
        </div>

        {!dayStatus.isOpen && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
            Location marked closed today
            {dayStatus.note ? ` · ${dayStatus.note}` : ""}
          </div>
        )}

        {dayStatus.isOpen && allDone && !signoff && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            All cleaning tasks are complete. Sign off the day to lock it in.
          </div>
        )}

        {dayStatus.isOpen && dueToday.length === 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            No cleaning tasks are due today.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {groupedByCategory.map(([category, list]) => {
            const catDone = list.filter((t) => runsByTask.has(t.id)).length;
            const open = list.length - catDone;
            const isCollapsed = collapsed[category] ?? false;

            return (
              <div key={category} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-start gap-2 text-left"
                    aria-expanded={!isCollapsed}
                  >
                    <span className="mt-0.5 text-slate-500">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>

                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{category}</div>
                      <div className="text-xs text-slate-500">
                        {catDone}/{list.length} complete · {open} open
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => completeAllInCategory(list.map((t) => t.id))}
                    className="shrink-0 rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                  >
                    Complete all
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="mt-3 space-y-2">
                    {list.map((t) => {
                      const run = runsByTask.get(t.id);
                      const done = !!run;

                      const deferredFromToday =
                        deferralsFromMap.get(todayIso)?.has(t.id) ?? false;

                      const selectedInitials = getTaskInitials(t.id);

                      return (
                        <motion.div
                          key={t.id}
                          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{t.task}</div>
                              <div className="text-xs text-slate-500">
                                {t.area ?? "—"} · {t.frequency}
                              </div>

                              {deferredFromToday && !done && (
                                <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  Deferred to tomorrow
                                </div>
                              )}

                              {done && (
                                <div className="mt-1 text-xs text-slate-500">
                                  Done by {run?.done_by || "—"}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {!done && (
                                <select
                                  value={selectedInitials}
                                  onChange={(e) => setTaskInitialsValue(t.id, e.target.value)}
                                  className="h-8 min-w-[78px] rounded-full border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
                                  aria-label={`Initials for ${t.task}`}
                                >
                                  {initialsOptions.map((opt) => (
                                    <option key={opt.initials} value={opt.initials}>
                                      {opt.initials}
                                      {opt.name ? ` · ${opt.name}` : ""}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {!done && (
                                <button
                                  onClick={() => deferToTomorrow(t.id)}
                                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                  title="Move this task to tomorrow (this week only)"
                                >
                                  Defer
                                </button>
                              )}

                              {!done ? (
                                <button
                                  onClick={() => tickTask(t.id)}
                                  className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-200"
                                >
                                  Tick
                                </button>
                              ) : (
                                <button
                                  onClick={() => undoTask(t.id)}
                                  className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ManageCleaningTasksModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onSaved={loadAll}
      />

      {signoffOpen && dayStatus.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setSignoffOpen(false)}>
          <div
            className="mx-auto mt-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Sign off day</div>
                <div className="mt-0.5 text-xs text-slate-500">{todayIso}</div>
              </div>
              <button
                onClick={() => setSignoffOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {signoff && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                This day is already signed off.
              </div>
            )}

            {!allDone && !signoff && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You can’t sign off until all cleaning tasks due today are completed.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Initials</label>
                <input
                  value={signoffInitials}
                  onChange={(e) => {
                    setSignoffInitialsDirty(true);
                    setSignoffInitials(e.target.value.toUpperCase());
                  }}
                  placeholder="ED"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  We’ll link this to a team member where possible.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Notes (optional)</label>
                <input
                  value={signoffNotes}
                  onChange={(e) => setSignoffNotes(e.target.value)}
                  placeholder="Any corrective actions / comments…"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignoffOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createSignoff}
                disabled={!allDone || !!signoff || signoffSaving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {signoffSaving ? "Signing…" : "Sign off"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}