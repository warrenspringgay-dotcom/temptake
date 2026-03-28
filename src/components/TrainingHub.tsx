"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import ActionMenu from "@/components/ActionMenu";
import {
  addLicenceStockServer,
  archiveTrainingServer,
  createTrainingServer,
  listLicencePoolsServer,
  unarchiveTrainingServer,
  updateTrainingLmsSyncServer,
  uploadTrainingCertificateServer,
  type LicencePoolSummary,
  type TrainingLmsSyncStatus,
  type TrainingStatus,
} from "@/app/actions/training";

type HighfieldCourseKey =
  | "food_safety_level_2"
  | "food_safety_level_1"
  | "introduction_to_allergens";

const HIGHFIELD_COURSES: { key: HighfieldCourseKey; label: string }[] = [
  { key: "food_safety_level_2", label: "Food Safety Level 2" },
  { key: "food_safety_level_1", label: "Food Safety Level 1" },
  { key: "introduction_to_allergens", label: "Introduction to Allergens" },
];

type TeamMemberLite = {
  id: string;
  name: string;
  initials: string | null;
  email: string | null;
  location_id: string | null;
  active: boolean | null;
};

type TrainingRow = {
  id: string;
  team_member_id: string | null;
  type: string | null;
  course_key: string | null;
  provider_name: "Highfield" | "Other" | null;
  status: TrainingStatus | null;
  assigned_on: string | null;
  completed_on: string | null;
  awarded_on: string | null;
  expires_on: string | null;
  certificate_expiry_date: string | null;
  certificate_url: string | null;
  notes: string | null;
  learner_email: string | null;
  archived_at?: string | null;
  lms_sync_status?: TrainingLmsSyncStatus | null;
  lms_sync_error?: string | null;
  lms_last_synced_at?: string | null;
  external_learner_id?: string | null;
  external_enrolment_id?: string | null;
  team_member?: TeamMemberLite | null;
};

type BulkAssignForm = {
  courseKey: HighfieldCourseKey;
  status: "assigned" | "invited";
  assignedOn: string;
  notes: string;
  skipExisting: boolean;
};

type EditTrainingForm = {
  id: string;
  status: TrainingStatus;
  assigned_on: string;
  completed_on: string;
  expires_on: string;
  certificate_url: string;
  notes: string;
  lms_sync_status: TrainingLmsSyncStatus | "";
  lms_sync_error: string;
  external_learner_id: string;
  external_enrolment_id: string;
};

type AddStockForm = {
  courseKey: HighfieldCourseKey;
  quantity: string;
};

type ParsedCsvRow = Record<string, string>;

type ImportPreviewItem = {
  csvIndex: number;
  csvRow: ParsedCsvRow;
  email: string;
  course: string;
  statusRaw: string;
  completedDateRaw: string;
  expiryDateRaw: string;
  certificateUrlRaw: string;
  learnerIdRaw: string;
  enrolmentIdRaw: string;
  trainingRow: TrainingRow | null;
  reason: string | null;
  mappedTrainingStatus: TrainingStatus | null;
  mappedLmsStatus: TrainingLmsSyncStatus | null;
};

type WorkflowStatus =
  | "archived"
  | "failed"
  | "needs_certificate"
  | "completed"
  | "in_progress"
  | "queued"
  | "ready_to_export"
  | "assigned"
  | "unknown";

const SUPERADMIN_USER_ID = "16baae4d-e077-4c89-b402-2b5d725539e8";

function todayISODate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function nowFileStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;

  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  const hours = String(dt.getHours()).padStart(2, "0");
  const mins = String(dt.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function addYearsISO(isoDate: string, years: number) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";

  const dt = new Date(Date.UTC(y, m - 1, d));
  const targetYear = dt.getUTCFullYear() + years;
  const targetMonth = dt.getUTCMonth();
  const targetDay = dt.getUTCDate();

  const candidate = new Date(Date.UTC(targetYear, targetMonth, targetDay));

  if (candidate.getUTCMonth() !== targetMonth) {
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0));
    return lastDay.toISOString().slice(0, 10);
  }

  return candidate.toISOString().slice(0, 10);
}

function safeISODate(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function statusLabel(status: TrainingStatus | null | undefined) {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "invited":
      return "Invited";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "—";
  }
}

function statusPillClass(status: TrainingStatus | null | undefined) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "expired":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "assigned":
    case "invited":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function lmsStatusLabel(status: TrainingLmsSyncStatus | null | undefined) {
  switch (status) {
    case "not_sent":
      return "Not sent";
    case "queued":
      return "Queued";
    case "enrolled":
      return "Enrolled";
    case "completed":
      return "Completed in LMS";
    case "failed":
      return "Sync failed";
    default:
      return "—";
  }
}

function lmsStatusPillClass(status: TrainingLmsSyncStatus | null | undefined) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "enrolled":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "queued":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "not_sent":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function safeInitials(name: string, initials?: string | null) {
  const fromField = (initials ?? "").trim().toUpperCase();
  if (fromField) return fromField;

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function csvEscape(value: string | null | undefined) {
  const text = (value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadHighfieldImportTemplate() {
  const headers = [
    "Email",
    "Course",
    "Status",
    "Completed Date",
    "Expiry Date",
    "Certificate URL",
    "Learner ID",
    "Enrolment ID",
  ];

  const example = [
    "staff@example.com",
    "Food Safety Level 2",
    "Completed",
    "21/03/2026",
    "21/03/2028",
    "",
    "HF12345",
    "ENR98765",
  ];

  const content = [
    headers.map((v) => csvEscape(v)).join(","),
    example.map((v) => csvEscape(v)).join(","),
  ].join("\n");

  downloadTextFile(
    `highfield-import-template-${nowFileStamp()}.csv`,
    content,
    "text/csv;charset=utf-8;"
  );
}

function defaultBulkAssignForm(): BulkAssignForm {
  return {
    courseKey: "food_safety_level_2",
    status: "assigned",
    assignedOn: todayISODate(),
    notes: "",
    skipExisting: true,
  };
}

function defaultAddStockForm(): AddStockForm {
  return {
    courseKey: "food_safety_level_2",
    quantity: "1",
  };
}

function getCourseLabel(courseKey: string | null, type: string | null) {
  if (type?.trim()) return type;
  return HIGHFIELD_COURSES.find((c) => c.key === courseKey)?.label ?? "—";
}

function isActiveRecord(row: TrainingRow) {
  if (row.archived_at) return false;

  const status = row.status;
  const expiry = row.certificate_expiry_date || row.expires_on;
  const today = todayISODate();

  if (status === "assigned" || status === "invited" || status === "in_progress") {
    return true;
  }

  if (status === "completed") {
    if (!expiry) return true;
    return expiry >= today;
  }

  return false;
}

function getWorkflowStatus(row: TrainingRow): WorkflowStatus {
  if (row.archived_at) return "archived";
  if (row.lms_sync_status === "failed") return "failed";
  if (row.status === "completed" && !row.certificate_url) return "needs_certificate";
  if (row.status === "completed") return "completed";
  if (row.lms_sync_status === "enrolled") return "in_progress";
  if (row.lms_sync_status === "queued") return "queued";
  if (row.status === "invited") return "ready_to_export";
  if (row.status === "assigned") return "assigned";
  return "unknown";
}

function workflowLabel(status: WorkflowStatus | "all") {
  switch (status) {
    case "ready_to_export":
      return "Ready to export";
    case "queued":
      return "Queued";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "needs_certificate":
      return "Needs certificate";
    case "failed":
      return "Failed";
    case "assigned":
      return "Assigned";
    case "archived":
      return "Archived";
    case "unknown":
      return "Unknown";
    case "all":
    default:
      return "All";
  }
}

function workflowPillClass(status: WorkflowStatus) {
  switch (status) {
    case "ready_to_export":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "queued":
      return "bg-blue-50 text-blue-800 border border-blue-200";
    case "in_progress":
      return "bg-sky-50 text-sky-800 border border-sky-200";
    case "completed":
      return "bg-emerald-50 text-emerald-800 border border-emerald-200";
    case "needs_certificate":
      return "bg-purple-50 text-purple-800 border border-purple-200";
    case "failed":
      return "bg-rose-50 text-rose-800 border border-rose-200";
    case "assigned":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "archived":
      return "bg-slate-100 text-slate-700 border border-slate-300";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

function getPoolForCourse(
  pools: LicencePoolSummary[],
  courseKey: HighfieldCourseKey
): LicencePoolSummary | null {
  return pools.find((p) => p.course_key === courseKey) ?? null;
}

function stockTone(available: number) {
  if (available <= 0) return "border-rose-200 bg-rose-50 text-rose-800";
  if (available <= 3) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function normalizeCsvHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out.map((v) => v.trim());
}

function parseCsv(text: string): ParsedCsvRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeCsvHeader);

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: ParsedCsvRow = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] ?? "";
    });
    return row;
  });
}

function firstCsvValue(row: ParsedCsvRow, keys: string[]) {
  for (const key of keys) {
    const norm = normalizeCsvHeader(key);
    const value = row[norm] ?? row[key] ?? "";
    if (value.trim()) return value.trim();
  }
  return "";
}

function mapHighfieldImportStatus(raw: string): {
  trainingStatus: TrainingStatus | null;
  lmsStatus: TrainingLmsSyncStatus | null;
} {
  const value = raw.trim().toLowerCase();

  if (!value) {
    return { trainingStatus: null, lmsStatus: null };
  }

  if (value.includes("complete") || value.includes("passed") || value.includes("success")) {
    return { trainingStatus: "completed", lmsStatus: "completed" };
  }

  if (
    value.includes("enrolled") ||
    value.includes("started") ||
    value.includes("progress") ||
    value.includes("in progress")
  ) {
    return { trainingStatus: "in_progress", lmsStatus: "enrolled" };
  }

  if (
    value.includes("invite") ||
    value.includes("assigned") ||
    value.includes("pending") ||
    value.includes("queued")
  ) {
    return { trainingStatus: "invited", lmsStatus: "queued" };
  }

  if (value.includes("fail") || value.includes("cancel")) {
    return { trainingStatus: "cancelled", lmsStatus: "failed" };
  }

  if (value.includes("expired")) {
    return { trainingStatus: "expired", lmsStatus: "failed" };
  }

  return { trainingStatus: null, lmsStatus: null };
}

function isReadyForHighfieldExport(row: TrainingRow) {
  if (row.archived_at) return false;
  if (row.provider_name !== "Highfield") return false;

  const email = (row.learner_email ?? row.team_member?.email ?? "").trim();
  if (!email) return false;

  if (row.lms_sync_status === "enrolled" || row.lms_sync_status === "completed") {
    return false;
  }

  if (row.status === "completed" || row.status === "expired" || row.status === "cancelled") {
    return false;
  }

  return row.status === "assigned" || row.status === "invited" || row.status === "in_progress";
}

function NavTabs({ pathname }: { pathname: string }) {
  const tabs = [
    { href: "/team", label: "Team" },
    { href: "/training", label: "Training hub" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "rounded-xl border px-3 py-1.5 text-sm font-medium transition",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function TrainingHub() {
  const pathname = usePathname();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  const [members, setMembers] = useState<TeamMemberLite[]>([]);
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [pools, setPools] = useState<LicencePoolSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TrainingStatus>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStatus | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkAssignForm>(defaultBulkAssignForm());

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<TrainingRow | null>(null);
  const [editForm, setEditForm] = useState<EditTrainingForm | null>(null);
  const [editCertificateFile, setEditCertificateFile] = useState<File | null>(null);

  const [stockOpen, setStockOpen] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState<AddStockForm>(defaultAddStockForm());

  const [exportingPending, setExportingPending] = useState(false);
  const [queueingRowId, setQueueingRowId] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importingResults, setImportingResults] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const [oid, lid, userRes] = await Promise.all([
        getActiveOrgIdClient(),
        getActiveLocationIdClient(),
        supabase.auth.getUser(),
      ]);

      const user = userRes.data.user ?? null;
      const userEmail = user?.email?.toLowerCase() ?? null;
      const userId = user?.id ?? null;

      setOrgId(oid ?? null);
      setLocationId(lid ?? null);
      setIsSuperAdmin(userId === SUPERADMIN_USER_ID);
      setAuthResolved(true);

      if (userId !== SUPERADMIN_USER_ID) {
        setRows([]);
        setMembers([]);
        setPools([]);
        setIsManager(false);
        return;
      }

      if (!oid) {
        setRows([]);
        setMembers([]);
        setPools([]);
        setIsManager(false);
        return;
      }

      let qMembers = supabase
        .from("team_members")
        .select("id,name,initials,email,location_id,active,role")
        .eq("org_id", oid)
        .order("name", { ascending: true });

      if (lid) qMembers = qMembers.eq("location_id", lid);

      const { data: memberData, error: memberErr } = await qMembers;
      if (memberErr) throw memberErr;

      const managerFlag = (memberData ?? []).some((m: any) => {
        const email = (m.email ?? "").toLowerCase();
        const role = (m.role ?? "").toLowerCase();
        return email === userEmail && ["owner", "admin", "manager"].includes(role);
      });

      setIsManager(managerFlag);

      const cleanMembers: TeamMemberLite[] = (memberData ?? []).map((m: any) => ({
        id: String(m.id),
        name: m.name ?? "",
        initials: m.initials ?? null,
        email: m.email ?? null,
        location_id: m.location_id ? String(m.location_id) : null,
        active: m.active ?? true,
      }));

      setMembers(cleanMembers);

      let qTrainings = supabase
        .from("trainings")
        .select(
          "id,team_member_id,type,course_key,provider_name,status,assigned_on,completed_on,awarded_on,expires_on,certificate_expiry_date,certificate_url,notes,learner_email,archived_at,lms_sync_status,lms_sync_error,lms_last_synced_at,external_learner_id,external_enrolment_id"
        )
        .eq("org_id", oid)
        .order("created_at", { ascending: false });

      if (!showArchived) {
        qTrainings = qTrainings.is("archived_at", null);
      }

      if (cleanMembers.length) {
        qTrainings = qTrainings.in(
          "team_member_id",
          cleanMembers.map((m) => m.id)
        );
      }

      const [{ data: trainingData, error: trainingErr }, licencePools] = await Promise.all([
        qTrainings,
        listLicencePoolsServer(),
      ]);

      if (trainingErr) throw trainingErr;

      const memberMap = new Map(cleanMembers.map((m) => [m.id, m]));

      const cleanRows: TrainingRow[] = (trainingData ?? []).map((r: any) => ({
        id: String(r.id),
        team_member_id: r.team_member_id ? String(r.team_member_id) : null,
        type: r.type ?? null,
        course_key: r.course_key ?? null,
        provider_name: r.provider_name ?? null,
        status: r.status ?? null,
        assigned_on: r.assigned_on ?? null,
        completed_on: r.completed_on ?? null,
        awarded_on: r.awarded_on ?? null,
        expires_on: r.expires_on ?? null,
        certificate_expiry_date: r.certificate_expiry_date ?? null,
        certificate_url: r.certificate_url ?? null,
        notes: r.notes ?? null,
        learner_email: r.learner_email ?? null,
        archived_at: r.archived_at ?? null,
        lms_sync_status: r.lms_sync_status ?? null,
        lms_sync_error: r.lms_sync_error ?? null,
        lms_last_synced_at: r.lms_last_synced_at ?? null,
        external_learner_id: r.external_learner_id ?? null,
        external_enrolment_id: r.external_enrolment_id ?? null,
        team_member: r.team_member_id ? memberMap.get(String(r.team_member_id)) ?? null : null,
      }));

      setRows(cleanRows);
      setPools(licencePools);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load training hub.");
      setRows([]);
      setMembers([]);
      setPools([]);
      setIsManager(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [showArchived]);

  const activeRowsForCounts = useMemo(() => {
    return rows.filter((row) => !row.archived_at);
  }, [rows]);

  const summary = useMemo(() => {
    const today = todayISODate();

    let assigned = 0;
    let inProgress = 0;
    let completed = 0;
    let expiring = 0;
    let expired = 0;

    for (const row of activeRowsForCounts) {
      if (row.status === "assigned" || row.status === "invited") assigned += 1;
      if (row.status === "in_progress") inProgress += 1;
      if (row.status === "completed") completed += 1;
      if (row.status === "expired") expired += 1;

      const expiry = row.certificate_expiry_date || row.expires_on;
      if (expiry && expiry >= today) {
        const in30 = new Date(`${today}T00:00:00`);
        in30.setDate(in30.getDate() + 30);
        const in30ISO = in30.toISOString().slice(0, 10);
        if (expiry <= in30ISO) expiring += 1;
      }

      if (expiry && expiry < today && row.status !== "expired") expired += 1;
    }

    return { assigned, inProgress, completed, expiring, expired };
  }, [activeRowsForCounts]);

  const workflowCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ready_to_export: 0,
      queued: 0,
      needs_certificate: 0,
      failed: 0,
      in_progress: 0,
      completed: 0,
      assigned: 0,
      archived: 0,
      unknown: 0,
    };

    rows.forEach((row) => {
      const workflow = getWorkflowStatus(row);
      counts[workflow] = (counts[workflow] || 0) + 1;
    });

    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (courseFilter !== "all" && (row.course_key ?? "manual") !== courseFilter) return false;
      if (workflowFilter !== "all" && getWorkflowStatus(row) !== workflowFilter) return false;

      if (!needle) return true;

      const name = row.team_member?.name?.toLowerCase() ?? "";
      const email = row.team_member?.email?.toLowerCase() ?? "";
      const course = getCourseLabel(row.course_key, row.type).toLowerCase();

      return [name, email, course].some((v) => v.includes(needle));
    });
  }, [rows, search, statusFilter, courseFilter, workflowFilter]);

  const activeMembers = useMemo(() => {
    return members.filter((m) => m.active !== false);
  }, [members]);

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return activeMembers;

    return activeMembers.filter((member) => {
      const name = member.name.toLowerCase();
      const email = (member.email ?? "").toLowerCase();
      return name.includes(needle) || email.includes(needle);
    });
  }, [activeMembers, search]);

  const selectedMembers = useMemo(() => {
    return activeMembers.filter((m) => selectedIds.includes(m.id));
  }, [activeMembers, selectedIds]);

  const bulkPool = useMemo(() => {
    return getPoolForCourse(pools, bulkForm.courseKey);
  }, [pools, bulkForm.courseKey]);

  const bulkAvailableStock = bulkPool?.licences_available ?? 0;

  const bulkMembersNeedingStock = useMemo(() => {
    return selectedMembers.filter((member) => {
      if (!bulkForm.skipExisting) return true;

      const hasExisting = rows.some(
        (row) =>
          !row.archived_at &&
          row.team_member_id === member.id &&
          row.course_key === bulkForm.courseKey &&
          row.provider_name === "Highfield" &&
          isActiveRecord(row)
      );

      return !hasExisting;
    });
  }, [selectedMembers, bulkForm.skipExisting, bulkForm.courseKey, rows]);

  const bulkRequiredStock = bulkMembersNeedingStock.length;
  const bulkProjectedRemaining = bulkAvailableStock - bulkRequiredStock;
  const bulkHasEnoughStock = bulkRequiredStock <= bulkAvailableStock;

  const exportableHighfieldRows = useMemo(() => {
    return rows.filter(isReadyForHighfieldExport);
  }, [rows]);

  const exportableHighfieldCount = exportableHighfieldRows.length;

  const importMatched = useMemo(
    () => importPreview.filter((item) => !!item.trainingRow && !item.reason),
    [importPreview]
  );
  const importUnmatched = useMemo(
    () => importPreview.filter((item) => !item.trainingRow || !!item.reason),
    [importPreview]
  );

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearSelected() {
    setSelectedIds([]);
  }

  function openBulkAssign() {
    if (!selectedIds.length) {
      alert("Select at least one team member.");
      return;
    }
    setBulkForm(defaultBulkAssignForm());
    setBulkOpen(true);
  }

  function openAddStock(courseKey?: HighfieldCourseKey) {
    setStockForm({
      courseKey: courseKey ?? "food_safety_level_2",
      quantity: "1",
    });
    setStockOpen(true);
  }

  function openComplete(row: TrainingRow) {
    const today = todayISODate();
    const completedOn = row.completed_on || row.awarded_on || today;
    const expiresOn =
      row.expires_on || row.certificate_expiry_date || addYearsISO(completedOn, 2);

    setEditingRow(row);
    setEditForm({
      id: row.id,
      status: "completed",
      assigned_on: row.assigned_on ?? today,
      completed_on: completedOn,
      expires_on: expiresOn,
      certificate_url: row.certificate_url || "",
      notes: row.notes || "",
      lms_sync_status: row.lms_sync_status ?? "",
      lms_sync_error: row.lms_sync_error ?? "",
      external_learner_id: row.external_learner_id ?? "",
      external_enrolment_id: row.external_enrolment_id ?? "",
    });
    setEditCertificateFile(null);
    setEditOpen(true);
  }

  async function saveAddStock() {
    const qty = Number(stockForm.quantity);

    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      alert("Enter a whole number greater than 0.");
      return;
    }

    setStockSaving(true);

    try {
      await addLicenceStockServer({
        course_key: stockForm.courseKey,
        quantity: qty,
      });

      await load();
      setStockOpen(false);
      setStockForm(defaultAddStockForm());
    } catch (e: any) {
      alert(e?.message ?? "Failed to add stock.");
    } finally {
      setStockSaving(false);
    }
  }

  async function saveBulkAssign() {
    if (!orgId) return alert("No organisation selected.");
    if (!selectedIds.length) return alert("Select at least one team member.");

    if (!bulkHasEnoughStock) {
      alert("Not enough licences available.");
      return;
    }

    setBulkSaving(true);

    try {
      const selectedCourse = HIGHFIELD_COURSES.find((c) => c.key === bulkForm.courseKey);
      if (!selectedCourse) throw new Error("Choose a course.");

      let created = 0;
      let skipped = 0;

      for (const member of selectedMembers) {
        if (bulkForm.skipExisting) {
          const hasExisting = rows.some(
            (row) =>
              !row.archived_at &&
              row.team_member_id === member.id &&
              row.course_key === bulkForm.courseKey &&
              row.provider_name === "Highfield" &&
              isActiveRecord(row)
          );

          if (hasExisting) {
            skipped += 1;
            continue;
          }
        }

        const nameParts = member.name.trim().split(/\s+/).filter(Boolean);
        const learner_first_name = nameParts[0] ?? null;
        const learner_last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        await createTrainingServer({
          teamMemberId: member.id,
          type: selectedCourse.label,
          course_key: selectedCourse.key,
          provider_name: "Highfield",
          status: bulkForm.status,
          assigned_on: bulkForm.assignedOn,
          learner_email: member.email ?? null,
          learner_first_name,
          learner_last_name,
          licence_state: "reserved",
          sync_source: "highfield",
          notes: bulkForm.notes.trim() || null,
        });

        created += 1;
      }

      await load();
      clearSelected();
      setBulkOpen(false);

      alert(
        skipped
          ? `Assigned to ${created} staff. Skipped ${skipped} already assigned.`
          : `Assigned to ${created} staff.`
      );
    } catch (e: any) {
      alert(e?.message ?? "Bulk assign failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function exportPendingToHighfield() {
    if (!exportableHighfieldRows.length) {
      alert("No Highfield learners are ready to export.");
      return;
    }

    setExportingPending(true);

    try {
      const csvLines = [
        ["First Name", "Last Name", "Email", "Course"]
          .map((v) => csvEscape(v))
          .join(","),
      ];

      for (const row of exportableHighfieldRows) {
        const memberName = row.team_member?.name ?? "";
        const { firstName, lastName } = splitName(memberName);
        const email = (row.learner_email ?? row.team_member?.email ?? "").trim();
        const course = getCourseLabel(row.course_key, row.type);

        csvLines.push(
          [firstName, lastName, email, course].map((v) => csvEscape(v)).join(",")
        );
      }

      const filename = `highfield-export-${nowFileStamp()}.csv`;
      downloadTextFile(filename, csvLines.join("\n"), "text/csv;charset=utf-8;");

      for (const row of exportableHighfieldRows) {
        await updateTrainingLmsSyncServer({
          trainingId: row.id,
          lms_sync_status: "queued",
          external_learner_id: row.external_learner_id ?? null,
          external_enrolment_id: row.external_enrolment_id ?? null,
          lms_sync_error: null,
        });
      }

      await load();
      alert(
        `Exported ${exportableHighfieldRows.length} learner${
          exportableHighfieldRows.length === 1 ? "" : "s"
        } to Highfield CSV.`
      );
    } catch (e: any) {
      alert(e?.message ?? "Failed to export pending learners.");
    } finally {
      setExportingPending(false);
    }
  }

  async function buildImportPreview() {
    if (!importFile) {
      alert("Choose a CSV file first.");
      return;
    }

    setPreviewLoading(true);

    try {
      const text = await importFile.text();
      const parsedRows = parseCsv(text);

      if (!parsedRows.length) {
        throw new Error("The CSV file looks empty.");
      }

      const preview: ImportPreviewItem[] = parsedRows.map((csvRow, index) => {
        const email = firstCsvValue(csvRow, ["email", "learner_email"]).toLowerCase();
        const course = firstCsvValue(csvRow, ["course", "course_title", "course_name"]);
        const statusRaw = firstCsvValue(csvRow, ["status", "learner_status", "enrolment_status"]);
        const completedDateRaw = firstCsvValue(csvRow, [
          "completed_date",
          "completion_date",
          "completed_on",
          "award_date",
        ]);
        const expiryDateRaw = firstCsvValue(csvRow, [
          "expiry_date",
          "expires_on",
          "certificate_expiry_date",
        ]);
        const certificateUrlRaw = firstCsvValue(csvRow, [
          "certificate_url",
          "certificate_link",
          "certificate",
        ]);
        const learnerIdRaw = firstCsvValue(csvRow, [
          "learner_id",
          "external_learner_id",
          "user_id",
        ]);
        const enrolmentIdRaw = firstCsvValue(csvRow, [
          "enrolment_id",
          "enrollment_id",
          "external_enrolment_id",
        ]);

        if (!email || !course) {
          return {
            csvIndex: index,
            csvRow,
            email,
            course,
            statusRaw,
            completedDateRaw,
            expiryDateRaw,
            certificateUrlRaw,
            learnerIdRaw,
            enrolmentIdRaw,
            trainingRow: null,
            reason: "Missing email or course",
            mappedTrainingStatus: null,
            mappedLmsStatus: null,
          };
        }

        const matches = rows.filter((row) => {
          if (row.archived_at) return false;
          if (row.provider_name !== "Highfield") return false;

          const rowEmail = (row.learner_email ?? row.team_member?.email ?? "")
            .trim()
            .toLowerCase();
          const rowCourse = getCourseLabel(row.course_key, row.type).trim().toLowerCase();

          return rowEmail === email && rowCourse === course.trim().toLowerCase();
        });

        if (matches.length === 0) {
          return {
            csvIndex: index,
            csvRow,
            email,
            course,
            statusRaw,
            completedDateRaw,
            expiryDateRaw,
            certificateUrlRaw,
            learnerIdRaw,
            enrolmentIdRaw,
            trainingRow: null,
            reason: "No matching TempTake record",
            mappedTrainingStatus: null,
            mappedLmsStatus: null,
          };
        }

        if (matches.length > 1) {
          return {
            csvIndex: index,
            csvRow,
            email,
            course,
            statusRaw,
            completedDateRaw,
            expiryDateRaw,
            certificateUrlRaw,
            learnerIdRaw,
            enrolmentIdRaw,
            trainingRow: null,
            reason: "Multiple matching TempTake records",
            mappedTrainingStatus: null,
            mappedLmsStatus: null,
          };
        }

        const mapped = mapHighfieldImportStatus(statusRaw);

        return {
          csvIndex: index,
          csvRow,
          email,
          course,
          statusRaw,
          completedDateRaw,
          expiryDateRaw,
          certificateUrlRaw,
          learnerIdRaw,
          enrolmentIdRaw,
          trainingRow: matches[0] ?? null,
          reason: null,
          mappedTrainingStatus: mapped.trainingStatus,
          mappedLmsStatus: mapped.lmsStatus,
        };
      });

      setImportPreview(preview);
    } catch (e: any) {
      alert(e?.message ?? "Failed to preview Highfield CSV.");
      setImportPreview([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  function downloadUnmatchedRowsCsv() {
    if (!importUnmatched.length) {
      alert("No unmatched rows to download.");
      return;
    }

    const headerSet = new Set<string>();
    importUnmatched.forEach((item) => {
      Object.keys(item.csvRow).forEach((key) => headerSet.add(key));
    });

    const headers = Array.from(headerSet);
    const allHeaders = [...headers, "temptake_reason"];

    const lines = [
      allHeaders.map((h) => csvEscape(h)).join(","),
      ...importUnmatched.map((item) => {
        const values = headers.map((header) => item.csvRow[header] ?? "");
        values.push(item.reason ?? "Unmatched");
        return values.map((v) => csvEscape(v)).join(",");
      }),
    ];

    downloadTextFile(
      `highfield-unmatched-${nowFileStamp()}.csv`,
      lines.join("\n"),
      "text/csv;charset=utf-8;"
    );
  }

  async function applyImportPreview() {
    if (!importMatched.length) {
      alert("No matched rows ready to import.");
      return;
    }

    setImportingResults(true);

    try {
      let updated = 0;

      for (const item of importMatched) {
        const trainingRow = item.trainingRow;
        if (!trainingRow) continue;

        const nextTrainingStatus =
          item.mappedTrainingStatus ?? trainingRow.status ?? "invited";
        const nextLmsStatus =
          item.mappedLmsStatus ?? trainingRow.lms_sync_status ?? "queued";

        const completedOn =
          nextTrainingStatus === "completed" || nextTrainingStatus === "expired"
            ? safeISODate(item.completedDateRaw) ||
              trainingRow.completed_on ||
              trainingRow.awarded_on ||
              todayISODate()
            : trainingRow.completed_on;

        const expiresOn =
          nextTrainingStatus === "completed" || nextTrainingStatus === "expired"
            ? safeISODate(item.expiryDateRaw) ||
              trainingRow.expires_on ||
              trainingRow.certificate_expiry_date ||
              addYearsISO(completedOn || todayISODate(), 2)
            : trainingRow.expires_on;

        await createTrainingServer({
          id: trainingRow.id,
          teamMemberId: trainingRow.team_member_id ?? "",
          type: trainingRow.type ?? getCourseLabel(trainingRow.course_key, trainingRow.type),
          course_key: trainingRow.course_key ?? null,
          provider_name: "Highfield",
          status: nextTrainingStatus,
          assigned_on: trainingRow.assigned_on || todayISODate(),
          completed_on:
            nextTrainingStatus === "completed" || nextTrainingStatus === "expired"
              ? completedOn
              : trainingRow.completed_on,
          awarded_on:
            nextTrainingStatus === "completed" || nextTrainingStatus === "expired"
              ? completedOn
              : trainingRow.awarded_on,
          expires_on:
            nextTrainingStatus === "completed" || nextTrainingStatus === "expired"
              ? expiresOn
              : trainingRow.expires_on,
          certificate_expiry_date:
            nextTrainingStatus === "completed" || nextTrainingStatus === "expired"
              ? expiresOn
              : trainingRow.certificate_expiry_date,
          certificate_url: item.certificateUrlRaw || trainingRow.certificate_url,
          learner_email: trainingRow.learner_email ?? trainingRow.team_member?.email ?? null,
          notes: trainingRow.notes,
          external_learner_id: item.learnerIdRaw || trainingRow.external_learner_id || null,
          external_enrolment_id:
            item.enrolmentIdRaw || trainingRow.external_enrolment_id || null,
        });

        await updateTrainingLmsSyncServer({
          trainingId: trainingRow.id,
          lms_sync_status: nextLmsStatus,
          external_learner_id: item.learnerIdRaw || trainingRow.external_learner_id || null,
          external_enrolment_id:
            item.enrolmentIdRaw || trainingRow.external_enrolment_id || null,
          lms_sync_error:
            nextLmsStatus === "failed"
              ? item.statusRaw || "Import marked failed"
              : null,
        });

        updated += 1;
      }

      await load();
      setImportOpen(false);
      setImportFile(null);
      setImportPreview([]);

      alert(`Import complete. Updated ${updated}. Unmatched rows were skipped.`);
    } catch (e: any) {
      alert(e?.message ?? "Failed to import Highfield results.");
    } finally {
      setImportingResults(false);
    }
  }

  async function queueSingleInvitedRow(row: TrainingRow) {
    setQueueingRowId(row.id);

    try {
      const memberName = row.team_member?.name ?? "";
      const { firstName, lastName } = splitName(memberName);
      const email = (row.learner_email ?? row.team_member?.email ?? "").trim();
      const course = getCourseLabel(row.course_key, row.type);

      const csvContent = [
        ["First Name", "Last Name", "Email", "Course"]
          .map((v) => csvEscape(v))
          .join(","),
        [firstName, lastName, email, course].map((v) => csvEscape(v)).join(","),
      ].join("\n");

      downloadTextFile(
        `highfield-export-${course.toLowerCase().replace(/\s+/g, "-")}-${nowFileStamp()}.csv`,
        csvContent,
        "text/csv;charset=utf-8;"
      );

      await updateTrainingLmsSyncServer({
        trainingId: row.id,
        lms_sync_status: "queued",
        external_learner_id: row.external_learner_id ?? null,
        external_enrolment_id: row.external_enrolment_id ?? null,
        lms_sync_error: null,
      });

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to queue learner export.");
    } finally {
      setQueueingRowId(null);
    }
  }

  async function quickUpdateStatus(row: TrainingRow, status: TrainingStatus) {
    try {
      await createTrainingServer({
        id: row.id,
        teamMemberId: row.team_member_id ?? "",
        type: row.type ?? getCourseLabel(row.course_key, row.type),
        course_key: row.course_key ?? null,
        provider_name: row.provider_name === "Other" ? "Other" : "Highfield",
        status,
        assigned_on:
          status === "in_progress" ? row.assigned_on || todayISODate() : row.assigned_on,
        completed_on: row.completed_on,
        awarded_on: row.awarded_on,
        expires_on: row.expires_on,
        certificate_expiry_date: row.certificate_expiry_date,
        certificate_url: row.certificate_url,
        learner_email: row.learner_email,
        notes: row.notes,
        external_learner_id: row.external_learner_id ?? null,
        external_enrolment_id: row.external_enrolment_id ?? null,
      });

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to update status.");
    }
  }

  async function quickCancel(row: TrainingRow) {
    try {
      await createTrainingServer({
        id: row.id,
        teamMemberId: row.team_member_id ?? "",
        type: row.type ?? getCourseLabel(row.course_key, row.type),
        course_key: row.course_key ?? null,
        provider_name: row.provider_name === "Other" ? "Other" : "Highfield",
        status: "cancelled",
        assigned_on: row.assigned_on,
        completed_on: null,
        awarded_on: null,
        expires_on: null,
        certificate_expiry_date: null,
        certificate_url: row.certificate_url,
        learner_email: row.learner_email,
        notes: row.notes,
        external_learner_id: row.external_learner_id ?? null,
        external_enrolment_id: row.external_enrolment_id ?? null,
      });

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to cancel training.");
    }
  }

  async function quickReopen(row: TrainingRow) {
    try {
      await createTrainingServer({
        id: row.id,
        teamMemberId: row.team_member_id ?? "",
        type: row.type ?? getCourseLabel(row.course_key, row.type),
        course_key: row.course_key ?? null,
        provider_name: row.provider_name === "Other" ? "Other" : "Highfield",
        status: "assigned",
        assigned_on: row.assigned_on ?? todayISODate(),
        learner_email: row.learner_email,
        notes: row.notes,
        external_learner_id: row.external_learner_id ?? null,
        external_enrolment_id: row.external_enrolment_id ?? null,
      });

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to reopen training.");
    }
  }

  async function archiveTraining(row: TrainingRow) {
    try {
      await archiveTrainingServer(row.id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to archive.");
    }
  }

  async function unarchiveTraining(row: TrainingRow) {
    try {
      await unarchiveTrainingServer(row.id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to unarchive.");
    }
  }

  async function setLmsSyncStatus(
    row: TrainingRow,
    status: TrainingLmsSyncStatus,
    lms_sync_error?: string
  ) {
    try {
      await updateTrainingLmsSyncServer({
        trainingId: row.id,
        lms_sync_status: status,
        external_learner_id: row.external_learner_id,
        external_enrolment_id: row.external_enrolment_id,
        lms_sync_error: lms_sync_error ?? row.lms_sync_error ?? null,
      });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to update LMS sync.");
    }
  }

  function openEdit(row: TrainingRow) {
    setEditingRow(row);
    setEditForm({
      id: row.id,
      status: row.status ?? "assigned",
      assigned_on: row.assigned_on ?? "",
      completed_on: row.completed_on || row.awarded_on || "",
      expires_on: row.expires_on || row.certificate_expiry_date || "",
      certificate_url: row.certificate_url || "",
      notes: row.notes || "",
      lms_sync_status: row.lms_sync_status ?? "",
      lms_sync_error: row.lms_sync_error ?? "",
      external_learner_id: row.external_learner_id ?? "",
      external_enrolment_id: row.external_enrolment_id ?? "",
    });
    setEditCertificateFile(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editingRow || !editForm) return;

    setEditSaving(true);

    try {
      let certificateUrl = editForm.certificate_url || null;

      if (editCertificateFile) {
        const uploaded = await uploadTrainingCertificateServer({
          file: editCertificateFile,
        });
        certificateUrl = uploaded.url || certificateUrl;
      }

      const assigned_on = editForm.assigned_on || editingRow.assigned_on || todayISODate();
      const completed_on =
        editForm.status === "completed" || editForm.status === "expired"
          ? editForm.completed_on || todayISODate()
          : null;

      const expires_on =
        editForm.status === "completed" || editForm.status === "expired"
          ? editForm.expires_on || addYearsISO(completed_on || todayISODate(), 2)
          : null;

      await createTrainingServer({
        id: editingRow.id,
        teamMemberId: editingRow.team_member_id ?? "",
        type: editingRow.type ?? getCourseLabel(editingRow.course_key, editingRow.type),
        course_key: editingRow.course_key ?? null,
        provider_name: editingRow.provider_name === "Other" ? "Other" : "Highfield",
        status: editForm.status,
        assigned_on,
        completed_on,
        awarded_on: completed_on,
        expires_on,
        certificate_expiry_date: expires_on,
        certificate_url: certificateUrl,
        learner_email: editingRow.learner_email,
        notes: editForm.notes || null,
        external_learner_id: editForm.external_learner_id || null,
        external_enrolment_id: editForm.external_enrolment_id || null,
      });

      if (isSuperAdmin && editingRow.provider_name === "Highfield" && editForm.lms_sync_status) {
        await updateTrainingLmsSyncServer({
          trainingId: editingRow.id,
          lms_sync_status: editForm.lms_sync_status,
          external_learner_id: editForm.external_learner_id || null,
          external_enrolment_id: editForm.external_enrolment_id || null,
          lms_sync_error: editForm.lms_sync_error || null,
        });
      }

      setEditOpen(false);
      setEditingRow(null);
      setEditForm(null);
      setEditCertificateFile(null);

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to save training.");
    } finally {
      setEditSaving(false);
    }
  }

  const workflowFilterOptions: Array<WorkflowStatus | "all"> = [
    "all",
    "ready_to_export",
    "queued",
    "in_progress",
    "completed",
    "needs_certificate",
    "failed",
    "assigned",
  ];

  if (!authResolved || loading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-0 sm:px-4">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
          <NavTabs pathname={pathname} />
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
            Loading…
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-0 sm:px-4">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
          <NavTabs pathname={pathname} />
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
            Not authorised.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-3 lg:px-4">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
        <NavTabs pathname={pathname} />

        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Training hub</h1>
            <div className="mt-1 text-xs text-slate-500">
              Assign courses, track progress, and see who needs attention.
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link
              href="/team"
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to team
            </Link>

            {isManager && (
              <button
                type="button"
                onClick={openBulkAssign}
                disabled={!selectedIds.length}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Assign course
              </button>
            )}
          </div>
        </div>

        {exportableHighfieldCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-amber-900">
                {exportableHighfieldCount} learner{exportableHighfieldCount === 1 ? "" : "s"} ready for Highfield enrolment
              </div>
              <div className="mt-1 text-xs text-amber-800">
                Export these learners to CSV, then upload into Highfield.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadHighfieldImportTemplate}
                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50"
              >
                Download template
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportOpen(true);
                  setImportPreview([]);
                  setImportFile(null);
                }}
                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50"
              >
                Import results
              </button>

              <button
                type="button"
                onClick={() => void exportPendingToHighfield()}
                disabled={exportingPending}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {exportingPending ? "Exporting…" : "Export to Highfield"}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Assigned</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.assigned}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">In progress</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.inProgress}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Completed</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.completed}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs text-amber-700">Expiring in 30 days</div>
            <div className="mt-1 text-2xl font-semibold text-amber-900">{summary.expiring}</div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-xs text-rose-700">Expired</div>
            <div className="mt-1 text-2xl font-semibold text-rose-900">{summary.expired}</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-xs text-amber-700">Ready to export</div>
            <div className="mt-1 text-2xl font-semibold text-amber-900">
              {workflowCounts.ready_to_export || 0}
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="text-xs text-blue-700">Queued</div>
            <div className="mt-1 text-2xl font-semibold text-blue-900">
              {workflowCounts.queued || 0}
            </div>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3">
            <div className="text-xs text-purple-700">Needs certificate</div>
            <div className="mt-1 text-2xl font-semibold text-purple-900">
              {workflowCounts.needs_certificate || 0}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <div className="text-xs text-rose-700">Failed</div>
            <div className="mt-1 text-2xl font-semibold text-rose-900">
              {workflowCounts.failed || 0}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 md:w-72"
            placeholder="Search staff or course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | TrainingStatus)}
          >
            <option value="all">All statuses</option>
            <option value="assigned">Assigned</option>
            <option value="invited">Invited</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All courses</option>
            {HIGHFIELD_COURSES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {workflowFilterOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setWorkflowFilter(option)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium ${
                workflowFilter === option
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {workflowLabel(option)}
            </button>
          ))}
        </div>

        {isManager && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">Select staff</div>
                <div className="mt-1 text-xs text-slate-500">
                  Pick the staff members you want to assign a course to.
                </div>
              </div>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelected}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Clear selection
                </button>
              )}
            </div>

            {filteredMembers.length ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredMembers.map((member) => {
                  const selected = selectedIds.includes(member.id);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleSelected(member.id)}
                      className={[
                        "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                        selected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {safeInitials(member.name, member.initials)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {member.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {member.email ?? "—"}
                        </div>
                      </div>

                      <div
                        className={[
                          "h-5 w-5 rounded border",
                          selected
                            ? "border-emerald-600 bg-emerald-600"
                            : "border-slate-300 bg-white",
                        ].join(" ")}
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No matching active staff found.</div>
            )}
          </div>
        )}

        {selectedIds.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-sm font-medium text-emerald-900">
              {selectedIds.length} selected for course assignment
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelected}
                className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={openBulkAssign}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Assign course
              </button>
            </div>
          </div>
        ) : null}

        {isSuperAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((p) => !p)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">Advanced admin tools</div>
                <div className="mt-1 text-xs text-slate-500">
                  Licence stock, archived records and LMS controls.
                </div>
              </div>
              <span className="text-sm font-medium text-slate-600">
                {advancedOpen ? "Hide" : "Show"}
              </span>
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-start gap-2">
                  <button
                    type="button"
                    onClick={() => openAddStock()}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Add stock
                  </button>

                  <button
                    type="button"
                    onClick={downloadHighfieldImportTemplate}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Download import template
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImportOpen(true);
                      setImportPreview([]);
                      setImportFile(null);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Import Highfield CSV
                  </button>

                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => void exportPendingToHighfield()}
                      disabled={exportingPending}
                      className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60"
                    >
                      {exportingPending
                        ? "Exporting…"
                        : `Export to Highfield${exportableHighfieldCount > 0 ? ` (${exportableHighfieldCount})` : ""}`}
                    </button>
                    <div className="mt-1 pl-1 text-[11px] text-slate-500">
                      {exportableHighfieldCount > 0
                        ? `${exportableHighfieldCount} row${exportableHighfieldCount === 1 ? "" : "s"} ready to export`
                        : "No rows currently ready to export"}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    Show archived records
                  </label>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {HIGHFIELD_COURSES.map((course) => {
                    const pool = getPoolForCourse(pools, course.key);
                    const purchased = pool?.licences_purchased ?? 0;
                    const reserved = pool?.licences_reserved ?? 0;
                    const consumed = pool?.licences_consumed ?? 0;
                    const available = pool?.licences_available ?? 0;

                    return (
                      <div
                        key={course.key}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {course.label}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Highfield licence stock
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openAddStock(course.key)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Add
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-slate-500">Purchased</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">
                              {purchased}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-slate-500">Reserved</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">
                              {reserved}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-slate-500">Consumed</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">
                              {consumed}
                            </div>
                          </div>
                          <div className={`rounded-xl border px-3 py-2 ${stockTone(available)}`}>
                            <div>Available</div>
                            <div className="mt-1 text-base font-semibold">{available}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

     <div className="mt-4 w-full">
  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
  <div className="overflow-x-auto rounded-3xl">
    <table className="w-full min-w-[1280px] table-fixed text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
              <tr>
  <th className="w-8 px-2 py-3">
    <span className="sr-only">Select</span>
  </th>
  <th className="w-[180px] px-3 py-3">Staff</th>
  <th className="w-[60px] px-3 py-3">Course</th>
  <th className="w-[70px] px-3 py-3">Provider</th>
  <th className="w-[70px] px-3 py-3">Status</th>
  <th className="w-[100px] px-3 py-3">Workflow</th>
  <th className="w-[80px] px-3 py-3">Assigned</th>
  <th className="w-[80px] px-3 py-3">Completed</th>
  <th className="w-[80px] px-2 py-3">Expires</th>
  <th className="w-[60px] px-2 py-3">Cert</th>
  <th className="sticky right-0 z-10 w-[72px] bg-slate-50 px-2 py-3 text-right">
    Actions
  </th>
</tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => {
                    const member = row.team_member;
                    const isArchived = !!row.archived_at;
                    const canQueueSingle =
                      isReadyForHighfieldExport(row) &&
                      !!(row.learner_email ?? row.team_member?.email ?? "").trim();
                    const workflow = getWorkflowStatus(row);

                    const menuItems: Array<{
                      label: string;
                      onClick?: () => void;
                      href?: string;
                      variant?: "danger";
                    }> = [];

                    if (isArchived) {
                      menuItems.push({
                        label: "Unarchive",
                        onClick: () => void unarchiveTraining(row),
                      });
                    } else {
                      if (row.status === "assigned" || row.status === "invited") {
                        menuItems.push({
                          label: "Start",
                          onClick: () => void quickUpdateStatus(row, "in_progress"),
                        });
                      }

                      if (
                        row.status === "assigned" ||
                        row.status === "invited" ||
                        row.status === "in_progress"
                      ) {
                        menuItems.push({
                          label: "Complete",
                          onClick: () => openComplete(row),
                        });
                      }

                      if (canQueueSingle) {
                        menuItems.push({
                          label: queueingRowId === row.id ? "Queueing…" : "Queue export",
                          onClick:
                            queueingRowId === row.id
                              ? undefined
                              : () => void queueSingleInvitedRow(row),
                        });
                      }

                      menuItems.push({
                        label: "Edit",
                        onClick: () => openEdit(row),
                      });

                      if (isSuperAdmin && advancedOpen) {
                        if (
                          row.status === "assigned" ||
                          row.status === "invited" ||
                          row.status === "in_progress"
                        ) {
                          menuItems.push({
                            label: "Cancel",
                            onClick: () => void quickCancel(row),
                            variant: "danger",
                          });
                        }

                        if (row.status === "cancelled") {
                          menuItems.push({
                            label: "Reopen",
                            onClick: () => void quickReopen(row),
                          });
                        }

                        if (
                          row.status === "completed" ||
                          row.status === "expired" ||
                          row.status === "cancelled"
                        ) {
                          menuItems.push({
                            label: "Archive",
                            onClick: () => void archiveTraining(row),
                          });
                        }

                        if (row.provider_name === "Highfield") {
                          menuItems.push(
                            {
                              label: "Set LMS queued",
                              onClick: () => void setLmsSyncStatus(row, "queued"),
                            },
                            {
                              label: "Set LMS enrolled",
                              onClick: () => void setLmsSyncStatus(row, "enrolled"),
                            },
                            {
                              label: "Set LMS failed",
                              onClick: () =>
                                void setLmsSyncStatus(row, "failed", "Manual sync failed"),
                              variant: "danger",
                            }
                          );
                        }
                      }
                    }

                    return (
                      <tr
                        key={row.id}
                        className={`border-t border-slate-200 align-top ${
                          isArchived ? "bg-slate-50/70" : ""
                        }`}
                      >
                        <td className="px-3 py-3">
                          {member && isManager && !isArchived ? (
                            <input
                              type="checkbox"
                              className="mt-1 accent-emerald-600"
                              checked={selectedIds.includes(member.id)}
                              onChange={() => toggleSelected(member.id)}
                            />
                          ) : null}
                        </td>

                        <td className="px-3 py-3">
                          {member ? (
                            <Link
                              href={`/team?staff=${member.id}`}
                              className="flex items-center gap-3 hover:text-emerald-700"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                {safeInitials(member.name, member.initials)}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{member.name}</div>
                                <div className="text-xs text-slate-500">{member.email ?? "—"}</div>
                                {isSuperAdmin && advancedOpen && row.provider_name === "Highfield" ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${lmsStatusPillClass(
                                        row.lms_sync_status
                                      )}`}
                                    >
                                      LMS: {lmsStatusLabel(row.lms_sync_status)}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </Link>
                          ) : (
                            <span className="text-slate-400">Unknown member</span>
                          )}
                        </td>

                        <td className="px-3 py-3 font-medium text-slate-900">
                          {getCourseLabel(row.course_key, row.type)}
                        </td>

                        <td className="px-3 py-3 text-slate-700">{row.provider_name ?? "—"}</td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusPillClass(
                                row.status
                              )}`}
                            >
                              {statusLabel(row.status)}
                            </span>
                            {isArchived && (
                              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                Archived
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${workflowPillClass(
                              workflow
                            )}`}
                          >
                            {workflowLabel(workflow)}
                          </span>
                        </td>

                        <td className="px-2 py-3 text-slate-700">{formatDate(row.assigned_on)}</td>
                        <td className="px-2 py-3 text-slate-700">
                          {formatDate(row.completed_on || row.awarded_on)}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {formatDate(row.certificate_expiry_date || row.expires_on)}
                        </td>

                        <td className="px-3 py-3">
                          {row.certificate_url ? (
                            <a
                              href={row.certificate_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              View →
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end">
                            <ActionMenu items={menuItems} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                      No training records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {bulkOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/30 p-4 sm:p-6"
            onClick={() => setBulkOpen(false)}
          >
            <div
              className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">Assign course</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Assign one course to {selectedIds.length} selected staff members.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Course</span>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={bulkForm.courseKey}
                    onChange={(e) =>
                      setBulkForm((p) => ({
                        ...p,
                        courseKey: e.target.value as HighfieldCourseKey,
                      }))
                    }
                  >
                    {HIGHFIELD_COURSES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Set as</span>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={bulkForm.status}
                    onChange={(e) =>
                      setBulkForm((p) => ({
                        ...p,
                        status: e.target.value as "assigned" | "invited",
                      }))
                    }
                  >
                    <option value="assigned">Assigned</option>
                    <option value="invited">Invited</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Assign date</span>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={bulkForm.assignedOn}
                    onChange={(e) =>
                      setBulkForm((p) => ({
                        ...p,
                        assignedOn: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">Notes</span>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={bulkForm.notes}
                    onChange={(e) =>
                      setBulkForm((p) => ({
                        ...p,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Optional note"
                  />
                </label>

                <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="mt-1 accent-emerald-600"
                    checked={bulkForm.skipExisting}
                    onChange={(e) =>
                      setBulkForm((p) => ({
                        ...p,
                        skipExisting: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="font-medium">Skip staff already assigned</span>
                    <div className="mt-0.5 text-[11px] text-slate-600">
                      Includes assigned, invited, in progress, or completed and not expired.
                    </div>
                  </span>
                </label>

                {isSuperAdmin && advancedOpen && (
                  <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-800">Licence check</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-slate-500">Available now</div>
                        <div className="mt-1 text-base font-semibold text-slate-900">
                          {bulkAvailableStock}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="text-slate-500">Licences needed</div>
                        <div className="mt-1 text-base font-semibold text-slate-900">
                          {bulkRequiredStock}
                        </div>
                      </div>
                      <div
                        className={`rounded-xl border px-3 py-2 ${
                          bulkHasEnoughStock
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                      >
                        <div>Left after assignment</div>
                        <div className="mt-1 text-base font-semibold">{bulkProjectedRemaining}</div>
                      </div>
                    </div>

                    {!bulkHasEnoughStock && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-800">
                        Not enough stock for this assignment.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveBulkAssign()}
                  disabled={
                    bulkSaving ||
                    (isSuperAdmin &&
                      advancedOpen &&
                      (!bulkHasEnoughStock || bulkRequiredStock <= 0))
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {bulkSaving ? "Assigning…" : "Assign course"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {stockOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/30 p-4 sm:p-6"
            onClick={() => setStockOpen(false)}
          >
            <div
              className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">Add licence stock</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Add purchased Highfield licences to available stock.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStockOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Course</span>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={stockForm.courseKey}
                    onChange={(e) =>
                      setStockForm((p) => ({
                        ...p,
                        courseKey: e.target.value as HighfieldCourseKey,
                      }))
                    }
                  >
                    {HIGHFIELD_COURSES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Quantity</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={stockForm.quantity}
                    onChange={(e) =>
                      setStockForm((p) => ({
                        ...p,
                        quantity: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveAddStock()}
                  disabled={stockSaving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {stockSaving ? "Saving…" : "Add stock"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {importOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/30 p-4 sm:p-6"
            onClick={() => {
              if (importingResults || previewLoading) return;
              setImportOpen(false);
              setImportFile(null);
              setImportPreview([]);
            }}
          >
            <div
              className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">Import Highfield results</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Upload the CSV, preview what matches, then confirm import.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (importingResults || previewLoading) return;
                    setImportOpen(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadHighfieldImportTemplate}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Download template
                  </button>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">CSV file</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImportFile(file);
                      setImportPreview([]);
                    }}
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                  Expected columns:
                  <div className="mt-2 font-medium text-slate-800">
                    Email, Course, Status, Completed Date, Expiry Date, Certificate URL, Learner ID, Enrolment ID
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void buildImportPreview()}
                    disabled={!importFile || previewLoading}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {previewLoading ? "Checking…" : "Preview import"}
                  </button>

                  {importPreview.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={downloadUnmatchedRowsCsv}
                        disabled={importUnmatched.length === 0}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Download unmatched CSV
                      </button>

                      <button
                        type="button"
                        onClick={() => void applyImportPreview()}
                        disabled={importingResults || importMatched.length === 0}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {importingResults ? "Importing…" : `Confirm import (${importMatched.length})`}
                      </button>
                    </>
                  )}
                </div>

                {importPreview.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <div className="text-xs text-emerald-700">Matched</div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-900">
                        {importMatched.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <div className="text-xs text-rose-700">Unmatched</div>
                      <div className="mt-1 text-2xl font-semibold text-rose-900">
                        {importUnmatched.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs text-slate-500">Total rows</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {importPreview.length}
                      </div>
                    </div>
                  </div>
                )}

                {importMatched.length > 0 && (
                  <div className="rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                      Matched rows
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-white text-slate-500">
                          <tr>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Course</th>
                            <th className="px-4 py-2">CSV status</th>
                            <th className="px-4 py-2">Mapped status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importMatched.map((item) => (
                            <tr key={`matched-${item.csvIndex}`} className="border-t border-slate-100">
                              <td className="px-4 py-2 text-slate-800">{item.email}</td>
                              <td className="px-4 py-2 text-slate-800">{item.course}</td>
                              <td className="px-4 py-2 text-slate-600">{item.statusRaw || "—"}</td>
                              <td className="px-4 py-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusPillClass(
                                    item.mappedTrainingStatus
                                  )}`}
                                >
                                  {statusLabel(item.mappedTrainingStatus)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importUnmatched.length > 0 && (
                  <div className="rounded-2xl border border-rose-200">
                    <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                      Unmatched rows
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-white text-slate-500">
                          <tr>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Course</th>
                            <th className="px-4 py-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importUnmatched.map((item) => (
                            <tr key={`unmatched-${item.csvIndex}`} className="border-t border-slate-100">
                              <td className="px-4 py-2 text-slate-800">{item.email || "—"}</td>
                              <td className="px-4 py-2 text-slate-800">{item.course || "—"}</td>
                              <td className="px-4 py-2 text-rose-700">{item.reason || "Unmatched"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (importingResults || previewLoading) return;
                    setImportOpen(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {editOpen && editingRow && editForm && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/30 p-4 sm:p-6"
            onClick={() => {
              if (editSaving) return;
              setEditOpen(false);
              setEditingRow(null);
              setEditForm(null);
              setEditCertificateFile(null);
            }}
          >
            <div
              className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">Edit training</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {editingRow.team_member?.name || "Unknown member"} ·{" "}
                    {getCourseLabel(editingRow.course_key, editingRow.type)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (editSaving) return;
                    setEditOpen(false);
                    setEditingRow(null);
                    setEditForm(null);
                    setEditCertificateFile(null);
                  }}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Status</span>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={editForm.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as TrainingStatus;
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: nextStatus,
                              completed_on:
                                nextStatus === "completed" || nextStatus === "expired"
                                  ? prev.completed_on || todayISODate()
                                  : "",
                              expires_on:
                                nextStatus === "completed" || nextStatus === "expired"
                                  ? prev.expires_on ||
                                    addYearsISO(prev.completed_on || todayISODate(), 2)
                                  : "",
                            }
                          : prev
                      );
                    }}
                  >
                    <option value="assigned">Assigned</option>
                    <option value="invited">Invited</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Assigned date</span>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={editForm.assigned_on}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, assigned_on: e.target.value } : prev
                      )
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Completed date</span>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50"
                    value={editForm.completed_on}
                    disabled={!(editForm.status === "completed" || editForm.status === "expired")}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              completed_on: e.target.value,
                              expires_on: e.target.value
                                ? addYearsISO(e.target.value, 2)
                                : "",
                            }
                          : prev
                      )
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Expiry date</span>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50"
                    value={editForm.expires_on}
                    disabled={!(editForm.status === "completed" || editForm.status === "expired")}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, expires_on: e.target.value } : prev
                      )
                    }
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">Certificate URL</span>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={editForm.certificate_url}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, certificate_url: e.target.value } : prev
                      )
                    }
                    placeholder="https://..."
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">Upload certificate file</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setEditCertificateFile(file);
                    }}
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    {editCertificateFile
                      ? `Selected: ${editCertificateFile.name}`
                      : "PDF preferred. Image also fine."}
                  </div>
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">Notes</span>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, notes: e.target.value } : prev
                      )
                    }
                    placeholder="Optional notes"
                  />
                </label>

                {isSuperAdmin && advancedOpen && editingRow.provider_name === "Highfield" && (
                  <div className="sm:col-span-2 mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-slate-900">
                      LMS sync details
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-500">LMS sync status</span>
                        <select
                          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                          value={editForm.lms_sync_status}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    lms_sync_status:
                                      (e.target.value as TrainingLmsSyncStatus | "") || "",
                                  }
                                : prev
                            )
                          }
                        >
                          <option value="">—</option>
                          <option value="not_sent">Not sent</option>
                          <option value="queued">Queued</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="completed">Completed in LMS</option>
                          <option value="failed">Failed</option>
                        </select>
                      </label>

                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <div className="text-slate-500">Last synced</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDateTime(editingRow.lms_last_synced_at)}
                        </div>
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-500">External learner ID</span>
                        <input
                          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                          value={editForm.external_learner_id}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, external_learner_id: e.target.value } : prev
                            )
                          }
                          placeholder="Highfield learner ID"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-500">
                          External enrolment ID
                        </span>
                        <input
                          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                          value={editForm.external_enrolment_id}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, external_enrolment_id: e.target.value } : prev
                            )
                          }
                          placeholder="Highfield enrolment ID"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs text-slate-500">Sync error</span>
                        <input
                          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                          value={editForm.lms_sync_error}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, lms_sync_error: e.target.value } : prev
                            )
                          }
                          placeholder="Optional sync failure note"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editSaving) return;
                    setEditOpen(false);
                    setEditingRow(null);
                    setEditForm(null);
                    setEditCertificateFile(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={editSaving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}