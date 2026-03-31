"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import {
  HACCP_CATEGORY_LABELS,
  cloneDefaultHaccpProcedures,
  mergeProcedureOverrides,
  type HaccpCategory,
  type HaccpDocumentMeta,
  type HaccpProcedure,
  type HaccpProcedureOverrideRow,
} from "@/lib/haccpProcedures";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";
import { useAuth } from "@/components/AuthProvider";

const CATEGORY_ORDER: HaccpCategory[] = [
  "personal_hygiene",
  "cross_contamination",
  "cleaning",
  "chilling",
  "cooking",
  "hot_holding",
  "allergens",
  "suppliers",
  "pest_control",
  "traceability",
];

type TeamRole = "owner" | "admin" | "manager" | "staff" | null;
type HaccpDocumentStatus = "draft" | "published";

type LocationRow = {
  name: string | null;
};

type HaccpDocumentRow = {
  title: string;
  version: string;
  reviewed_by: string | null;
  last_reviewed_at: string | null;
  next_review_due: string | null;
  review_interval_months: number | null;
  site_address: string | null;
  notes: string | null;
  status: HaccpDocumentStatus | null;
  published_at: string | null;
  published_by: string | null;
};

type HaccpReviewRow = {
  id: string;
  reviewed_by: string;
  reviewed_at: string;
  version: string | null;
  notes: string | null;
};

type HaccpChangeLogRow = {
  id: string;
  procedure_key: string;
  changed_by: string;
  changed_at: string;
  version: string | null;
  change_summary: string;
};

type PageMeta = HaccpDocumentMeta & {
  status: HaccpDocumentStatus;
  publishedAt: string | null;
  publishedBy: string | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function linesToText(items: string[]) {
  return items.join("\n");
}

function isoDateToDisplay(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB");
  } catch {
    return value;
  }
}

function isoDateTimeToDisplay(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-GB");
  } catch {
    return value;
  }
}

function todayPlusMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addMonthsToIsoDate(baseIso: string | null, months: number) {
  const d = baseIso ? new Date(baseIso) : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function isManagerRole(role: string | null | undefined): role is "owner" | "admin" | "manager" {
  const r = String(role ?? "").toLowerCase();
  return r === "owner" || r === "admin" || r === "manager";
}

function defaultMeta(locationName: string): PageMeta {
  return {
    title: `${locationName} HACCP Procedures`,
    version: "1.0",
    reviewedBy: null,
    lastReviewedAt: null,
    nextReviewDue: todayPlusMonths(12),
    reviewIntervalMonths: 12,
    siteAddress: locationName,
    notes: "",
    status: "draft",
    publishedAt: null,
    publishedBy: null,
  };
}

function getProcedureOverridePayload(procedure: HaccpProcedure) {
  return {
    procedure_key: procedure.id,
    title: procedure.title,
    summary: procedure.summary,
    scope: procedure.scope,
    hazards: procedure.hazards,
    control_measures: procedure.controlMeasures,
    critical_limits: procedure.criticalLimits,
    monitoring: procedure.monitoring,
    corrective_actions: procedure.correctiveActions,
    verification: procedure.verification,
    is_ccp: procedure.isCcp,
  };
}

function getStatus(meta: PageMeta) {
  if (meta.status === "draft") {
    return {
      label: "Draft",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (meta.nextReviewDue) {
    const due = new Date(meta.nextReviewDue);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (due < today) {
      return {
        label: "Published · Overdue review",
        tone: "border-red-200 bg-red-50 text-red-700",
      };
    }
  }

  return {
    label: "Published",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function daysUntilReview(nextReviewDue: string | null) {
  if (!nextReviewDue) return null;
  const today = new Date();
  const due = new Date(nextReviewDue);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function evidenceLabel(label: string) {
  const normal = label.trim().toLowerCase();

  switch (normal) {
    case "routines":
      return "View monitoring routines";
    case "reports":
      return "View compliance reports";
    case "allergens":
      return "View allergen controls";
    case "cleaning rota":
      return "View cleaning evidence";
    case "team & training":
      return "View staff training records";
    case "suppliers":
      return "View supplier records";
    default:
      return `View ${label}`;
  }
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function summariseProcedureChanges(before: HaccpProcedure, after: HaccpProcedure) {
  const changes: string[] = [];

  if (before.title !== after.title) changes.push("title");
  if (before.summary !== after.summary) changes.push("summary");
  if (before.scope !== after.scope) changes.push("scope");
  if (before.isCcp !== after.isCcp) changes.push("CCP flag");
  if (!arraysEqual(before.hazards, after.hazards)) changes.push("hazards");
  if (!arraysEqual(before.controlMeasures, after.controlMeasures)) changes.push("control measures");
  if (!arraysEqual(before.criticalLimits, after.criticalLimits)) changes.push("critical limits");
  if (!arraysEqual(before.monitoring, after.monitoring)) changes.push("monitoring");
  if (!arraysEqual(before.correctiveActions, after.correctiveActions)) changes.push("corrective actions");
  if (!arraysEqual(before.verification, after.verification)) changes.push("verification");

  if (changes.length === 0) return null;
  if (changes.length === 1) return `Updated ${changes[0]}.`;
  if (changes.length === 2) return `Updated ${changes[0]} and ${changes[1]}.`;

  return `Updated ${changes.slice(0, -1).join(", ")} and ${changes[changes.length - 1]}.`;
}

function FieldList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="text-sm leading-6 text-slate-700">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditableListField({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <textarea
        value={linesToText(value)}
        onChange={(e) => onChange(parseLines(e.target.value))}
        rows={6}
        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
      />
      <p className="mt-2 text-xs text-slate-500">One point per line.</p>
    </div>
  );
}

function ProcedureCard({
  procedure,
  editMode,
  onChange,
  number,
}: {
  procedure: HaccpProcedure;
  editMode: boolean;
  onChange: (next: HaccpProcedure) => void;
  number: number;
}) {
  return (
    <section
      id={procedure.id}
      className="scroll-mt-28 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {HACCP_CATEGORY_LABELS[procedure.category]}
        </span>

        <span
          className={cx(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            procedure.isCcp
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-600"
          )}
        >
          {procedure.isCcp ? "CCP" : "Control procedure"}
        </span>
      </div>

      {editMode ? (
        <>
          <input
            value={procedure.title}
            onChange={(e) => onChange({ ...procedure, title: e.target.value })}
            className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-2xl font-semibold tracking-tight text-slate-900 outline-none focus:border-slate-900"
          />
          <textarea
            value={procedure.summary}
            onChange={(e) => onChange({ ...procedure, summary: e.target.value })}
            rows={3}
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-700 outline-none focus:border-slate-900"
          />
        </>
      ) : (
        <div className="mt-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {number}. {procedure.title}
          </h2>
          <p className="mt-2 text-base leading-7 text-slate-600">{procedure.summary}</p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Scope
        </div>

        {editMode ? (
          <textarea
            value={procedure.scope}
            onChange={(e) => onChange({ ...procedure, scope: e.target.value })}
            rows={3}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900"
          />
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-700">{procedure.scope}</p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {editMode ? (
          <>
            <EditableListField
              title="Hazards"
              value={procedure.hazards}
              onChange={(hazards) => onChange({ ...procedure, hazards })}
            />
            <EditableListField
              title="Control measures"
              value={procedure.controlMeasures}
              onChange={(controlMeasures) => onChange({ ...procedure, controlMeasures })}
            />
            <EditableListField
              title="Critical limits"
              value={procedure.criticalLimits}
              onChange={(criticalLimits) => onChange({ ...procedure, criticalLimits })}
            />
            <EditableListField
              title="Monitoring"
              value={procedure.monitoring}
              onChange={(monitoring) => onChange({ ...procedure, monitoring })}
            />
            <EditableListField
              title="Corrective actions"
              value={procedure.correctiveActions}
              onChange={(correctiveActions) => onChange({ ...procedure, correctiveActions })}
            />
            <EditableListField
              title="Verification / review"
              value={procedure.verification}
              onChange={(verification) => onChange({ ...procedure, verification })}
            />
          </>
        ) : (
          <>
            <FieldList title="Hazards" items={procedure.hazards} />
            <FieldList title="Control measures" items={procedure.controlMeasures} />
            <FieldList title="Critical limits" items={procedure.criticalLimits} />
            <FieldList title="Monitoring" items={procedure.monitoring} />
            <FieldList title="Corrective actions" items={procedure.correctiveActions} />
            <FieldList title="Verification / review" items={procedure.verification} />
          </>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Linked evidence
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Open the live records that support this procedure.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {procedure.records.map((record) => (
            <Link
              key={`${procedure.id}-${record.label}-${record.href}`}
              href={record.href}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              {evidenceLabel(record.label)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HaccpProceduresPage() {
  const { operator } = useWorkstation();
  const { user } = useAuth();

  const [ready, setReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("Current site");
  const [role, setRole] = useState<TeamRole>(null);

  const [editMode, setEditMode] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<HaccpCategory | "all">("all");

  const [meta, setMeta] = useState<PageMeta>(defaultMeta("Current site"));
  const [procedures, setProcedures] = useState<HaccpProcedure[]>(cloneDefaultHaccpProcedures());
  const [reviewHistory, setReviewHistory] = useState<HaccpReviewRow[]>([]);
  const [changeHistory, setChangeHistory] = useState<HaccpChangeLogRow[]>([]);
  const [reviewNote, setReviewNote] = useState("");

  const canEdit = isManagerRole(operator?.role ?? role);
  const status = getStatus(meta);
  const dueInDays = daysUntilReview(meta.nextReviewDue);

  const ccpCount = useMemo(
    () => procedures.filter((procedure) => procedure.isCcp).length,
    [procedures]
  );

  const totalEvidenceLinks = useMemo(
    () => procedures.reduce((sum, procedure) => sum + procedure.records.length, 0),
    [procedures]
  );

  const reviewSummaryLabel = useMemo(() => {
    if (dueInDays === null) return "No review date set";
    if (dueInDays < 0) return `${Math.abs(dueInDays)} day${Math.abs(dueInDays) === 1 ? "" : "s"} overdue`;
    if (dueInDays === 0) return "Due today";
    return `${dueInDays} day${dueInDays === 1 ? "" : "s"} until review`;
  }, [dueInDays]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextOrgId = await getActiveOrgIdClient();
        const nextLocationId = nextOrgId ? await getActiveLocationIdClient(nextOrgId) : null;

        if (!nextOrgId || !nextLocationId) {
          if (!cancelled) {
            setLoadingError("No active organisation or location found.");
            setReady(true);
          }
          return;
        }

        if (cancelled) return;

        setOrgId(nextOrgId);
        setLocationId(nextLocationId);

        const [locationRes, roleRes, docRes, overrideRes, reviewRes, changeRes] = await Promise.all([
          supabase.from("locations").select("name").eq("id", nextLocationId).maybeSingle(),
          user
            ? supabase
                .from("team_members")
                .select("role")
                .eq("org_id", nextOrgId)
                .eq("active", true)
                .eq("user_id", user.id)
                .or(`location_id.eq.${nextLocationId},location_id.is.null`)
                .limit(1)
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from("haccp_documents")
            .select(
              "title,version,reviewed_by,last_reviewed_at,next_review_due,review_interval_months,site_address,notes,status,published_at,published_by"
            )
            .eq("org_id", nextOrgId)
            .eq("location_id", nextLocationId)
            .maybeSingle(),
          supabase
            .from("haccp_procedure_overrides")
            .select(
              "procedure_key,title,summary,scope,hazards,control_measures,critical_limits,monitoring,corrective_actions,verification,is_ccp"
            )
            .eq("org_id", nextOrgId)
            .eq("location_id", nextLocationId),
          supabase
            .from("haccp_document_reviews")
            .select("id,reviewed_by,reviewed_at,version,notes")
            .eq("org_id", nextOrgId)
            .eq("location_id", nextLocationId)
            .order("reviewed_at", { ascending: false })
            .limit(20),
          supabase
            .from("haccp_procedure_change_log")
            .select("id,procedure_key,changed_by,changed_at,version,change_summary")
            .eq("org_id", nextOrgId)
            .eq("location_id", nextLocationId)
            .order("changed_at", { ascending: false })
            .limit(30),
        ]);

        if (cancelled) return;

        const locationRow = (locationRes.data ?? null) as LocationRow | null;
        const resolvedLocationName = locationRow?.name?.trim() || "Current site";
        setLocationName(resolvedLocationName);

        const tmRole =
          Array.isArray(roleRes.data) && roleRes.data[0]?.role
            ? String(roleRes.data[0].role).toLowerCase()
            : null;
        setRole((tmRole as TeamRole) ?? null);

        const docRow = (docRes.data ?? null) as HaccpDocumentRow | null;

        const nextMeta: PageMeta = docRow
          ? {
              title: docRow.title,
              version: docRow.version,
              reviewedBy: docRow.reviewed_by,
              lastReviewedAt: docRow.last_reviewed_at,
              nextReviewDue: docRow.next_review_due,
              reviewIntervalMonths: docRow.review_interval_months ?? 12,
              siteAddress: docRow.site_address?.trim() || resolvedLocationName,
              notes: docRow.notes ?? "",
              status: docRow.status ?? "draft",
              publishedAt: docRow.published_at,
              publishedBy: docRow.published_by,
            }
          : defaultMeta(resolvedLocationName);

        setMeta(nextMeta);

        const defaults = cloneDefaultHaccpProcedures();
        const merged = mergeProcedureOverrides(
          defaults,
          (overrideRes.data ?? []) as HaccpProcedureOverrideRow[]
        );

        setProcedures(merged);
        setReviewHistory((reviewRes.data ?? []) as HaccpReviewRow[]);
        setChangeHistory((changeRes.data ?? []) as HaccpChangeLogRow[]);
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : "Failed to load HACCP data.");
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredProcedures = useMemo(() => {
    const q = search.trim().toLowerCase();

    return procedures.filter((procedure) => {
      const categoryOk = category === "all" || procedure.category === category;
      if (!categoryOk) return false;

      if (!q) return true;

      const haystack = [
        procedure.title,
        procedure.summary,
        procedure.scope,
        ...procedure.hazards,
        ...procedure.controlMeasures,
        ...procedure.criticalLimits,
        ...procedure.monitoring,
        ...procedure.correctiveActions,
        ...procedure.verification,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [category, procedures, search]);

  const updateProcedure = (id: string, next: HaccpProcedure) => {
    setProcedures((current) => current.map((item) => (item.id === id ? next : item)));
  };

  const handleSave = async () => {
    if (!orgId || !locationId || !canEdit) return;

    setSaving(true);
    setLoadingError(null);

    try {
      const { data: existingOverrideRows, error: existingOverrideError } = await supabase
        .from("haccp_procedure_overrides")
        .select(
          "procedure_key,title,summary,scope,hazards,control_measures,critical_limits,monitoring,corrective_actions,verification,is_ccp"
        )
        .eq("org_id", orgId)
        .eq("location_id", locationId);

      if (existingOverrideError) throw existingOverrideError;

      const baseline = mergeProcedureOverrides(
        cloneDefaultHaccpProcedures(),
        (existingOverrideRows ?? []) as HaccpProcedureOverrideRow[]
      );

      const { error: docError } = await supabase.from("haccp_documents").upsert(
        {
          org_id: orgId,
          location_id: locationId,
          title: meta.title,
          version: meta.version,
          reviewed_by: meta.reviewedBy,
          last_reviewed_at: meta.lastReviewedAt,
          next_review_due: meta.nextReviewDue,
          review_interval_months: meta.reviewIntervalMonths,
          site_address: meta.siteAddress || null,
          notes: meta.notes || null,
          status: meta.status,
          published_at: meta.publishedAt,
          published_by: meta.publishedBy,
        },
        { onConflict: "org_id,location_id" }
      );

      if (docError) throw docError;

      const baselineById = new Map(baseline.map((item) => [item.id, item]));

      const changedProcedures = procedures
        .map((after) => {
          const before = baselineById.get(after.id);
          if (!before) return null;

          const summary = summariseProcedureChanges(before, after);
          if (!summary) return null;

          return {
            after,
            summary,
          };
        })
        .filter(
          (item): item is { after: HaccpProcedure; summary: string } => item !== null
        );

      const overridePayload = changedProcedures.map(({ after }) => ({
        org_id: orgId,
        location_id: locationId,
        ...getProcedureOverridePayload(after),
      }));

      if (overridePayload.length > 0) {
        const { error: overrideError } = await supabase
          .from("haccp_procedure_overrides")
          .upsert(overridePayload, { onConflict: "org_id,location_id,procedure_key" });

        if (overrideError) throw overrideError;
      }

      const changedBy =
        operator?.name?.trim() ||
        operator?.initials?.trim() ||
        user?.email?.trim() ||
        "Manager";

      const changeLogPayload = changedProcedures.map(({ after, summary }) => ({
        org_id: orgId,
        location_id: locationId,
        procedure_key: after.id,
        changed_by: changedBy,
        version: meta.version,
        change_summary: summary,
      }));

      if (changeLogPayload.length > 0) {
        const { data: insertedChanges, error: changeLogError } = await supabase
          .from("haccp_procedure_change_log")
          .insert(changeLogPayload)
          .select("id,procedure_key,changed_by,changed_at,version,change_summary");

        if (changeLogError) throw changeLogError;

        setChangeHistory((current) => [
          ...((insertedChanges ?? []) as HaccpChangeLogRow[]),
          ...current,
        ]);
      }

      setSavedAt(new Date().toLocaleString("en-GB"));
      setEditMode(false);
    } catch (error: unknown) {
      console.error("HACCP save failed", {
        error,
        orgId,
        locationId,
        meta,
      });

      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "Failed to save HACCP procedures.")
          : "Failed to save HACCP procedures.";

      setLoadingError(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!orgId || !locationId || !canEdit) return;

    setSaving(true);
    setLoadingError(null);

    try {
      const publisher =
        operator?.name?.trim() ||
        operator?.initials?.trim() ||
        user?.email?.trim() ||
        "Manager";

      const publishedAt = new Date().toISOString();

      const nextMeta: PageMeta = {
        ...meta,
        status: "published",
        publishedAt,
        publishedBy: publisher,
      };

      const { error: docError } = await supabase.from("haccp_documents").upsert(
        {
          org_id: orgId,
          location_id: locationId,
          title: nextMeta.title,
          version: nextMeta.version,
          reviewed_by: nextMeta.reviewedBy,
          last_reviewed_at: nextMeta.lastReviewedAt,
          next_review_due: nextMeta.nextReviewDue,
          review_interval_months: nextMeta.reviewIntervalMonths,
          site_address: nextMeta.siteAddress || null,
          notes: nextMeta.notes || null,
          status: nextMeta.status,
          published_at: nextMeta.publishedAt,
          published_by: nextMeta.publishedBy,
        },
        { onConflict: "org_id,location_id" }
      );

      if (docError) throw docError;

      setMeta(nextMeta);
      setSavedAt(new Date().toLocaleString("en-GB"));
      setEditMode(false);
    } catch (error: unknown) {
      console.error("HACCP publish failed", {
        error,
        orgId,
        locationId,
        meta,
      });

      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "Failed to publish HACCP procedures.")
          : "Failed to publish HACCP procedures.";

      setLoadingError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!orgId || !locationId || !canEdit) return;

    setSaving(true);
    setLoadingError(null);

    try {
      const reviewer =
        operator?.name?.trim() ||
        operator?.initials?.trim() ||
        user?.email?.trim() ||
        "Manager";

      const reviewedAt = new Date().toISOString();

      const nextMeta: PageMeta = {
        ...meta,
        reviewedBy: reviewer,
        lastReviewedAt: reviewedAt,
        nextReviewDue: addMonthsToIsoDate(reviewedAt, meta.reviewIntervalMonths || 12),
      };

      const { error: docError } = await supabase.from("haccp_documents").upsert(
        {
          org_id: orgId,
          location_id: locationId,
          title: nextMeta.title,
          version: nextMeta.version,
          reviewed_by: nextMeta.reviewedBy,
          last_reviewed_at: nextMeta.lastReviewedAt,
          next_review_due: nextMeta.nextReviewDue,
          review_interval_months: nextMeta.reviewIntervalMonths,
          site_address: nextMeta.siteAddress || null,
          notes: nextMeta.notes || null,
          status: nextMeta.status,
          published_at: nextMeta.publishedAt,
          published_by: nextMeta.publishedBy,
        },
        { onConflict: "org_id,location_id" }
      );

      if (docError) throw docError;

      const { data: insertedReview, error: reviewError } = await supabase
        .from("haccp_document_reviews")
        .insert({
          org_id: orgId,
          location_id: locationId,
          reviewed_by: reviewer,
          reviewed_at: reviewedAt,
          version: nextMeta.version,
          notes: reviewNote.trim() || null,
        })
        .select("id,reviewed_by,reviewed_at,version,notes")
        .single();

      if (reviewError) throw reviewError;

      setMeta(nextMeta);
      setReviewHistory((current) => [insertedReview as HaccpReviewRow, ...current]);
      setReviewNote("");
      setSavedAt(new Date().toLocaleString("en-GB"));
    } catch (error: unknown) {
      console.error("HACCP review failed", {
        error,
        orgId,
        locationId,
        meta,
      });

      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "Failed to record review.")
          : "Failed to record review.";

      setLoadingError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const reset = cloneDefaultHaccpProcedures();
    setProcedures(reset);
    setMeta(defaultMeta(locationName));
    setEditMode(false);
    setSavedAt(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-header {
            display: block !important;
          }
        }
      `}</style>

      <div className="print-header hidden mb-6 rounded-2xl border border-slate-300 bg-white p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Food safety management
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{meta.title}</h1>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
          <div><strong>Site:</strong> {locationName}</div>
          <div><strong>Address:</strong> {meta.siteAddress || "—"}</div>
          <div><strong>Version:</strong> {meta.version}</div>
          <div><strong>Status:</strong> {status.label}</div>
          <div><strong>Reviewed by:</strong> {meta.reviewedBy || "—"}</div>
          <div><strong>Last reviewed:</strong> {isoDateTimeToDisplay(meta.lastReviewedAt)}</div>
          <div><strong>Next review due:</strong> {isoDateToDisplay(meta.nextReviewDue)}</div>
          <div><strong>Published by:</strong> {meta.publishedBy || "—"}</div>
          <div><strong>Published at:</strong> {isoDateTimeToDisplay(meta.publishedAt)}</div>
          <div><strong>Generated:</strong> {new Date().toLocaleString("en-GB")}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Food safety management
            </div>

            {editMode && canEdit ? (
              <input
                value={meta.title}
                onChange={(e) => setMeta((current) => ({ ...current, title: e.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-3xl font-semibold tracking-tight text-slate-900 outline-none focus:border-slate-900"
              />
            ) : (
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {meta.title}
              </h1>
            )}

            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              This page sets out the site’s HACCP-based food safety procedures,
              including hazards, control measures, CCPs where applicable,
              critical limits, monitoring, corrective action, and verification.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  status.tone
                )}
              >
                {status.label}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                {canEdit ? "Manager edit access" : "View only"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Site
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">{locationName}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Address
                </div>
                {editMode && canEdit ? (
                  <textarea
                    value={meta.siteAddress}
                    onChange={(e) =>
                      setMeta((current) => ({
                        ...current,
                        siteAddress: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                ) : (
                  <div className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">
                    {meta.siteAddress || "—"}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Version
                </div>
                {editMode && canEdit ? (
                  <input
                    value={meta.version}
                    onChange={(e) => setMeta((current) => ({ ...current, version: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                ) : (
                  <div className="mt-1 text-sm font-medium text-slate-900">{meta.version}</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Last reviewed
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {isoDateTimeToDisplay(meta.lastReviewedAt)}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Reviewed by
                </div>
                {editMode && canEdit ? (
                  <input
                    value={meta.reviewedBy ?? ""}
                    onChange={(e) =>
                      setMeta((current) => ({
                        ...current,
                        reviewedBy: e.target.value || null,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                ) : (
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {meta.reviewedBy || "—"}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Next review due
                </div>
                {editMode && canEdit ? (
                  <input
                    type="date"
                    value={meta.nextReviewDue ?? ""}
                    onChange={(e) =>
                      setMeta((current) => ({
                        ...current,
                        nextReviewDue: e.target.value || null,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                ) : (
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {isoDateToDisplay(meta.nextReviewDue)}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Review frequency
                </div>
                {editMode && canEdit ? (
                  <input
                    type="number"
                    min={1}
                    value={meta.reviewIntervalMonths}
                    onChange={(e) =>
                      setMeta((current) => ({
                        ...current,
                        reviewIntervalMonths: Math.max(1, Number(e.target.value || 12)),
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                ) : (
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    Every {meta.reviewIntervalMonths} month{meta.reviewIntervalMonths === 1 ? "" : "s"}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Published by
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {meta.publishedBy || "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Published at
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {isoDateTimeToDisplay(meta.publishedAt)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Editing rights
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {canEdit ? "Manager edit access" : "View only"}
                </div>
              </div>
            </div>
          </div>

          <div className="no-print flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditMode((prev) => !prev)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {editMode ? "Cancel editing" : "Edit procedures"}
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={cx(
                    "rounded-2xl border px-4 py-2 text-sm font-medium text-white transition",
                    saving
                      ? "cursor-not-allowed border-emerald-200 bg-emerald-300"
                      : "border-emerald-200 bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {saving ? "Saving..." : "Save draft"}
                </button>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving}
                  className={cx(
                    "rounded-2xl border px-4 py-2 text-sm font-medium text-white transition",
                    saving
                      ? "cursor-not-allowed border-slate-200 bg-slate-300"
                      : "border-slate-200 bg-slate-900 hover:bg-slate-800"
                  )}
                >
                  {saving ? "Publishing..." : "Publish procedures"}
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Reset to defaults
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                HACCP summary
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Quick cover sheet for manager review and inspection use.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Procedures
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {procedures.length}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                CCPs
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {ccpCount}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Evidence links
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {totalEvidenceLinks}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Latest review
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {meta.lastReviewedAt ? isoDateTimeToDisplay(meta.lastReviewedAt) : "Not reviewed"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Review countdown
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {reviewSummaryLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Document status
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {meta.status === "published" ? "Published" : "Draft"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Published by
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {meta.publishedBy || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Published at
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {isoDateTimeToDisplay(meta.publishedAt)}
              </div>
            </div>
          </div>
        </div>

        {editMode && canEdit ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Document notes
            </div>
            <textarea
              value={meta.notes}
              onChange={(e) => setMeta((current) => ({ ...current, notes: e.target.value }))}
              rows={4}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </div>
        ) : meta.notes ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Document notes
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {meta.notes}
            </p>
          </div>
        ) : null}

        {canEdit ? (
          <div className="no-print mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Review sign-off
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Record a formal review entry for this HACCP document. This writes a dated review log,
                  not just the latest reviewed-by field.
                </p>
              </div>

              <button
                type="button"
                onClick={handleMarkReviewed}
                disabled={saving}
                className={cx(
                  "rounded-2xl border px-4 py-2 text-sm font-medium text-white transition",
                  saving
                    ? "cursor-not-allowed border-slate-200 bg-slate-300"
                    : "border-slate-200 bg-slate-900 hover:bg-slate-800"
                )}
              >
                {saving ? "Saving..." : "Mark as reviewed"}
              </button>
            </div>

            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Review note
              </div>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder="Optional note about what was reviewed, updated, or checked."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>
        ) : null}

        {savedAt ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Saved successfully at {savedAt}.
          </div>
        ) : null}

        {loadingError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadingError}
          </div>
        ) : null}
      </div>

      <div className="no-print mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Review history
        </div>

        {reviewHistory.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No review history recorded yet.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reviewed at
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reviewed by
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Version
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewHistory.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {isoDateTimeToDisplay(row.reviewed_at)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
                      {row.reviewed_by}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {row.version || "—"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {row.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="no-print mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Procedure change history
        </div>

        {changeHistory.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No procedure changes recorded yet.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Changed at
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Procedure
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Changed by
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Version
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody>
                {changeHistory.map((row) => {
                  const procedure = procedures.find((item) => item.id === row.procedure_key);
                  return (
                    <tr key={row.id} className="bg-white">
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {isoDateTimeToDisplay(row.changed_at)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
                        {procedure?.title || row.procedure_key}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {row.changed_by}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {row.version || "—"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {row.change_summary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="no-print mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Search procedures
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hazards, control measures, corrective action..."
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div className="min-w-[220px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Category
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  category === "all"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                )}
              >
                All
              </button>

              {CATEGORY_ORDER.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    category === item
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  {HACCP_CATEGORY_LABELS[item]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Procedure index
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {filteredProcedures.map((procedure, index) => (
              <a
                key={procedure.id}
                href={`#${procedure.id}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                {index + 1}. {procedure.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {!ready ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading HACCP procedures…
          </div>
        ) : filteredProcedures.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            No procedures match that filter. A fine achievement, but not useful.
          </div>
        ) : (
          filteredProcedures.map((procedure, index) => (
            <div key={procedure.id} className="print-break-avoid">
              <ProcedureCard
                procedure={procedure}
                editMode={editMode && canEdit}
                onChange={(next) => updateProcedure(procedure.id, next)}
                number={index + 1}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}