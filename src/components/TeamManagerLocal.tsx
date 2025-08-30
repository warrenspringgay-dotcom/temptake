"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import NavTabs from "@/components/NavTabs";

type Training = {
  id: string;
  type: string;
  awarded_on: string;
  expires_on: string;
  certificate_url?: string;
  notes?: string;
};
type Staff = {
  id: string;
  initials: string;
  name: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  trainings: Training[];
};
type LocalLog = { initials?: string };

const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

type ExpiryStatus = "ok" | "warning" | "expired";
function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  const t = today();
  if (expires_on < t) return "expired";
  const d = new Date(expires_on + "T00:00:00Z");
  const now = new Date(t + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  return diff <= warnDays ? "warning" : "ok";
}
function useLocalState<T>(key: string, init: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : init;
    } catch {
      return init;
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState] as const;
}

function Badge({ status }: { status: ExpiryStatus }) {
  const map = {
    ok: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    expired: "bg-red-100 text-red-700",
  } as const;
  const label =
    status === "ok" ? "OK" : status === "warning" ? "Due soon" : "Expired";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {label}
    </span>
  );
}
function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "ghost";
  }
) {
  const { variant = "primary", className = "", ...rest } = props;
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "outline"
      ? "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50"
      : "text-slate-700 hover:bg-gray-100";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

export default function TeamManagerLocal() {
  const [staff, setStaff] = useLocalState<Staff[]>("tt_staff", []);
  const [logs] = useLocalState<LocalLog[]>("tt_logs", []);

  const allTrainings = useMemo(
    () => staff.flatMap((s) => s.trainings.map((t) => ({ s, t }))),
    [staff]
  );

  const stats = useMemo(() => {
    let expired = 0,
      warning = 0;
    for (const { t } of allTrainings) {
      const st = getExpiryStatus(t.expires_on, 60);
      if (st === "expired") expired++;
      else if (st === "warning") warning++;
    }
    return { expired, warning, total: allTrainings.length };
  }, [allTrainings]);

  const leaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) {
      const init = String(l.initials || "").toUpperCase();
      if (!init || init === "GUEST") continue;
      counts.set(init, (counts.get(init) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([initials, count]) => {
        const person = staff.find(
          (s) => s.initials.toUpperCase() === initials
        );
        return { initials, name: person?.name ?? initials, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [logs, staff]);

  const [staffModal, setStaffModal] = useState<{
    open: boolean;
    edit?: Staff | null;
  }>({ open: false });
  const [trainingModal, setTrainingModal] = useState<{
    open: boolean;
    staffId?: string;
    edit?: Training | null;
  }>({ open: false });

  function saveStaff(
    draft: Omit<Staff, "id" | "trainings"> & {
      id?: string;
      trainings?: Training[];
    }
  ) {
    setStaff((prev) => {
      const exists = draft.id
        ? prev.find((s) => s.id === draft.id)
        : undefined;
      const payload: Staff = exists
        ? { ...exists, ...draft, trainings: draft.trainings ?? exists.trainings }
        : {
            id: uid(),
            initials: draft.initials.toUpperCase(),
            name: draft.name,
            jobTitle: draft.jobTitle ?? "",
            phone: draft.phone ?? "",
            email: draft.email ?? "",
            notes: draft.notes ?? "",
            active: draft.active,
            trainings: draft.trainings ?? [],
          };
      const list = exists
        ? prev.map((s) => (s.id === payload.id ? payload : s))
        : [payload, ...prev];
      return list.sort((a, b) => a.name.localeCompare(b.name));
    });
  }
  function removeStaff(id: string) {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  function saveTraining(
    staffId: string,
    draft: Omit<Training, "id"> & { id?: string }
  ) {
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id !== staffId) return s;
        const t: Training = { id: draft.id ?? uid(), ...draft };
        const list = s.trainings ?? [];
        const idx = list.findIndex((x) => x.id === t.id);
        const next =
          idx >= 0
            ? list.map((x) => (x.id === t.id ? t : x))
            : [t, ...list];
        return {
          ...s,
          trainings: next.sort((a, b) =>
            a.expires_on.localeCompare(b.expires_on)
          ),
        };
      })
    );
  }
  function removeTraining(staffId: string, trainingId: string) {
    setStaff((prev) =>
      prev.map((s) =>
        s.id === staffId
          ? {
              ...s,
              trainings: s.trainings.filter((t) => t.id !== trainingId),
            }
          : s
      )
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavTabs />
      {/* ... rest of component unchanged, including modals ... */}
    </div>
  );
}
