// src/app/four-week-review/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type StatTone = "good" | "warn" | "bad" | "neutral";

function cls(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function safeDate(val: any): Date | null {
  if (!val) return null;

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    const parsed = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDDMMYYYY(val: any): string | null {
  const d = safeDate(val);
  if (!d) return null;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());

  return `${dd}/${mm}/${yyyy}`;
}

function formatTimeHM(val: any): string | null {
  const d = safeDate(val);
  if (!d) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function titleCase(val: string | null | undefined): string {
  if (!val) return "—";
  return String(val)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}d`;
}

function prettyAbsenceRange(row: {
  startDate?: string | null;
  endDate?: string | null;
  isHalfDay?: boolean | null;
  halfDayPeriod?: string | null;
}) {
  const start = formatDDMMYYYY(row.startDate) ?? "—";
  const end = formatDDMMYYYY(row.endDate) ?? "—";
  const suffix = row.isHalfDay
    ? ` (${String(row.halfDayPeriod ?? "").toUpperCase() || "HALF DAY"})`
    : "";

  if (!row.startDate || !row.endDate || row.startDate === row.endDate) {
    return `${start}${suffix}`;
  }

  return `${start} → ${end}${suffix}`;
}

function Pill({
  tone,
  children,
}: {
  tone: StatTone;
  children: React.ReactNode;
}) {
  const styles =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "bad"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        styles
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  tone,
  icon,
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: StatTone;
  icon: string;
  onClick?: () => void;
}) {
  const wrap =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/70"
      : tone === "bad"
      ? "border-rose-200 bg-rose-50/70"
      : "border-slate-200 bg-white";

  const bar =
    tone === "good"
      ? "bg-emerald-400"
      : tone === "warn"
      ? "bg-amber-400"
      : tone === "bad"
      ? "bg-rose-400"
      : "bg-slate-300";

  const body = (
    <div
      className={cls(
        "relative overflow-hidden rounded-3xl border p-4 shadow-sm text-left",
        wrap,
        onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
      )}
    >
      <div className={cls("absolute left-0 top-0 h-full w-1.5", bar)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-600">
            {title}
          </div>
          <div className="mt-2 text-4xl font-extrabold text-slate-900">{value}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-lg shadow-sm">
          {icon}
        </span>
      </div>
    </div>
  );

  if (!onClick) return body;

  return (
    <button type="button" onClick={onClick} className="w-full">
      {body}
    </button>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {icon ? <span className="text-xl">{icon}</span> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
      {children}
    </div>
  );
}

function SimpleTable({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      {children}
    </div>
  );
}

function SectionFooterToggle({
  total,
  visible,
  onToggle,
  label = "rows",
}: {
  total: number;
  visible: boolean;
  onToggle: () => void;
  label?: string;
}) {
  if (total <= 10) return null;

  return (
    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
      <div>
        Showing {visible ? total : Math.min(10, total)} of {total} {label}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium text-slate-800 shadow-sm hover:bg-slate-50"
      >
        {visible ? "Show first 10" : "View all"}
      </button>
    </div>
  );
}

type TopIssue = {
  label: string;
  count: number;
  tone?: StatTone;
};

type TopMissedArea = {
  area: string;
  missed: number;
};

type RepeatFailureRow = {
  key: string;
  area: string;
  item: string;
  count: number;
  lastSeenOn: string;
};

type RepeatMissRow = {
  taskId: string;
  task: string;
  category: string | null;
  area: string | null;
  missedCount: number;
  lastMissedOn: string;
};

type TrainingDriftRow = {
  staffName: string;
  staffInitials: string | null;
  type: string;
  expiresOn: string;
  daysLeft: number;
  status: "expired" | "due_soon";
};

type LoggedIncidentRow = {
  id: string;
  happenedOn: string | null;
  createdAt: string | null;
  type: string | null;
  details: string | null;
  immediateAction?: string | null;
  preventiveAction?: string | null;
  createdBy: string | null;
};

type UnifiedIncidentRow = {
  id: string;
  happenedOn: string | null;
  createdAt: string | null;
  createdBy: string | null;
  details: string | null;
  correctiveAction: string | null;
};

type CleaningRunRow = {
  id: string;
  runOn: string;
  doneAt: string | null;
  doneBy: string | null;
  category: string;
  task: string;
};

type CleaningCategoryProgressRow = {
  category: string;
  done: number;
  total: number;
};

type SignoffRow = {
  id: string;
  signoffOn: string;
  signedBy: string | null;
  notes: string | null;
  createdAt: string | null;
};

type StaffReviewRow = {
  id: string;
  reviewedOn: string;
  createdAt: string | null;
  staffName: string;
  staffInitials: string | null;
  reviewer: string | null;
  rating: number;
  notes: string | null;
};

type StaffAbsenceRow = {
  id: string;
  teamMemberName: string;
  teamMemberInitials: string | null;
  absenceType: string | null;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod: string | null;
  locationName: string | null;
  status: string | null;
  notes: string | null;
  operationalImpact: string | null;
  createdAt: string | null;
};

type AllergenReviewRow = {
  id: string;
  reviewedOn: string | null;
  nextDue: string | null;
  reviewer: string | null;
  daysUntil?: number | null;
};

type AllergenChangeRow = {
  id: string;
  createdAt: string | null;
  itemName: string | null;
  action: string | null;
  staffInitials: string | null;
};

type EducationRow = {
  id: string;
  staffName: string;
  staffInitials: string | null;
  staffEmail: string | null;
  type: string | null;
  awardedOn: string | null;
  expiresOn: string | null;
  daysUntil: number | null;
  status: "valid" | "expired" | "no-expiry";
  notes: string | null;
  certificateUrl: string | null;
};

type TrainingAreaRow = {
  memberId: string;
  name: string;
  initials: string | null;
  email: string | null;
  area: string;
  selected: boolean;
  awardedOn: string | null;
  expiresOn: string | null;
  daysUntil: number | null;
  status: "green" | "amber" | "red" | "unknown";
};

type CalibrationRow = {
  id: string;
  checkedOn: string;
  staffInitials: string;
  coldStorageChecked: boolean;
  probesChecked: boolean;
  thermometersChecked: boolean;
  allEquipmentCalibrated: boolean;
  notes: string | null;
  createdAt: string | null;
};

type HygieneLatest = {
  rating: number | null;
  visitDate: string | null;
  certificateExpiresAt: string | null;
  issuingAuthority: string | null;
  reference: string | null;
};

type HygieneHistoryRow = {
  id: string;
  rating: number | null;
  visitDate: string | null;
  certificateExpiresAt: string | null;
  issuingAuthority: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string | null;
};

type SummaryShape = {
  rangeLabel?: string;

  period?: {
    from?: string;
    to?: string;
    locationId?: string | null;
    days?: number;
  };

  compliantDays?: number;
  totalDays?: number;

  tempLogs?: number;
  tempFails?: number;

  cleaningDone?: number;
  cleaningTotal?: number | null;

  trainingDueSoon?: number;
  trainingOver?: number;
  trainingAssigned?: number;
  trainingInProgress?: number;

  allergenDueSoon?: number;
  allergenOver?: number;

  incidents?: number;

  signoffsDone?: number;
  signoffsExpected?: number | null;

  calibrationChecks?: number;
  calibrationDue?: boolean;

  staffOffToday?: number;
  staffAbsencesLast30Days?: number;

  managerQcReviews?: number;
  managerQcAverage?: number | null;

  topMissedAreas?: TopMissedArea[];
  topIssues?: TopIssue[];

  headline?: string[];
  recommendations?: string[];

  temperature?: {
    total?: number;
    fails?: number;
    failRatePct?: number;
    repeatFailures?: RepeatFailureRow[];
    recentLogs?: unknown[];
    recentFailures?: UnifiedIncidentRow[];
  };

  cleaning?: {
    dueTotal?: number;
    completedTotal?: number;
    missedTotal?: number;
    repeatMisses?: RepeatMissRow[];
    recentRuns?: CleaningRunRow[];
    categoryProgress?: CleaningCategoryProgressRow[];
  };

  training?: {
    expired?: number;
    dueSoon?: number;
    drift?: TrainingDriftRow[];
    records?: EducationRow[];
    areaCoverage?: TrainingAreaRow[];
  };

  allergens?: {
    dueSoon?: number;
    overdue?: number;
    recentChanges?: AllergenChangeRow[];
    recentReviews?: AllergenReviewRow[];
  };

  incidentsLog?: {
    total?: number;
    recent?: LoggedIncidentRow[];
  };

  signoffs?: {
    total?: number;
    expected?: number | null;
    recent?: SignoffRow[];
  };

  staffAbsences?: {
    total?: number;
    today?: number;
    last30Days?: number;
    recent?: StaffAbsenceRow[];
  };

  managerQc?: {
    total?: number;
    averageRating?: number | null;
    recent?: StaffReviewRow[];
  };

  calibration?: {
    total?: number;
    due?: boolean;
    recent?: CalibrationRow[];
  };

  hygiene?: {
    latest?: HygieneLatest | null;
    history?: HygieneHistoryRow[];
  };
};

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export default function FourWeekReviewPage() {
  const router = useRouter();

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<SummaryShape | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  const [showAllRepeatFails, setShowAllRepeatFails] = useState(false);
  const [showAllRepeatMisses, setShowAllRepeatMisses] = useState(false);
  const [showAllTrainingDrift, setShowAllTrainingDrift] = useState(false);
  const [showAllLoggedIncidents, setShowAllLoggedIncidents] = useState(false);
  const [showAllIncidentsDetailed, setShowAllIncidentsDetailed] = useState(false);
  const [showAllCleaningRuns, setShowAllCleaningRuns] = useState(false);
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);
  const [showAllStaffReviews, setShowAllStaffReviews] = useState(false);
  const [showAllStaffAbsences, setShowAllStaffAbsences] = useState(false);
  const [showAllAllergenReviews, setShowAllAllergenReviews] = useState(false);
  const [showAllAllergenChanges, setShowAllAllergenChanges] = useState(false);
  const [showAllEducation, setShowAllEducation] = useState(false);
  const [showAllTrainingAreas, setShowAllTrainingAreas] = useState(false);
  const [showAllCalibrationRows, setShowAllCalibrationRows] = useState(false);
  const [showAllHygieneHistory, setShowAllHygieneHistory] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        const locationId = await getActiveLocationIdClient();
        if (!alive) return;

        setActiveLocationId(locationId ?? null);

        const params = new URLSearchParams();
        if (locationId) params.set("locationId", locationId);

        const qs = params.toString();
        const res = await fetch(
          qs ? `/four-week-review/summary?${qs}` : "/four-week-review/summary",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            (json?.error as string | undefined) ||
            (json?.message as string | undefined) ||
            `Failed to load 4-week review (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        const s = (json?.summary ?? json) as SummaryShape;

        if (!alive) return;
        setSummary(s);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        console.error(e);
        setErr(e?.message ?? "Failed to load 4-week review.");
        setSummary(null);
        setLoading(false);
      }
    };

    void load();

    const onFocus = () => void load();
    const onCustom = () => void load();

    window.addEventListener("focus", onFocus);
    window.addEventListener("tt-location-changed" as any, onCustom);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("tt-location-changed" as any, onCustom);
    };
  }, []);

  const data = useMemo(() => {
    const s = summary ?? {};

    return {
      rangeLabel: s.rangeLabel ?? "Last 4 weeks",
      periodFrom: s.period?.from ?? null,
      periodTo: s.period?.to ?? null,
      periodLocationId: s.period?.locationId ?? null,

      compliantDays: typeof s.compliantDays === "number" ? s.compliantDays : 0,
      totalDays: typeof s.totalDays === "number" ? s.totalDays : 28,

      tempLogs: typeof s.tempLogs === "number" ? s.tempLogs : 0,
      tempFails: typeof s.tempFails === "number" ? s.tempFails : 0,

      cleaningDone: typeof s.cleaningDone === "number" ? s.cleaningDone : 0,
      cleaningTotal: typeof s.cleaningTotal === "number" ? s.cleaningTotal : null,

      trainingDueSoon: typeof s.trainingDueSoon === "number" ? s.trainingDueSoon : 0,
      trainingOver: typeof s.trainingOver === "number" ? s.trainingOver : 0,
      trainingAssigned: typeof s.trainingAssigned === "number" ? s.trainingAssigned : 0,
      trainingInProgress:
        typeof s.trainingInProgress === "number" ? s.trainingInProgress : 0,

      allergenDueSoon:
        typeof s.allergens?.dueSoon === "number"
          ? s.allergens.dueSoon
          : typeof s.allergenDueSoon === "number"
          ? s.allergenDueSoon
          : 0,

      allergenOver:
        typeof s.allergens?.overdue === "number"
          ? s.allergens.overdue
          : typeof s.allergenOver === "number"
          ? s.allergenOver
          : 0,

      incidents: typeof s.incidents === "number" ? s.incidents : 0,

      signoffsDone:
        typeof s.signoffs?.total === "number"
          ? s.signoffs.total
          : typeof s.signoffsDone === "number"
          ? s.signoffsDone
          : 0,

      signoffsExpected:
        typeof s.signoffs?.expected === "number"
          ? s.signoffs.expected
          : typeof s.signoffsExpected === "number"
          ? s.signoffsExpected
          : null,

      calibrationChecks:
        typeof s.calibration?.total === "number"
          ? s.calibration.total
          : typeof s.calibrationChecks === "number"
          ? s.calibrationChecks
          : 0,

      calibrationDue:
        typeof s.calibration?.due === "boolean"
          ? s.calibration.due
          : !!s.calibrationDue,

      staffOffToday:
        typeof s.staffOffToday === "number" ? s.staffOffToday : s.staffAbsences?.today ?? 0,

      staffAbsencesLast30Days:
        typeof s.staffAbsencesLast30Days === "number"
          ? s.staffAbsencesLast30Days
          : s.staffAbsences?.last30Days ?? 0,

      managerQcReviews:
        typeof s.managerQcReviews === "number"
          ? s.managerQcReviews
          : s.managerQc?.total ?? 0,

      managerQcAverage:
        typeof s.managerQcAverage === "number"
          ? s.managerQcAverage
          : s.managerQc?.averageRating ?? null,

      topMissedAreas: Array.isArray(s.topMissedAreas) ? s.topMissedAreas : [],
      topIssues: Array.isArray(s.topIssues) ? s.topIssues : [],

      headline: Array.isArray(s.headline) ? s.headline : [],
      recommendations: Array.isArray(s.recommendations) ? s.recommendations : [],

      repeatFailures: Array.isArray(s.temperature?.repeatFailures)
        ? s.temperature.repeatFailures
        : [],

      repeatMisses: Array.isArray(s.cleaning?.repeatMisses)
        ? s.cleaning.repeatMisses
        : [],

      trainingDrift: Array.isArray(s.training?.drift) ? s.training.drift : [],

      loggedIncidents: Array.isArray(s.incidentsLog?.recent) ? s.incidentsLog.recent : [],
      incidentsDetailed: Array.isArray(s.temperature?.recentFailures)
        ? s.temperature.recentFailures
        : [],

      cleaningRuns: Array.isArray(s.cleaning?.recentRuns) ? s.cleaning.recentRuns : [],
      cleaningCategoryProgress: Array.isArray(s.cleaning?.categoryProgress)
        ? s.cleaning.categoryProgress
        : [],

      signoffs: Array.isArray(s.signoffs?.recent) ? s.signoffs.recent : [],
      staffReviews: Array.isArray(s.managerQc?.recent) ? s.managerQc.recent : [],
      staffAbsences: Array.isArray(s.staffAbsences?.recent) ? s.staffAbsences.recent : [],
      allergenReviews: Array.isArray(s.allergens?.recentReviews) ? s.allergens.recentReviews : [],
      allergenChanges: Array.isArray(s.allergens?.recentChanges) ? s.allergens.recentChanges : [],
      education: Array.isArray(s.training?.records) ? s.training.records : [],
      trainingAreas: Array.isArray(s.training?.areaCoverage) ? s.training.areaCoverage : [],
      calibrationRows: Array.isArray(s.calibration?.recent) ? s.calibration.recent : [],

      hygieneLatest: s.hygiene?.latest ?? null,
      hygieneHistory: Array.isArray(s.hygiene?.history) ? s.hygiene.history : [],
    };
  }, [summary]);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const compliancePct = useMemo(() => {
    const denom = data.totalDays > 0 ? data.totalDays : 28;
    return Math.round((data.compliantDays / denom) * 100);
  }, [data.compliantDays, data.totalDays]);

  const cleaningPct = useMemo(() => {
    if (!data.cleaningTotal || data.cleaningTotal <= 0) return null;
    return Math.round((data.cleaningDone / data.cleaningTotal) * 100);
  }, [data.cleaningDone, data.cleaningTotal]);

  const signoffPct = useMemo(() => {
    if (!data.signoffsExpected || data.signoffsExpected <= 0) return null;
    return Math.round((data.signoffsDone / data.signoffsExpected) * 100);
  }, [data.signoffsDone, data.signoffsExpected]);

  const trainingAreaMatrix = useMemo(() => {
    if (!data.trainingAreas.length) return [];

    const map = new Map<
      string,
      {
        member_id: string;
        name: string;
        byArea: Record<string, { selected: boolean; awarded_on: string | null }>;
      }
    >();

    for (const r of data.trainingAreas) {
      const key = r.memberId;
      if (!map.has(key)) {
        map.set(key, {
          member_id: r.memberId,
          name: r.name,
          byArea: {},
        });
      }

      const row = map.get(key)!;
      row.byArea[r.area] = {
        selected: r.selected,
        awarded_on: r.awardedOn,
      };
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data.trainingAreas]);

  const allTrainingAreas = useMemo(() => {
    const set = new Set<string>();
    data.trainingAreas.forEach((r) => set.add(r.area));
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [data.trainingAreas]);

  const complianceTone: StatTone =
    compliancePct >= 90 ? "good" : compliancePct >= 75 ? "warn" : "bad";

  const cleaningTone: StatTone =
    cleaningPct === null
      ? "neutral"
      : cleaningPct >= 90
      ? "good"
      : cleaningPct >= 75
      ? "warn"
      : "bad";

  const tempsTone: StatTone =
    data.tempFails === 0 ? "good" : data.tempFails <= 3 ? "warn" : "bad";

  const trainingTone: StatTone =
    data.trainingOver > 0
      ? "bad"
      : data.trainingDueSoon > 0 ||
        data.trainingAssigned > 0 ||
        data.trainingInProgress > 0
      ? "warn"
      : "good";

  const allergenTone: StatTone =
    data.allergenOver > 0
      ? "bad"
      : data.allergenDueSoon > 0
      ? "warn"
      : "good";

  const incidentsTone: StatTone =
    data.incidents === 0 ? "good" : data.incidents <= 2 ? "warn" : "bad";

  const signoffTone: StatTone =
    signoffPct === null
      ? "neutral"
      : signoffPct >= 90
      ? "good"
      : signoffPct >= 75
      ? "warn"
      : "bad";

  const calibrationTone: StatTone =
    data.calibrationDue ? "warn" : data.calibrationChecks > 0 ? "good" : "neutral";

  const qcTone: StatTone =
    data.managerQcAverage == null
      ? "neutral"
      : data.managerQcAverage >= 4
      ? "good"
      : data.managerQcAverage >= 3
      ? "warn"
      : "bad";

  const staffingTone: StatTone =
    data.staffOffToday > 2 ? "bad" : data.staffOffToday > 0 ? "warn" : "good";

  const issueCards = useMemo(() => {
    if (data.topIssues.length > 0) return data.topIssues;

    const derived: Array<{ label: string; count: number; tone: StatTone }> = [];

    if (data.tempFails > 0) {
      derived.push({ label: "Temperature fails", count: data.tempFails, tone: "bad" });
    }
    if (data.trainingOver > 0) {
      derived.push({ label: "Training overdue", count: data.trainingOver, tone: "bad" });
    }
    if (data.trainingDueSoon > 0) {
      derived.push({
        label: "Training due soon",
        count: data.trainingDueSoon,
        tone: "warn",
      });
    }
    if (data.allergenOver > 0) {
      derived.push({
        label: "Allergen reviews overdue",
        count: data.allergenOver,
        tone: "bad",
      });
    }
    if (data.allergenDueSoon > 0) {
      derived.push({
        label: "Allergen reviews due soon",
        count: data.allergenDueSoon,
        tone: "warn",
      });
    }
    if (data.incidents > 0) {
      derived.push({ label: "Incidents", count: data.incidents, tone: "warn" });
    }

    return derived;
  }, [data]);

  const riskScore = useMemo(() => {
    let score = 0;

    if (compliancePct < 75) score += 3;
    else if (compliancePct < 90) score += 1;

    if ((cleaningPct ?? 100) < 75) score += 3;
    else if ((cleaningPct ?? 100) < 90) score += 1;

    if (data.tempFails > 0) score += Math.min(3, data.tempFails);
    if (data.trainingOver > 0) score += 3;
    else if (data.trainingDueSoon > 0) score += 1;

    if (data.allergenOver > 0) score += 3;
    else if (data.allergenDueSoon > 0) score += 1;

    if (data.incidents > 0) score += Math.min(2, data.incidents);
    if (data.repeatMisses.length > 0) score += 2;
    if (data.repeatFailures.length > 0) score += 2;
    if (data.calibrationDue) score += 1;
    if (data.staffOffToday > 2) score += 1;

    return score;
  }, [
    compliancePct,
    cleaningPct,
    data.tempFails,
    data.trainingOver,
    data.trainingDueSoon,
    data.allergenOver,
    data.allergenDueSoon,
    data.incidents,
    data.repeatMisses.length,
    data.repeatFailures.length,
    data.calibrationDue,
    data.staffOffToday,
  ]);

  const riskLevel: RiskLevel =
    riskScore >= 10 ? "HIGH" : riskScore >= 5 ? "MEDIUM" : "LOW";

  const riskTone: StatTone =
    riskLevel === "HIGH" ? "bad" : riskLevel === "MEDIUM" ? "warn" : "good";

  const isLocationScoped = !!(data.periodLocationId || activeLocationId);

  const repeatFailsToRender = showAllRepeatFails
    ? data.repeatFailures
    : data.repeatFailures.slice(0, 10);

  const repeatMissesToRender = showAllRepeatMisses
    ? data.repeatMisses
    : data.repeatMisses.slice(0, 10);

  const trainingDriftToRender = showAllTrainingDrift
    ? data.trainingDrift
    : data.trainingDrift.slice(0, 10);

  const loggedIncidentsToRender = showAllLoggedIncidents
    ? data.loggedIncidents
    : data.loggedIncidents.slice(0, 10);

  const incidentsDetailedToRender = showAllIncidentsDetailed
    ? data.incidentsDetailed
    : data.incidentsDetailed.slice(0, 10);

  const cleaningRunsToRender = showAllCleaningRuns
    ? data.cleaningRuns
    : data.cleaningRuns.slice(0, 10);

  const signoffsToRender = showAllSignoffs
    ? data.signoffs
    : data.signoffs.slice(0, 10);

  const staffReviewsToRender = showAllStaffReviews
    ? data.staffReviews
    : data.staffReviews.slice(0, 10);

  const staffAbsencesToRender = showAllStaffAbsences
    ? data.staffAbsences
    : data.staffAbsences.slice(0, 10);

  const allergenReviewsToRender = showAllAllergenReviews
    ? data.allergenReviews
    : data.allergenReviews.slice(0, 10);

  const allergenChangesToRender = showAllAllergenChanges
    ? data.allergenChanges
    : data.allergenChanges.slice(0, 10);

  const educationToRender = showAllEducation
    ? data.education
    : data.education.slice(0, 10);

  const trainingAreasToRender = showAllTrainingAreas
    ? trainingAreaMatrix
    : trainingAreaMatrix.slice(0, 10);

  const calibrationRowsToRender = showAllCalibrationRows
    ? data.calibrationRows
    : data.calibrationRows.slice(0, 10);

  const hygieneHistoryToRender = showAllHygieneHistory
    ? data.hygieneHistory
    : data.hygieneHistory.slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close"
        onClick={() => router.back()}
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute inset-x-0 bottom-0 top-10 mx-auto w-full max-w-7xl px-3 sm:top-12 sm:px-4">
        <div className="h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
                Four week review
              </div>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Compliance snapshot
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={complianceTone}>{data.rangeLabel}</Pill>

                {isLocationScoped ? (
                  <Pill tone="neutral">Current location</Pill>
                ) : (
                  <Pill tone="neutral">Org-wide</Pill>
                )}

                <Pill tone={riskTone}>Risk {riskLevel}</Pill>

                {data.periodFrom && data.periodTo ? (
                  <Pill tone="neutral">
                    {formatDDMMYYYY(data.periodFrom) ?? "—"} →{" "}
                    {formatDDMMYYYY(data.periodTo) ?? "—"}
                  </Pill>
                ) : null}

                <Pill tone={complianceTone}>
                  {loading ? "—" : `${compliancePct}%`} compliant days ({data.compliantDays}/
                  {data.totalDays})
                </Pill>

                <Pill tone={tempsTone}>{data.tempFails} temp fails</Pill>
                <Pill tone={trainingTone}>
                  {data.trainingOver > 0
                    ? `${data.trainingOver} training overdue`
                    : `${data.trainingDueSoon} training due soon`}
                </Pill>
                <Pill tone={allergenTone}>
                  {data.allergenOver > 0
                    ? `${data.allergenOver} allergen overdue`
                    : `${data.allergenDueSoon} allergen due soon`}
                </Pill>
                <Pill tone={incidentsTone}>{data.incidents} incidents</Pill>
              </div>

              {(err || (loading && !summary)) && (
                <div
                  className={cls(
                    "mt-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                    err
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  )}
                >
                  {err ? err : "Loading…"}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              
              <Link
                href="/reports?range=4w"
                className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:inline-flex"
              >
                View full report
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>

          <div className="h-[calc(100%-72px)] overflow-y-auto bg-slate-50/60 p-4 pb-24">
            <SectionCard
              id="risk-snapshot"
              title="Risk snapshot"
              subtitle="One brutal summary of how this period looks."
              icon="🛡️"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Pill tone={riskTone}>Risk level: {riskLevel}</Pill>
                  <div className="text-sm text-slate-700">Score {riskScore}</div>
                </div>

             
              </div>
            </SectionCard>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <StatCard
                title="Compliance"
                value={loading ? "—" : `${compliancePct}%`}
                subtitle={`${data.compliantDays}/${data.totalDays} days compliant`}
                tone={complianceTone}
                icon="✅"
                onClick={() => scrollToId("summary-headlines")}
              />

              <StatCard
                title="Temps"
                value={`${data.tempLogs}`}
                subtitle={`${data.tempFails} fails (4w)`}
                tone={tempsTone}
                icon="🌡️"
                onClick={() => scrollToId("repeat-temp-fails")}
              />

              <StatCard
                title="Cleaning"
                value={cleaningPct === null ? `${data.cleaningDone}` : `${cleaningPct}%`}
                subtitle={
                  cleaningPct === null
                    ? `${data.cleaningDone} done`
                    : `${data.cleaningDone}/${data.cleaningTotal} done`
                }
                tone={cleaningTone}
                icon="🧽"
                onClick={() => scrollToId("cleaning-progress")}
              />

              <StatCard
                title="Incidents"
                value={`${data.incidents}`}
                subtitle="Manual incident log (4w)"
                tone={incidentsTone}
                icon="⚠️"
                onClick={() => scrollToId("incidents-logged")}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <StatCard
                title="Training"
                value={
                  data.trainingOver > 0
                    ? `${data.trainingOver}`
                    : `${data.trainingDueSoon + data.trainingAssigned + data.trainingInProgress}`
                }
                subtitle={
                  data.trainingOver > 0
                    ? "Overdue training"
                    : `${data.trainingDueSoon} due soon · ${data.trainingAssigned} assigned · ${data.trainingInProgress} in progress`
                }
                tone={trainingTone}
                icon="🎓"
                onClick={() => scrollToId("training-drift")}
              />

              <StatCard
                title="Allergens"
                value={
                  data.allergenOver > 0
                    ? `${data.allergenOver}`
                    : `${data.allergenDueSoon}`
                }
                subtitle={
                  data.allergenOver > 0
                    ? "Overdue allergen reviews"
                    : `${data.allergenDueSoon} due soon`
                }
                tone={allergenTone}
                icon="🥜"
                onClick={() => scrollToId("allergen-reviews")}
              />

              <StatCard
                title="Sign-offs"
                value={signoffPct === null ? `${data.signoffsDone}` : `${signoffPct}%`}
                subtitle={
                  signoffPct === null
                    ? `${data.signoffsDone} signed off`
                    : `${data.signoffsDone}/${data.signoffsExpected} signed off`
                }
                tone={signoffTone}
                icon="📝"
                onClick={() => scrollToId("day-signoffs")}
              />

              <StatCard
                title="Calibration"
                value={`${data.calibrationChecks}`}
                subtitle={data.calibrationDue ? "Calibration due" : "Checks logged (4w)"}
                tone={calibrationTone}
                icon="📏"
                onClick={() => scrollToId("calibration-checks")}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <StatCard
                title="Staff off"
                value={`${data.staffOffToday}`}
                subtitle={`${data.staffAbsencesLast30Days} overlapping in last 30d`}
                tone={staffingTone}
                icon="🧑‍🍳"
                onClick={() => scrollToId("staff-absences")}
              />

              <StatCard
                title="Manager QC"
                value={data.managerQcAverage == null ? "—" : `${data.managerQcAverage}/5`}
                subtitle={`${data.managerQcReviews} reviews in period`}
                tone={qcTone}
                icon="👀"
                onClick={() => scrollToId("manager-qc")}
              />

              <StatCard
                title="Repeat misses"
                value={`${data.repeatMisses.length}`}
                subtitle="Repeated cleaning misses"
                tone={data.repeatMisses.length > 0 ? "warn" : "good"}
                icon="🪣"
                onClick={() => scrollToId("repeat-missed-cleaning")}
              />

              <StatCard
                title="Repeat fails"
                value={`${data.repeatFailures.length}`}
                subtitle="Repeated temp fail patterns"
                tone={data.repeatFailures.length > 0 ? "bad" : "good"}
                icon="🔥"
                onClick={() => scrollToId("repeat-temp-fails")}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="top-missed-areas"
                title="Top missed areas"
                subtitle="Where routines are most likely being skipped."
                icon="📌"
              >
                <div className="space-y-2">
                  {data.topMissedAreas.length === 0 ? (
                    <EmptyState>No routine miss data yet.</EmptyState>
                  ) : (
                    data.topMissedAreas.map((x) => (
                      <div
                        key={x.area}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-sm font-semibold text-slate-900">{x.area}</div>
                        <Pill tone={x.missed >= 4 ? "warn" : "neutral"}>
                          {x.missed} missed
                        </Pill>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                id="priority-issues"
                title="Priority issues"
                subtitle="The biggest things needing attention in this review window."
                icon="🚨"
              >
                <div className="space-y-2">
                  {issueCards.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                      No obvious problem areas surfaced in this period.
                    </div>
                  ) : (
                    issueCards.map((x) => (
                      <div
                        key={x.label}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-sm font-semibold text-slate-900">{x.label}</div>
                        <Pill tone={x.tone ?? "neutral"}>{x.count}</Pill>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="summary-headlines"
                title="Summary headlines"
                subtitle="Fast narrative overview of the period."
                icon="🧾"
              >
                {data.headline.length === 0 ? (
                  <EmptyState>No summary lines returned yet.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    {data.headline.map((line, idx) => (
                      <div
                        key={`${idx}_${line}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                id="recommendations"
                title="Recommendations"
                subtitle="What needs tightening before this turns into inspection pain."
                icon="🧠"
              >
                {data.recommendations.length === 0 ? (
                  <EmptyState>No recommendations returned yet.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    {data.recommendations.map((line, idx) => (
                      <div
                        key={`${idx}_${line}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="repeat-temp-fails"
                title="Repeat temperature failures"
                subtitle="Recurring fail patterns that deserve actual attention."
                icon="🌡️"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Area</th>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Count</th>
                        <th className="px-3 py-2">Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatFailsToRender.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No repeat temp failures found.
                          </td>
                        </tr>
                      ) : (
                        repeatFailsToRender.map((r) => (
                          <tr key={r.key} className="border-t border-slate-100">
                            <td className="px-3 py-2">{r.area || "—"}</td>
                            <td className="px-3 py-2">{r.item || "—"}</td>
                            <td className="px-3 py-2">
                              <Pill tone={r.count >= 3 ? "bad" : "warn"}>{r.count}</Pill>
                            </td>
                            <td className="px-3 py-2">{formatDDMMYYYY(r.lastSeenOn) ?? "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.repeatFailures.length}
                  visible={showAllRepeatFails}
                  onToggle={() => setShowAllRepeatFails((v) => !v)}
                />
              </SectionCard>

              <SectionCard
                id="repeat-missed-cleaning"
                title="Repeat missed cleaning"
                subtitle="Tasks that keep getting skipped. Inspiring."
                icon="🧼"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Task</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Area</th>
                        <th className="px-3 py-2">Missed</th>
                        <th className="px-3 py-2">Last missed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatMissesToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No repeated missed cleaning tasks found.
                          </td>
                        </tr>
                      ) : (
                        repeatMissesToRender.map((r) => (
                          <tr key={r.taskId} className="border-t border-slate-100">
                            <td className="px-3 py-2">{r.task || "—"}</td>
                            <td className="px-3 py-2">{r.category ?? "—"}</td>
                            <td className="px-3 py-2">{r.area ?? "—"}</td>
                            <td className="px-3 py-2">
                              <Pill tone={r.missedCount >= 3 ? "bad" : "warn"}>
                                {r.missedCount}
                              </Pill>
                            </td>
                            <td className="px-3 py-2">
                              {formatDDMMYYYY(r.lastMissedOn) ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.repeatMisses.length}
                  visible={showAllRepeatMisses}
                  onToggle={() => setShowAllRepeatMisses((v) => !v)}
                />
              </SectionCard>
            </div>

            <div className="mt-4">
              <SectionCard
                id="training-drift"
                title="Training drift"
                subtitle="Expired and near-expiry records across the review period."
                icon="🎓"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Staff</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Expires</th>
                        <th className="px-3 py-2">Days</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingDriftToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No training drift records returned.
                          </td>
                        </tr>
                      ) : (
                        trainingDriftToRender.map((r, idx) => {
                          const staffLabel = r.staffInitials
                            ? `${String(r.staffInitials).toUpperCase()} · ${r.staffName}`
                            : r.staffName;

                          return (
                            <tr
                              key={`${r.staffName}_${r.type}_${idx}`}
                              className="border-t border-slate-100"
                            >
                              <td className="px-3 py-2">{staffLabel}</td>
                              <td className="px-3 py-2">{r.type || "—"}</td>
                              <td className="px-3 py-2">
                                {formatDDMMYYYY(r.expiresOn) ?? "—"}
                              </td>
                              <td className="px-3 py-2">{formatDays(r.daysLeft)}</td>
                              <td className="px-3 py-2">
                                <Pill tone={r.status === "expired" ? "bad" : "warn"}>
                                  {r.status === "expired" ? "Expired" : "Due soon"}
                                </Pill>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.trainingDrift.length}
                  visible={showAllTrainingDrift}
                  onToggle={() => setShowAllTrainingDrift((v) => !v)}
                />
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="cleaning-progress"
                title="Cleaning category progress"
                subtitle="Completion split by category across the review period."
                icon="📊"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Done</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cleaningCategoryProgress.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No category progress returned.
                          </td>
                        </tr>
                      ) : (
                        data.cleaningCategoryProgress.map((r) => {
                          const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                          const tone: StatTone =
                            pct === 100 ? "good" : pct >= 50 ? "warn" : "bad";

                          return (
                            <tr key={r.category} className="border-t border-slate-100">
                              <td className="px-3 py-2">{r.category}</td>
                              <td className="px-3 py-2">{r.done}</td>
                              <td className="px-3 py-2">{r.total}</td>
                              <td className="px-3 py-2">
                                <Pill tone={tone}>{pct}%</Pill>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
              </SectionCard>

              <SectionCard
                id="hygiene-rating"
                title="Hygiene rating"
                subtitle="Latest recorded food hygiene rating for this location."
                icon="⭐"
              >
                {!data.hygieneLatest ? (
                  <EmptyState>No hygiene rating data returned.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                        Latest
                      </div>
                      <div className="mt-2 text-4xl font-extrabold text-slate-900">
                        {data.hygieneLatest.rating != null ? `${data.hygieneLatest.rating}/5` : "—"}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        <div>Visit: {formatDDMMYYYY(data.hygieneLatest.visitDate) ?? "—"}</div>
                        <div>
                          Certificate expires:{" "}
                          {formatDDMMYYYY(data.hygieneLatest.certificateExpiresAt) ?? "—"}
                        </div>
                        <div>Authority: {data.hygieneLatest.issuingAuthority ?? "—"}</div>
                        <div>Reference: {data.hygieneLatest.reference ?? "—"}</div>
                      </div>
                    </div>

                    <SimpleTable>
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/80">
                          <tr className="text-left text-slate-500">
                            <th className="px-3 py-2">Visit</th>
                            <th className="px-3 py-2">Rating</th>
                            <th className="px-3 py-2">Authority</th>
                            <th className="px-3 py-2">Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hygieneHistoryToRender.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                                No hygiene history returned.
                              </td>
                            </tr>
                          ) : (
                            hygieneHistoryToRender.map((r) => (
                              <tr key={r.id} className="border-t border-slate-100">
                                <td className="px-3 py-2">{formatDDMMYYYY(r.visitDate) ?? "—"}</td>
                                <td className="px-3 py-2">
                                  <Pill
                                    tone={r.rating != null && r.rating >= 4 ? "good" : "warn"}
                                  >
                                    {r.rating != null ? `${r.rating}/5` : "—"}
                                  </Pill>
                                </td>
                                <td className="px-3 py-2">{r.issuingAuthority ?? "—"}</td>
                                <td className="px-3 py-2">{r.reference ?? "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </SimpleTable>

                    <SectionFooterToggle
                      total={data.hygieneHistory.length}
                      visible={showAllHygieneHistory}
                      onToggle={() => setShowAllHygieneHistory((v) => !v)}
                    />
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="incidents-logged"
                title="Incidents (logged)"
                subtitle="Manual incident log for the same review period."
                icon="📒"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">By</th>
                        <th className="px-3 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loggedIncidentsToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No logged incidents returned.
                          </td>
                        </tr>
                      ) : (
                        loggedIncidentsToRender.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              {formatDDMMYYYY(r.happenedOn) ?? "—"}
                            </td>
                            <td className="px-3 py-2">{formatTimeHM(r.createdAt) ?? "—"}</td>
                            <td className="px-3 py-2">{r.type ?? "Incident"}</td>
                            <td className="px-3 py-2">
                              {r.createdBy ? r.createdBy.toUpperCase() : "—"}
                            </td>
                            <td className="px-3 py-2 max-w-[20rem]">
                              <span className="line-clamp-2">{r.details ?? "—"}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.loggedIncidents.length}
                  visible={showAllLoggedIncidents}
                  onToggle={() => setShowAllLoggedIncidents((v) => !v)}
                />
              </SectionCard>

              <SectionCard
                id="failure-corrective-actions"
                title="Failures & corrective actions"
                subtitle="Temp fails with corrective actions from the same summary window."
                icon="🚨"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">By</th>
                        <th className="px-3 py-2">Details</th>
                        <th className="px-3 py-2">Corrective</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidentsDetailedToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No failure / corrective data returned.
                          </td>
                        </tr>
                      ) : (
                        incidentsDetailedToRender.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              {formatDDMMYYYY(r.happenedOn) ?? "—"}
                            </td>
                            <td className="px-3 py-2">{formatTimeHM(r.createdAt) ?? "—"}</td>
                            <td className="px-3 py-2">
                              {r.createdBy ? r.createdBy.toUpperCase() : "—"}
                            </td>
                            <td className="px-3 py-2 max-w-[16rem]">
                              <span className="line-clamp-2">{r.details ?? "—"}</span>
                            </td>
                            <td className="px-3 py-2 max-w-[16rem]">
                              <span className="line-clamp-2">{r.correctiveAction ?? "—"}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.incidentsDetailed.length}
                  visible={showAllIncidentsDetailed}
                  onToggle={() => setShowAllIncidentsDetailed((v) => !v)}
                />
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="cleaning-runs"
                title="Cleaning runs"
                subtitle="Completed cleaning tasks logged in the review window."
                icon="🧽"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Task</th>
                        <th className="px-3 py-2">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cleaningRunsToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No cleaning runs returned.
                          </td>
                        </tr>
                      ) : (
                        cleaningRunsToRender.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">{formatDDMMYYYY(r.runOn) ?? "—"}</td>
                            <td className="px-3 py-2">{formatTimeHM(r.doneAt) ?? "—"}</td>
                            <td className="px-3 py-2">{r.category}</td>
                            <td className="px-3 py-2 max-w-[16rem]">
                              <span className="line-clamp-2">{r.task}</span>
                            </td>
                            <td className="px-3 py-2">{r.doneBy ?? "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.cleaningRuns.length}
                  visible={showAllCleaningRuns}
                  onToggle={() => setShowAllCleaningRuns((v) => !v)}
                />
              </SectionCard>

              <SectionCard
                id="day-signoffs"
                title="Day sign-offs"
                subtitle="Recorded sign-offs and notes for the same review window."
                icon="📝"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Signed by</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signoffsToRender.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No sign-offs returned.
                          </td>
                        </tr>
                      ) : (
                        signoffsToRender.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              {formatDDMMYYYY(r.signoffOn) ?? "—"}
                            </td>
                            <td className="px-3 py-2">{formatTimeHM(r.createdAt) ?? "—"}</td>
                            <td className="px-3 py-2">
                              {r.signedBy ? r.signedBy.toUpperCase() : "—"}
                            </td>
                            <td className="px-3 py-2 max-w-[20rem]">
                              <span className="line-clamp-2">{r.notes ?? "—"}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.signoffs.length}
                  visible={showAllSignoffs}
                  onToggle={() => setShowAllSignoffs((v) => !v)}
                />
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="manager-qc"
                title="Manager QC reviews"
                subtitle="Staff QC records captured during the review window."
                icon="👀"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Staff</th>
                        <th className="px-3 py-2">Manager</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffReviewsToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No manager QC reviews returned.
                          </td>
                        </tr>
                      ) : (
                        staffReviewsToRender.map((r) => {
                          const staffLabel = r.staffInitials
                            ? `${r.staffInitials.toUpperCase()} · ${r.staffName}`
                            : r.staffName;

                          const tone: StatTone =
                            r.rating >= 4 ? "good" : r.rating === 3 ? "warn" : "bad";

                          return (
                            <tr key={r.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">
                                {formatDDMMYYYY(r.reviewedOn) ?? "—"}
                              </td>
                              <td className="px-3 py-2">{staffLabel}</td>
                              <td className="px-3 py-2">{r.reviewer ?? "—"}</td>
                              <td className="px-3 py-2">
                                <Pill tone={tone}>{r.rating}/5</Pill>
                              </td>
                              <td className="px-3 py-2 max-w-[18rem]">
                                <span className="line-clamp-2">{r.notes ?? "—"}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.staffReviews.length}
                  visible={showAllStaffReviews}
                  onToggle={() => setShowAllStaffReviews((v) => !v)}
                />
              </SectionCard>

              <SectionCard
                id="staff-absences"
                title="Staff absences"
                subtitle="Approved and overlapping absence records in the review window."
                icon="🧑‍🍳"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Staff</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Dates</th>
                        <th className="px-3 py-2">Location</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffAbsencesToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No staff absences returned.
                          </td>
                        </tr>
                      ) : (
                        staffAbsencesToRender.map((r) => {
                          const staffLabel = r.teamMemberInitials
                            ? `${r.teamMemberInitials.toUpperCase()} · ${r.teamMemberName}`
                            : r.teamMemberName;

                          const tone: StatTone =
                            r.status === "approved"
                              ? "good"
                              : r.status === "pending"
                              ? "warn"
                              : r.status === "rejected"
                              ? "bad"
                              : "neutral";

                          return (
                            <tr key={r.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">{staffLabel}</td>
                              <td className="px-3 py-2">{titleCase(r.absenceType)}</td>
                              <td className="px-3 py-2">{prettyAbsenceRange(r)}</td>
                              <td className="px-3 py-2">{r.locationName ?? "All / org-wide"}</td>
                              <td className="px-3 py-2">
                                <Pill tone={tone}>{titleCase(r.status)}</Pill>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.staffAbsences.length}
                  visible={showAllStaffAbsences}
                  onToggle={() => setShowAllStaffAbsences((v) => !v)}
                />
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="training-records"
                title="Training & certificates"
                subtitle="Formal training records carried into the 4-week review."
                icon="📚"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Staff</th>
                        <th className="px-3 py-2">Course</th>
                        <th className="px-3 py-2">Awarded</th>
                        <th className="px-3 py-2">Expires</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {educationToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No training records returned.
                          </td>
                        </tr>
                      ) : (
                        educationToRender.map((r) => {
                          const staffLabel = r.staffInitials
                            ? `${r.staffInitials.toUpperCase()} · ${r.staffName}`
                            : r.staffName;

                          const tone: StatTone =
                            r.status === "expired"
                              ? "bad"
                              : r.status === "valid"
                              ? "good"
                              : "neutral";

                          const statusText =
                            r.status === "no-expiry"
                              ? "No expiry"
                              : r.status === "expired"
                              ? "Expired"
                              : "Valid";

                          return (
                            <tr key={r.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">{staffLabel}</td>
                              <td className="px-3 py-2">{r.type ?? "—"}</td>
                              <td className="px-3 py-2">
                                {formatDDMMYYYY(r.awardedOn) ?? "—"}
                              </td>
                              <td className="px-3 py-2">
                                {formatDDMMYYYY(r.expiresOn) ?? "—"}
                              </td>
                              <td className="px-3 py-2">
                                <Pill tone={tone}>
                                  {statusText}
                                  {r.daysUntil != null ? ` (${r.daysUntil}d)` : ""}
                                </Pill>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.education.length}
                  visible={showAllEducation}
                  onToggle={() => setShowAllEducation((v) => !v)}
                />
              </SectionCard>

              <SectionCard
                id="training-areas"
                title="Training areas"
                subtitle="SFBB-style coverage view, because vague training claims are not a system."
                icon="🧩"
              >
                <SimpleTable>
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Team member</th>
                        {allTrainingAreas.length === 0 ? (
                          <th className="px-3 py-2">Areas</th>
                        ) : (
                          allTrainingAreas.map((area) => (
                            <th key={area} className="px-2 py-2 text-center">
                              {area}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {trainingAreasToRender.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(2, 1 + allTrainingAreas.length)}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No training area data returned.
                          </td>
                        </tr>
                      ) : (
                        trainingAreasToRender.map((row) => (
                          <tr key={row.member_id} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-sm font-medium">{row.name}</td>
                            {allTrainingAreas.length === 0 ? (
                              <td className="px-3 py-2 text-slate-500">—</td>
                            ) : (
                              allTrainingAreas.map((area) => {
                                const meta = row.byArea[area];
                                if (!meta?.selected) {
                                  return (
                                    <td key={area} className="px-2 py-2 text-center text-slate-400">
                                      —
                                    </td>
                                  );
                                }
                                return (
                                  <td key={area} className="px-2 py-2 text-center">
                                    <div className="inline-flex flex-col items-center gap-1">
                                      <span className="text-base leading-none">✓</span>
                                      {meta.awarded_on ? (
                                        <span className="text-[10px] text-slate-500">
                                          {formatDDMMYYYY(meta.awarded_on)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={trainingAreaMatrix.length}
                  visible={showAllTrainingAreas}
                  onToggle={() => setShowAllTrainingAreas((v) => !v)}
                  label="team members"
                />
              </SectionCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SectionCard
                id="allergen-reviews"
                title="Allergen reviews"
                subtitle="Historic allergen review dates and next-due positions."
                icon="🥜"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Last review</th>
                        <th className="px-3 py-2">Next due</th>
                        <th className="px-3 py-2">Days</th>
                        <th className="px-3 py-2">Reviewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allergenReviewsToRender.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No allergen review history returned.
                          </td>
                        </tr>
                      ) : (
                        allergenReviewsToRender.map((r) => {
                          const tone: StatTone =
                            r.daysUntil == null
                              ? "neutral"
                              : r.daysUntil < 0
                              ? "bad"
                              : r.daysUntil <= 30
                              ? "warn"
                              : "good";

                          return (
                            <tr key={r.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">
                                {formatDDMMYYYY(r.reviewedOn) ?? "—"}
                              </td>
                              <td className="px-3 py-2">
                                {formatDDMMYYYY(r.nextDue) ?? "—"}
                              </td>
                              <td className="px-3 py-2">
                                <Pill tone={tone}>
                                  {r.daysUntil == null ? "—" : `${r.daysUntil}d`}
                                </Pill>
                              </td>
                              <td className="px-3 py-2">{r.reviewer ?? "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.allergenReviews.length}
                  visible={showAllAllergenReviews}
                  onToggle={() => setShowAllAllergenReviews((v) => !v)}
                />
              </SectionCard>

              <SectionCard
                id="allergen-edits"
                title="Allergen edits"
                subtitle="Change history for allergen information in the same period."
                icon="✏️"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allergenChangesToRender.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            No allergen edit log returned.
                          </td>
                        </tr>
                      ) : (
                        allergenChangesToRender.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              {formatDDMMYYYY(r.createdAt) ?? "—"}
                            </td>
                            <td className="px-3 py-2">{formatTimeHM(r.createdAt) ?? "—"}</td>
                            <td className="px-3 py-2">{r.itemName ?? "—"}</td>
                            <td className="px-3 py-2">{titleCase(r.action)}</td>
                            <td className="px-3 py-2">
                              {r.staffInitials ? r.staffInitials.toUpperCase() : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.allergenChanges.length}
                  visible={showAllAllergenChanges}
                  onToggle={() => setShowAllAllergenChanges((v) => !v)}
                />
              </SectionCard>
            </div>

            <div className="mt-4">
              <SectionCard
                id="calibration-checks"
                title="Calibration checks"
                subtitle="Probe, thermometer and cold storage calibration evidence."
                icon="📏"
              >
                <SimpleTable>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Staff</th>
                        <th className="px-3 py-2">Cold storage</th>
                        <th className="px-3 py-2">Probes</th>
                        <th className="px-3 py-2">Thermometers</th>
                        <th className="px-3 py-2">Complete</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calibrationRowsToRender.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                            No calibration records returned.
                          </td>
                        </tr>
                      ) : (
                        calibrationRowsToRender.map((r) => {
                          const pill = (v: boolean) => (
                            <Pill tone={v ? "good" : "neutral"}>{v ? "Yes" : "No"}</Pill>
                          );

                          return (
                            <tr key={r.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">
                                {formatDDMMYYYY(r.checkedOn) ?? "—"}
                              </td>
                              <td className="px-3 py-2">
                                {r.staffInitials ? r.staffInitials.toUpperCase() : "—"}
                              </td>
                              <td className="px-3 py-2">{pill(!!r.coldStorageChecked)}</td>
                              <td className="px-3 py-2">{pill(!!r.probesChecked)}</td>
                              <td className="px-3 py-2">{pill(!!r.thermometersChecked)}</td>
                              <td className="px-3 py-2">
                                <Pill tone={r.allEquipmentCalibrated ? "good" : "warn"}>
                                  {r.allEquipmentCalibrated ? "Yes" : "No"}
                                </Pill>
                              </td>
                              <td className="px-3 py-2 max-w-[18rem]">
                                <span className="line-clamp-2">{r.notes ?? "—"}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </SimpleTable>
                <SectionFooterToggle
                  total={data.calibrationRows.length}
                  visible={showAllCalibrationRows}
                  onToggle={() => setShowAllCalibrationRows((v) => !v)}
                />
              </SectionCard>
            </div>

            <div className="h-20 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}