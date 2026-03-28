"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import ActionMenu from "@/components/ActionMenu";
import { inviteTeamMemberServer } from "@/app/actions/team";
import {
  createTrainingServer,
  uploadTrainingCertificateServer,
  type TrainingStatus,
  type LicenceState,
} from "@/app/actions/training";

/* -------------------- Types -------------------- */
type TrainingArea =
  | "cross_contamination"
  | "cleaning"
  | "chilling"
  | "cooking"
  | "allergens"
  | "management";

const TRAINING_AREAS: { key: TrainingArea; label: string; short: string }[] = [
  { key: "cross_contamination", label: "Cross-contamination", short: "Cross-contam" },
  { key: "cleaning", label: "Cleaning", short: "Cleaning" },
  { key: "chilling", label: "Chilling", short: "Chilling" },
  { key: "cooking", label: "Cooking", short: "Cooking" },
  { key: "allergens", label: "Allergens", short: "Allergens" },
  { key: "management", label: "Management", short: "Management" },
];

const HIGHFIELD_COURSES = [
  { key: "food_safety_level_2", label: "Food Safety Level 2" },
  { key: "food_safety_level_1", label: "Food Safety Level 1" },
  { key: "introduction_to_allergens", label: "Introduction to Allergens" },
] as const;

type HighfieldCourseKey = (typeof HIGHFIELD_COURSES)[number]["key"];

type Member = {
  id: string;
  org_id?: string;
  location_id: string | null;

  user_id: string | null;
  login_enabled: boolean;

  initials: string | null;
  name: string;
  email: string | null;
  role: string | null;
  phone: string | null;
  active: boolean | null;
  notes?: string | null;
  training_areas?: TrainingArea[] | null;

  pin_set?: boolean;
};

type TrainingCert = {
  id: string;
  type: string | null;
  awarded_on: string | null;
  expires_on: string | null;
  certificate_url: string | null;
  notes: string | null;

  provider_name?: "Highfield" | "Other" | null;
  course_key?: string | null;

  status?: TrainingStatus | null;
  assigned_on?: string | null;
  started_on?: string | null;
  completed_on?: string | null;

  learner_email?: string | null;
  learner_first_name?: string | null;
  learner_last_name?: string | null;

  certificate_issue_date?: string | null;
  certificate_expiry_date?: string | null;

  external_learner_id?: string | null;
  external_enrolment_id?: string | null;

  licence_state?: LicenceState | null;
  sync_source?: "manual" | "highfield" | "csv" | null;
  last_synced_at?: string | null;
};

type MemberTrainingSummary = {
  valid: number;
  expiring: number;
  expired: number;
  inProgress: number;
  assigned: number;
};

type TrainingFormState = {
  id?: string;
  course: string;
  courseKey: string;
  provider: "Highfield" | "Other";
  providerName: string;
  status: TrainingStatus;
  assigned_on: string;
  awarded_on: string;
  expires_on: string;
  certificate_url: string;
  notes: string;
};

/* -------------------- Helpers -------------------- */
function safeInitials(m: Member): string {
  const fromField = (m.initials ?? "").trim().toUpperCase();
  if (fromField) return fromField;

  const parts = m.name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
}

function prettyRole(role: string | null) {
  if (!role) return "—";
  const r = role.toString().toLowerCase();
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function isTrainingArea(x: string): x is TrainingArea {
  return TRAINING_AREAS.some((a) => a.key === x);
}

function normalizeAreas(arr: any): TrainingArea[] {
  if (!Array.isArray(arr)) return [];
  const cleaned = arr
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .filter(isTrainingArea);
  return Array.from(new Set(cleaned));
}

function pillClassSelected(selected: boolean) {
  return selected
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

function addMonthsISODate(months: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function todayISODate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
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

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function certTitle(c: TrainingCert) {
  const providerEnum = c.provider_name ?? null;
  const providerLabel =
    providerEnum === "Other"
      ? c.course_key
        ? `Provider: ${c.course_key}`
        : "Provider: Other"
      : "Provider: Highfield";

  const courseLabel = c.type ?? "—";
  return `${providerLabel} · ${courseLabel}`;
}

function cleanEmail(val: string | null | undefined) {
  const e = (val ?? "").trim().toLowerCase();
  return e || "";
}

function requireInitialsOrDerive(editing: Member) {
  const forced = (editing.initials ?? "").trim().toUpperCase();
  if (forced) return forced;

  const derived = safeInitials({ ...editing, initials: "" } as Member);
  return derived.trim().toUpperCase();
}

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "").slice(0, 8);
}

function prettyTrainingStatus(status?: TrainingStatus | null) {
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

function trainingStatusPillClass(status?: TrainingStatus | null) {
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

function defaultTrainingForm(): TrainingFormState {
  return {
    course: "Food Safety Level 2",
    courseKey: "food_safety_level_2",
    provider: "Highfield",
    providerName: "",
    status: "assigned",
    assigned_on: todayISODate(),
    awarded_on: "",
    expires_on: "",
    certificate_url: "",
    notes: "",
  };
}

function trainingSummaryForRecords(records: TrainingCert[]): MemberTrainingSummary {
  const today = todayISODate();

  let valid = 0;
  let expiring = 0;
  let expired = 0;
  let inProgress = 0;
  let assigned = 0;

  for (const r of records) {
    const status = r.status ?? "completed";

    if (status === "assigned" || status === "invited") {
      assigned += 1;
      continue;
    }
    if (status === "in_progress") {
      inProgress += 1;
      continue;
    }
    if (status === "expired") {
      expired += 1;
      continue;
    }
    if (status === "cancelled") continue;

    const expiry = r.certificate_expiry_date || r.expires_on;
    if (!expiry) {
      valid += 1;
      continue;
    }

    if (expiry < today) {
      expired += 1;
      continue;
    }

    const in30 = addDaysLocal(today, 30);
    if (expiry <= in30) {
      expiring += 1;
      continue;
    }

    valid += 1;
  }

  return { valid, expiring, expired, inProgress, assigned };
}

function addDaysLocal(baseISO: string, days: number) {
  const d = new Date(`${baseISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isTrainingStillActive(c: TrainingCert) {
  const today = todayISODate();
  const expiry = c.certificate_expiry_date || c.expires_on;

  if (c.status === "assigned" || c.status === "invited" || c.status === "in_progress") {
    return true;
  }

  if (c.status === "completed") {
    if (!expiry) return true;
    return expiry >= today;
  }

  return false;
}

/* ================================================= */
export default function TeamManager() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [q, setQ] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const [allowLogin, setAllowLogin] = useState<boolean>(false);
  const [sendingInviteOnSave, setSendingInviteOnSave] = useState(false);
  const [sendingInviteFromEdit, setSendingInviteFromEdit] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewFor, setViewFor] = useState<Member | null>(null);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  const [pinLoading, setPinLoading] = useState(false);
  const [pinSet, setPinSet] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  const [certsLoading, setCertsLoading] = useState(false);
  const [certs, setCerts] = useState<TrainingCert[]>([]);

  const [editCertsLoading, setEditCertsLoading] = useState(false);
  const [editCerts, setEditCerts] = useState<TrainingCert[]>([]);

  const [editTrainingForm, setEditTrainingForm] = useState<TrainingFormState>(
    defaultTrainingForm()
  );
  const [editCertFile, setEditCertFile] = useState<File | null>(null);
  const [editCertSaving, setEditCertSaving] = useState(false);
  const [assigningCourseKey, setAssigningCourseKey] = useState<string | null>(null);

  const [memberTrainingSummary, setMemberTrainingSummary] = useState<
    Record<string, MemberTrainingSummary>
  >({});

  async function loadPinStatusForMembers(oid: string, memberIds: string[]) {
    if (!oid || memberIds.length === 0) return new Set<string>();

    const res = await fetch("/api/workstation/pin-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: oid, memberIds }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      console.warn("[team] pin status api failed:", json?.detail ?? res.statusText);
      return new Set<string>();
    }

    return new Set<string>((json.pinSetIds ?? []).map(String));
  }

  async function loadPinStatusForMember(oid: string, memberId: string) {
    if (!oid || !memberId) {
      setPinSet(false);
      return;
    }
    setPinLoading(true);
    setPinMsg(null);
    try {
      const { data, error } = await supabase
        .from("team_member_pins")
        .select("team_member_id")
        .eq("org_id", oid)
        .eq("team_member_id", memberId)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.warn("[team] load pin status error:", error.message);
      }

      setPinSet(!!data?.team_member_id);
    } finally {
      setPinLoading(false);
    }
  }

  async function setOrResetPin() {
    if (!editing) return;
    if (!orgId) return alert("No organisation found.");
    if (!locationId) return alert("Pick a location first.");
    if (!isOwner) return alert("Only owner/admin can set PINs.");
    if (!editing.id) return;
    if (!editing.id) return;

    const pin = onlyDigits(pinInput);
    if (pin.length < 4) {
      setPinMsg("Enter a 4+ digit PIN.");
      return;
    }

    setPinSaving(true);
    setPinMsg(null);
    try {
      const res = await fetch("/api/workstation/set-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          locationId,
          teamMemberId: editing.id,
          pin,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const detail = json?.detail ? ` (${json.detail})` : "";
        setPinMsg(`Failed to set PIN${detail}`);
        return;
      }

      setPinSet(true);
      setPinInput("");
      setPinMsg("PIN saved.");

      setRows((prev) =>
        prev.map((m) => (m.id === editing.id ? { ...m, pin_set: true } : m))
      );
    } finally {
      setPinSaving(false);
      window.setTimeout(() => setPinMsg(null), 2000);
    }
  }

  async function loadTrainingSummaryForMembers(oid: string, memberIds: string[]) {
    if (!oid || !memberIds.length) {
      setMemberTrainingSummary({});
      return;
    }

    const { data, error } = await supabase
      .from("trainings")
      .select("id,team_member_id,status,expires_on,certificate_expiry_date")
      .eq("org_id", oid)
      .in("team_member_id", memberIds)
      .is("archived_at", null);

    if (error) {
      console.warn("[team] training summary load failed:", error.message);
      setMemberTrainingSummary({});
      return;
    }

    const grouped: Record<string, TrainingCert[]> = {};
    for (const row of data ?? []) {
      const memberId = String((row as any).team_member_id);
      if (!grouped[memberId]) grouped[memberId] = [];
      grouped[memberId].push({
        id: String((row as any).id),
        type: null,
        awarded_on: null,
        expires_on: (row as any).expires_on ?? null,
        certificate_url: null,
        notes: null,
        status: (row as any).status ?? null,
        certificate_expiry_date: (row as any).certificate_expiry_date ?? null,
      });
    }

    const summaries: Record<string, MemberTrainingSummary> = {};
    for (const id of memberIds) {
      summaries[id] = trainingSummaryForRecords(grouped[id] ?? []);
    }

    setMemberTrainingSummary(summaries);
  }

  async function load() {
    setLoading(true);
    setIsOwner(false);

    try {
      const [oid, lid, userRes] = await Promise.all([
        getActiveOrgIdClient(),
        getActiveLocationIdClient(),
        supabase.auth.getUser(),
      ]);

      const u = userRes.data.user ?? null;
      const userEmail = u?.email?.toLowerCase() ?? null;
      const userId = u?.id ?? null;

      const userName = (u?.user_metadata as any)?.full_name ?? u?.email ?? "Owner";

      setAuthUserId(userId);
      setAuthEmail(userEmail);

      setOrgId(oid ?? null);
      setLocationId(lid ?? null);

      if (!oid) {
        setRows([]);
        setLoading(false);
        return;
      }

      let qMembers = supabase
        .from("team_members")
        .select(
          "id, org_id, location_id, user_id, login_enabled, initials, name, email, role, phone, active, notes, training_areas"
        )
        .eq("org_id", oid)
        .order("name", { ascending: true });

      if (lid) qMembers = qMembers.eq("location_id", lid);

      const { data, error } = await qMembers;
      if (error) throw error;

      let members: Member[] =
        (data ?? []).map((m: any) => ({
          id: String(m.id),
          org_id: String(m.org_id),
          location_id: m.location_id ? String(m.location_id) : null,
          user_id: m.user_id ? String(m.user_id) : null,
          login_enabled: !!m.login_enabled,
          initials: m.initials ?? null,
          name: m.name ?? "",
          email: m.email ?? null,
          role: m.role ?? null,
          phone: m.phone ?? null,
          active: m.active ?? true,
          notes: m.notes ?? null,
          training_areas: normalizeAreas(m.training_areas),
        })) ?? [];

      if (members.length === 0 && oid && userEmail) {
        const derivedInitials = requireInitialsOrDerive({
          id: "",
          org_id: oid,
          location_id: lid ?? null,
          user_id: userId,
          login_enabled: true,
          initials: null,
          name: userName,
          email: userEmail,
          role: "owner",
          phone: null,
          active: true,
          notes: null,
          training_areas: [],
        } as Member);

        const { data: inserted, error: insErr } = await supabase
          .from("team_members")
          .insert({
            org_id: oid,
            location_id: lid ?? null,
            initials: derivedInitials,
            name: userName,
            email: userEmail,
            role: "owner",
            phone: null,
            notes: null,
            active: true,
            training_areas: [],
            user_id: userId,
            login_enabled: true,
          })
          .select(
            "id, org_id, location_id, user_id, login_enabled, initials, name, email, role, phone, active, notes, training_areas"
          )
          .maybeSingle();

        if (!insErr && inserted) {
          members = [
            {
              id: String((inserted as any).id),
              org_id: String((inserted as any).org_id),
              location_id: (inserted as any).location_id
                ? String((inserted as any).location_id)
                : null,
              user_id: (inserted as any).user_id
                ? String((inserted as any).user_id)
                : null,
              login_enabled: !!(inserted as any).login_enabled,
              initials: (inserted as any).initials ?? null,
              name: (inserted as any).name ?? "",
              email: (inserted as any).email ?? null,
              role: (inserted as any).role ?? null,
              phone: (inserted as any).phone ?? null,
              active: (inserted as any).active ?? true,
              notes: (inserted as any).notes ?? null,
              training_areas: normalizeAreas((inserted as any).training_areas),
            },
          ];
        }
      }

      if (oid && lid && userEmail && userId) {
        const { data: myRow } = await supabase
          .from("team_members")
          .select("id,user_id,login_enabled")
          .eq("org_id", oid)
          .eq("location_id", lid)
          .ilike("email", userEmail)
          .maybeSingle();

        if (myRow?.id && (!myRow.user_id || String(myRow.user_id) !== String(userId))) {
          await supabase
            .from("team_members")
            .update({ user_id: userId, login_enabled: true })
            .eq("id", myRow.id)
            .eq("org_id", oid);
        }
      }

      let ownerFlag = false;
      if (userEmail && members.length) {
        const me = members.find((m) => m.email && m.email.toLowerCase() === userEmail);
        const role = (me?.role ?? "").toLowerCase();
        ownerFlag = role === "owner" || role === "admin" || role === "manager";
      }

      const memberIds = members.map((m) => m.id);
      const pinSetIds = await loadPinStatusForMembers(oid, memberIds);
      members = members.map((m) => ({ ...m, pin_set: pinSetIds.has(m.id) }));

      setRows(members);
      setIsOwner(ownerFlag);

      await loadTrainingSummaryForMembers(oid, memberIds);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load team.");
      setRows([]);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const staffParam = searchParams.get("staff");
    if (!staffParam || !rows.length) return;

    const needle = staffParam.trim().toUpperCase();

    const match =
      rows.find((m) => m.id === staffParam) ??
      rows.find((m) => safeInitials(m).toUpperCase() === needle);

    if (!match) return;

    setViewFor(match);
    setViewOpen(true);
    setHighlightId(match.id);
    void loadCertsForMember(match);

    router.replace("/team");
  }, [searchParams, rows, router]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 8000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.initials, r.name, r.email, r.role]
        .filter(Boolean)
        .some((s) => (s ?? "").toLowerCase().includes(term))
    );
  }, [rows, q]);

  function closeViewCard() {
    setViewOpen(false);
    setViewFor(null);
    setCerts([]);
    setCertsLoading(false);
  }

  function openAdd() {
    setEditing({
      id: "",
      location_id: locationId ?? null,
      user_id: null,
      login_enabled: false,
      initials: "",
      name: "",
      email: "",
      role: "staff",
      phone: "",
      active: true,
      notes: "",
      training_areas: [],
      pin_set: false,
    });

    setAllowLogin(false);
    setSendingInviteOnSave(false);
    setSendingInviteFromEdit(false);

    setEditCerts([]);
    setEditCertsLoading(false);
    setEditCertSaving(false);
    setEditCertFile(null);
    setEditTrainingForm(defaultTrainingForm());

    setPinInput("");
    setPinMsg(null);
    setPinSet(false);
    setPinLoading(false);
    setPinSaving(false);
    setAssigningCourseKey(null);

    setEditOpen(true);
  }

  async function openEdit(m: Member) {
    setEditing({
      ...m,
      user_id: m.user_id ? String(m.user_id) : null,
      training_areas: normalizeAreas(m.training_areas),
    });

    setAllowLogin(false);
    setSendingInviteOnSave(false);
    setSendingInviteFromEdit(false);

    setPinInput("");
    setPinMsg(null);
    setPinSet(!!m.pin_set);
    setPinLoading(false);
    setPinSaving(false);

    setEditTrainingForm(defaultTrainingForm());
    setEditCertFile(null);
    setAssigningCourseKey(null);

    await Promise.all([
      loadEditCertsForMember(m),
      orgId ? loadPinStatusForMember(orgId, m.id) : Promise.resolve(),
    ]);

    setEditOpen(true);
  }

  function toggleArea(area: TrainingArea) {
    if (!editing) return;
    const current = normalizeAreas(editing.training_areas);
    const next = current.includes(area)
      ? current.filter((x) => x !== area)
      : [...current, area];
    setEditing({ ...editing, training_areas: next });
  }

  async function syncTrainingTracking(memberId: string, selectedAreas: TrainingArea[]) {
    if (!orgId) return;

    const trained_on = todayISODate();
    const due_on = addMonthsISODate(12);

    if (selectedAreas.length) {
      const upserts = selectedAreas.map((area) => ({
        org_id: orgId,
        team_member_id: memberId,
        area,
        trained_on,
        due_on,
      }));

      const { error: upErr } = await supabase
        .from("team_training_area_status")
        .upsert(upserts, { onConflict: "team_member_id,area" });

      if (upErr) throw upErr;
    }

    const allAreaKeys = TRAINING_AREAS.map((a) => a.key);
    const unselected = allAreaKeys.filter((a) => !selectedAreas.includes(a));

    if (unselected.length) {
      const { error: delErr } = await supabase
        .from("team_training_area_status")
        .delete()
        .eq("team_member_id", memberId)
        .in("area", unselected);

      if (delErr) throw delErr;
    }
  }

  async function ensureMemberRowByEmail(params: {
    orgId: string;
    locationId: string;
    email: string;
    payload: any;
  }): Promise<string> {
    const { orgId, locationId, email, payload } = params;

    const { data: existing, error: selErr } = await supabase
      .from("team_members")
      .select("id")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .ilike("email", email)
      .maybeSingle();

    if (selErr) throw selErr;

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("team_members")
        .update(payload)
        .eq("id", existing.id)
        .eq("org_id", orgId);

      if (upErr) throw upErr;
      return String(existing.id);
    }

    const { data: inserted, error: insErr } = await supabase
      .from("team_members")
      .insert(payload)
      .select("id")
      .single();

    if (insErr) throw insErr;
    return String(inserted.id);
  }

  async function sendInviteForExistingMember() {
    if (!editing) return;
    if (!orgId) return alert("No organisation found.");
    if (!locationId) return alert("Pick a location first.");
    if (!isOwner) return alert("Only the owner/admin can invite team members.");
    if (!editing.id) return;
    if (editing.user_id) return alert("This staff member already has a linked login.");

    const emailNormalized = cleanEmail(editing.email);
    if (!emailNormalized) return alert("Add an email address first, then invite.");

    if (authEmail && emailNormalized === authEmail) {
      if (authUserId) {
        await supabase
          .from("team_members")
          .update({ user_id: authUserId, login_enabled: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("id", editing.id);

        alert("Your profile has been linked to your login.");
        await load();
        setEditOpen(false);
        setEditing(null);
      }
      return;
    }

    const roleValue = (editing.role ?? "").trim().toLowerCase() || "staff";

    setSendingInviteFromEdit(true);
    try {
      const res = await inviteTeamMemberServer({
        email: emailNormalized,
        role: roleValue,
      });

      if (!res.ok) throw new Error(res.message ?? "Failed to send invite.");

      alert("Invite sent. They’ll get an email to set their password and log in.");

      await load();
    } catch (e: any) {
      alert(
        e?.message ??
          "Invite failed. If this email already exists in the system, you can’t invite it again."
      );
    } finally {
      setSendingInviteFromEdit(false);
    }
  }

  async function saveMember() {
    if (!editing) return;

    try {
      if (!orgId) return alert("No organisation found.");
      if (!locationId) return alert("Pick a location first.");
      if (!editing.name.trim()) return alert("Name is required.");

      const roleValue = (editing.role ?? "").trim().toLowerCase() || "staff";
      const trainingAreas = normalizeAreas(editing.training_areas);

      const initialsToSave = requireInitialsOrDerive(editing);
      if (!initialsToSave) {
        return alert("Initials are required (or enter a name we can derive from).");
      }

      const emailNormalized = cleanEmail(editing.email);

      if (editing.id) {
        const updatePayload: any = {
          location_id: locationId,
          initials: initialsToSave,
          name: editing.name.trim(),
          email: emailNormalized || null,
          phone: (editing.phone ?? "").trim() || null,
          notes: (editing.notes ?? "").trim() || null,
          active: editing.active ?? true,
          training_areas: trainingAreas,
        };

        if (isOwner) updatePayload.role = roleValue;

        const { error } = await supabase
          .from("team_members")
          .update(updatePayload)
          .eq("id", editing.id)
          .eq("org_id", orgId);

        if (error) throw error;

        await syncTrainingTracking(editing.id, trainingAreas);

        setEditOpen(false);
        setEditing(null);
        await load();
        return;
      }

      if (!isOwner) return alert("Only the owner can add team members.");

      if (allowLogin) {
        if (!emailNormalized) return alert("Email is required to allow login.");

        setSendingInviteOnSave(true);

        const res = await inviteTeamMemberServer({
          email: emailNormalized,
          role: roleValue,
        });

        if (!res.ok) {
          throw new Error(res.message ?? "Failed to send invite.");
        }

        const payload: any = {
          org_id: orgId,
          location_id: locationId,
          initials: initialsToSave,
          name: editing.name.trim(),
          email: emailNormalized,
          role: roleValue,
          phone: (editing.phone ?? "").trim() || null,
          notes: (editing.notes ?? "").trim() || null,
          active: true,
          training_areas: trainingAreas,
          login_enabled: true,
        };

        const memberId = await ensureMemberRowByEmail({
          orgId,
          locationId,
          email: emailNormalized,
          payload,
        });

        await syncTrainingTracking(memberId, trainingAreas);

        alert("Invite sent. They’ll get an email to set their password and log in.");

        setEditOpen(false);
        setEditing(null);
        await load();
        return;
      }

      const { data: inserted, error } = await supabase
        .from("team_members")
        .insert({
          org_id: orgId,
          location_id: locationId,
          initials: initialsToSave,
          name: editing.name.trim(),
          email: emailNormalized || null,
          role: roleValue,
          phone: (editing.phone ?? "").trim() || null,
          notes: (editing.notes ?? "").trim() || null,
          active: true,
          training_areas: trainingAreas,
          login_enabled: false,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (inserted?.id) {
        await syncTrainingTracking(String(inserted.id), trainingAreas);
      }

      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Save failed.");
    } finally {
      setSendingInviteOnSave(false);
    }
  }

  async function remove(id: string) {
    if (!isOwner) return alert("Only the owner can delete team members.");
    if (!confirm("Delete this team member?")) return;

    try {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Delete failed.");
    }
  }

  async function loadCertsForMember(m: Member) {
    setCerts([]);
    setCertsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trainings")
        .select(
          "id,type,awarded_on,expires_on,certificate_url,notes,provider_name,course_key,status,assigned_on,started_on,completed_on,learner_email,learner_first_name,learner_last_name,certificate_issue_date,certificate_expiry_date,external_learner_id,external_enrolment_id,licence_state,sync_source,last_synced_at"
        )
        .eq("team_member_id", m.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setCerts((data ?? []) as TrainingCert[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load training.");
      setCerts([]);
    } finally {
      setCertsLoading(false);
    }
  }

  async function loadEditCertsForMember(m: Member) {
    setEditCerts([]);
    setEditCertsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trainings")
        .select(
          "id,type,awarded_on,expires_on,certificate_url,notes,provider_name,course_key,status,assigned_on,started_on,completed_on,learner_email,learner_first_name,learner_last_name,certificate_issue_date,certificate_expiry_date,external_learner_id,external_enrolment_id,licence_state,sync_source,last_synced_at"
        )
        .eq("team_member_id", m.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEditCerts((data ?? []) as TrainingCert[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load training.");
      setEditCerts([]);
    } finally {
      setEditCertsLoading(false);
    }
  }

  async function saveTrainingRecord() {
    if (!editing) return;
    if (!orgId) return alert("No organisation found.");

    const course = (editTrainingForm.course ?? "").trim();
    if (!course) return alert("Course is required.");

    const provider_name: "Highfield" | "Other" =
      editTrainingForm.provider === "Other" ? "Other" : "Highfield";

    const course_key =
      provider_name === "Highfield"
        ? editTrainingForm.courseKey
        : (editTrainingForm.providerName ?? "").trim() || null;

    const status = editTrainingForm.status;
    const assigned_on = (editTrainingForm.assigned_on ?? "").trim() || todayISODate();

    setEditCertSaving(true);

    try {
      let certificate_url: string | null =
        (editTrainingForm.certificate_url ?? "").trim() || null;

      if (editCertFile) {
        const up = await uploadTrainingCertificateServer({ file: editCertFile });
        if (!up?.url && !up?.path) {
          throw new Error("Certificate upload failed (no URL/path returned).");
        }
        certificate_url = up.url || certificate_url;
      }

      const awarded_on =
        status === "completed" || status === "expired"
          ? (editTrainingForm.awarded_on ?? "").trim() || todayISODate()
          : null;

      const expires_on =
        status === "completed" || status === "expired"
          ? (editTrainingForm.expires_on ?? "").trim() ||
            (awarded_on ? addYearsISO(awarded_on, 2) : null)
          : null;

      const nameParts = editing.name.trim().split(/\s+/).filter(Boolean);
      const learner_first_name = nameParts[0] ?? null;
      const learner_last_name =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

      await createTrainingServer({
        id: editTrainingForm.id,
        teamMemberId: editing.id,
        type: course,
        course_key,
        provider_name,
        status,
        assigned_on,
        completed_on: awarded_on,
        awarded_on,
        expires_on,
        certificate_issue_date: awarded_on,
        certificate_expiry_date: expires_on,
        certificate_url,
        learner_email: cleanEmail(editing.email) || null,
        learner_first_name,
        learner_last_name,
        licence_state:
          status === "completed"
            ? "consumed"
            : status === "cancelled"
            ? "cancelled"
            : "assigned",
        sync_source: provider_name === "Highfield" ? "highfield" : "manual",
        notes: (editTrainingForm.notes ?? "").trim() || null,
      });

      setEditTrainingForm(defaultTrainingForm());
      setEditCertFile(null);

      await loadEditCertsForMember(editing);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed to save training.");
    } finally {
      setEditCertSaving(false);
    }
  }

  function loadTrainingIntoForm(c: TrainingCert) {
    setEditTrainingForm({
      id: c.id,
      course: c.type ?? "",
      courseKey: c.course_key ?? "",
      provider: c.provider_name === "Other" ? "Other" : "Highfield",
      providerName: c.provider_name === "Other" ? c.course_key ?? "" : "",
      status: c.status ?? "completed",
      assigned_on: c.assigned_on ?? todayISODate(),
      awarded_on: c.awarded_on ?? c.completed_on ?? "",
      expires_on: c.expires_on ?? c.certificate_expiry_date ?? "",
      certificate_url: c.certificate_url ?? "",
      notes: c.notes ?? "",
    });
    setEditCertFile(null);
  }

  async function quickAssignTraining(
    member: Member,
    courseKey: HighfieldCourseKey,
    label: string
  ) {
    if (!orgId) return alert("No organisation found.");

    const hasExisting = editCerts.some(
      (c) =>
        c.provider_name === "Highfield" &&
        c.course_key === courseKey &&
        isTrainingStillActive(c)
    );

    if (hasExisting) {
      alert(`${label} is already assigned or active for this team member.`);
      return;
    }

    setAssigningCourseKey(courseKey);

    try {
      const nameParts = member.name.trim().split(/\s+/).filter(Boolean);
      const learner_first_name = nameParts[0] ?? null;
      const learner_last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

      await createTrainingServer({
        teamMemberId: member.id,
        type: label,
        course_key: courseKey,
        provider_name: "Highfield",
        status: "assigned",
        assigned_on: todayISODate(),
        learner_email: cleanEmail(member.email) || null,
        learner_first_name,
        learner_last_name,
        licence_state: "assigned",
        sync_source: "highfield",
        notes: null,
      });

      await Promise.all([loadEditCertsForMember(member), load()]);
      alert(`${label} assigned.`);
    } catch (e: any) {
      alert(e?.message ?? "Failed to assign training.");
    } finally {
      setAssigningCourseKey(null);
    }
  }

  async function openCard(m: Member) {
    setViewFor(m);
    setViewOpen(true);
    await loadCertsForMember(m);
  }

  const canInviteInEdit =
    !!editing?.id &&
    isOwner &&
    !editing.user_id &&
    !!cleanEmail(editing.email) &&
    !(authEmail && cleanEmail(editing.email) === authEmail);

  return (
    <div className="mx-auto w-full max-w-6xl px-0 sm:px-4">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Team</h1>
            <div className="mt-1 text-xs text-slate-500">
              Add team members, set access, and keep a quick view of training health.
            </div>
          </div>

          <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href="/team/absences"
              className="whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Staff absences
            </Link>

            <input
              className="h-9 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 md:w-64"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {isOwner && (
              <button
                onClick={openAdd}
                className="whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                + Add member
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
          Loading…
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((m) => {
            const initials = safeInitials(m) || "—";
            const roleLabel = prettyRole(m.role);
            const activeLabel = m.active ? "Active" : "Inactive";
            const areas = normalizeAreas(m.training_areas);
            const trainingSummary = memberTrainingSummary[m.id] ?? {
              valid: 0,
              expiring: 0,
              expired: 0,
              inProgress: 0,
              assigned: 0,
            };

            const hasLinkedLogin = !!m.user_id;
            const loginLabel = hasLinkedLogin
              ? { text: "Login", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" }
              : m.login_enabled && cleanEmail(m.email)
              ? { text: "Invite pending", cls: "border-indigo-200 bg-indigo-50 text-indigo-800" }
              : { text: "No login", cls: "border-amber-200 bg-amber-50 text-amber-800" };

            const pinLabel = m.pin_set
              ? { text: "PIN set", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" }
              : { text: "No PIN", cls: "border-amber-200 bg-amber-50 text-amber-800" };

            return (
              <div
                key={m.id}
                className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-sm transition hover:shadow-md ${
                  highlightId === m.id
                    ? "animate-pulse bg-emerald-50/80 ring-1 ring-emerald-300/60"
                    : ""
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {initials}
                    </div>
                    <div>
                      <button
                        className="text-sm font-semibold text-slate-900 hover:text-emerald-700"
                        onClick={() => void openCard(m)}
                      >
                        {m.name || "Unnamed"}
                      </button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          {roleLabel}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            m.active
                              ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border border-slate-100 bg-slate-50 text-slate-500"
                          }`}
                        >
                          {activeLabel}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${loginLabel.cls}`}
                          title={loginLabel.text}
                        >
                          {loginLabel.text}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${pinLabel.cls}`}
                          title={pinLabel.text}
                        >
                          {pinLabel.text}
                        </span>

                        {trainingSummary.inProgress > 0 && (
                          <span
                            className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800"
                            title={`${trainingSummary.inProgress} training record${
                              trainingSummary.inProgress === 1 ? "" : "s"
                            } currently in progress`}
                          >
                            Training in progress {trainingSummary.inProgress > 1 ? `· ${trainingSummary.inProgress}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ActionMenu
                    items={[
                      { label: "View card", onClick: () => void openCard(m) },
                      { label: "Edit", onClick: () => void openEdit(m) },
                      ...(isOwner
                        ? [
                            {
                              label: "Delete",
                              onClick: () => void remove(m.id),
                              variant: "danger" as const,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>

                <div className="mb-2 flex flex-wrap gap-1.5">
                  {areas.length ? (
                    areas.map((a) => {
                      const meta = TRAINING_AREAS.find((x) => x.key === a);
                      if (!meta) return null;
                      return (
                        <span
                          key={a}
                          className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                          title={meta.label}
                        >
                          {meta.short}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-400">No training areas selected</span>
                  )}
                </div>

                <div className="space-y-3 text-xs text-slate-800">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Email</span>
                    <span className="max-w-[70%] truncate text-right">{m.email ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Phone</span>
                    <span className="max-w-[70%] truncate text-right">{m.phone ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Initials</span>
                    <span className="text-right">{m.initials ?? initials ?? "—"}</span>
                  </div>
                </div>

                {m.notes && (
                  <div className="mt-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                    {m.notes}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => void openEdit(m)}
                  >
                    Edit profile
                  </button>

                  <button
                    className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                    onClick={() => void openCard(m)}
                  >
                    View profile →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
          No team members yet.
        </div>
      )}

      {editOpen && editing && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4 sm:p-6"
            onClick={() => setEditOpen(false)}
          >
            <div
              className="
                mx-auto w-[min(1100px,calc(100vw-2rem))]
                max-h-[calc(100dvh-2rem)] overflow-y-auto
                rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur
              "
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 border-b border-slate-200 bg-white/90 px-4 pb-3 pt-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">
                    {editing.id ? "Edit member" : "Add member"}
                  </div>
                  <button
                    onClick={() => setEditOpen(false)}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {!locationId ? (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  No active location selected. Pick a location at the top of the app first.
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Initials</label>
                      <input
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                        value={editing.initials ?? ""}
                        onChange={(e) => setEditing({ ...editing, initials: e.target.value })}
                        placeholder="WS"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Required (auto-derived from name if left blank).
                      </p>
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">Name *</label>
                      <input
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                    </div>
                  </div>

                  {!editing.id && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                      <label className="flex items-start gap-3 text-sm text-slate-800">
                        <input
                          type="checkbox"
                          className="mt-1 accent-emerald-600"
                          checked={allowLogin}
                          onChange={(e) => setAllowLogin(e.target.checked)}
                        />
                        <span>
                          <span className="font-semibold">Allow user to log in</span>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            If enabled, we’ll send them an invite email on Save. If disabled, this is a
                            staff record only.
                          </div>
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Email{!editing.id && allowLogin ? " *" : ""}
                      </label>
                      <input
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                        value={editing.email ?? ""}
                        onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                        placeholder="team@example.com"
                      />
                      {!editing.id && allowLogin && (
                        <p className="mt-1 text-[11px] text-slate-600">Required to send invite.</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Phone</label>
                      <input
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                        value={editing.phone ?? ""}
                        onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Role</label>
                      {isOwner ? (
                        <select
                          className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                          value={(editing.role ?? "staff").toLowerCase()}
                          onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                        >
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                          value={prettyRole(editing.role ?? "staff")}
                          disabled
                        />
                      )}
                    </div>

                    <label className="mt-6 flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        className="accent-emerald-600"
                        checked={!!editing.active}
                        onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>

                  {editing.id ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Absences</div>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            View and log holiday, sickness and other leave for this team member.
                          </div>
                        </div>

                        <Link
                          href={`/team/absences?teamMemberId=${editing.id}`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Open absences
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-500">
                      Save the member first to manage absences.
                    </div>
                  )}

                  {editing.id ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Workstation PIN</div>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            Used on shared devices to select operator.
                          </div>
                        </div>

                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            pinLoading
                              ? "border-slate-200 bg-slate-50 text-slate-600"
                              : pinSet
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800",
                          ].join(" ")}
                        >
                          {pinLoading ? "Checking…" : pinSet ? "PIN set" : "No PIN"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            New PIN
                          </label>
                          <input
                            inputMode="numeric"
                            value={pinInput}
                            onChange={(e) => {
                              setPinMsg(null);
                              setPinInput(onlyDigits(e.target.value));
                            }}
                            className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-lg tracking-widest"
                            placeholder="••••"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void setOrResetPin();
                            }}
                          />
                          {pinMsg ? (
                            <div className="mt-1 text-[11px] text-rose-700">{pinMsg}</div>
                          ) : (
                            <div className="mt-1 text-[11px] text-slate-500">
                              4–8 digits. Setting this resets lockouts.
                            </div>
                          )}
                        </div>

                        <div className="flex items-end justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void loadPinStatusForMember(orgId ?? "", editing.id)}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            disabled={!orgId || pinLoading}
                          >
                            Refresh
                          </button>

                          <button
                            type="button"
                            onClick={() => void setOrResetPin()}
                            disabled={!isOwner || pinSaving || pinInput.replace(/\D+/g, "").length < 4}
                            className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {pinSaving ? "Saving…" : pinSet ? "Reset PIN" : "Set PIN"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-500">
                      Save the member first to set a PIN.
                    </div>
                  )}

                  {canInviteInEdit && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                      <div className="text-sm font-semibold text-slate-900">Login access</div>
                      <div className="mt-0.5 text-[11px] text-slate-700">
                        This staff member doesn’t currently have a linked login.
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-700">
                          Email:{" "}
                          <span className="font-semibold">
                            {cleanEmail(editing.email) ? cleanEmail(editing.email) : "Missing"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => void sendInviteForExistingMember()}
                          disabled={sendingInviteFromEdit}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {sendingInviteFromEdit ? "Sending invite…" : "Send invite"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Training areas</label>
                    <div className="flex flex-wrap gap-2">
                      {TRAINING_AREAS.map((a) => {
                        const selected = normalizeAreas(editing.training_areas).includes(a.key);
                        return (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => toggleArea(a.key)}
                            className={[
                              "rounded-full border px-3 py-1 text-xs font-medium transition",
                              pillClassSelected(selected),
                            ].join(" ")}
                            title={a.label}
                          >
                            {a.short}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Tap to toggle. This is separate from purchased courses.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Notes</label>
                    <textarea
                      className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                      value={editing.notes ?? ""}
                      onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setEditOpen(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      onClick={() => void saveMember()}
                      disabled={sendingInviteOnSave || !locationId}
                      type="button"
                    >
                      {sendingInviteOnSave ? "Sending invite…" : "Save"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {editing.id ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">Training</div>
                        <button
                          onClick={() => void loadEditCertsForMember(editing)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          type="button"
                        >
                          Refresh
                        </button>
                      </div>

                      <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="mb-2 text-xs font-semibold text-slate-800">
                          Quick assign Highfield
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {HIGHFIELD_COURSES.map((course) => (
                            <button
                              key={course.key}
                              type="button"
                              onClick={() =>
                                void quickAssignTraining(editing, course.key, course.label)
                              }
                              disabled={assigningCourseKey === course.key}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                            >
                              {assigningCourseKey === course.key
                                ? "Assigning…"
                                : course.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {editCertsLoading ? (
                        <div className="text-xs text-slate-500">Loading…</div>
                      ) : editCerts.length ? (
                        <div className="space-y-2">
                          {editCerts.map((c) => (
                            <div
                              key={c.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs font-semibold text-slate-900">
                                    {certTitle(c)}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${trainingStatusPillClass(
                                        c.status
                                      )}`}
                                    >
                                      {prettyTrainingStatus(c.status)}
                                    </span>
                                    {c.licence_state ? (
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                        Licence: {c.licence_state}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="text-[11px] font-medium text-slate-700 hover:text-slate-900"
                                    onClick={() => loadTrainingIntoForm(c)}
                                  >
                                    Edit
                                  </button>
                                  {c.certificate_url ? (
                                    <a
                                      href={c.certificate_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                                    >
                                      View →
                                    </a>
                                  ) : null}
                                </div>
                              </div>

                              <div className="mt-1 text-[11px] text-slate-600">
                                Assigned: {formatDate(c.assigned_on)} · Completed:{" "}
                                {formatDate(c.completed_on || c.awarded_on)} · Expires:{" "}
                                {formatDate(c.certificate_expiry_date || c.expires_on)}
                              </div>

                              {c.learner_email ? (
                                <div className="mt-1 text-[11px] text-slate-600">
                                  Learner: {c.learner_email}
                                </div>
                              ) : null}

                              {c.notes ? (
                                <div className="mt-1 text-[11px] text-slate-600">{c.notes}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">No training recorded.</div>
                      )}

                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium text-slate-600">
                              Provider
                            </span>
                            <select
                              className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                              value={editTrainingForm.provider}
                              onChange={(e) => {
                                const provider = e.target.value as "Highfield" | "Other";
                                setEditTrainingForm((p) => ({
                                  ...p,
                                  provider,
                                  course:
                                    provider === "Highfield" ? "Food Safety Level 2" : p.course,
                                  courseKey:
                                    provider === "Highfield" ? "food_safety_level_2" : "",
                                  providerName: provider === "Highfield" ? "" : p.providerName,
                                }));
                              }}
                            >
                              <option value="Highfield">Highfield</option>
                              <option value="Other">Other</option>
                            </select>
                          </label>

                          {editTrainingForm.provider === "Highfield" ? (
                            <label className="block">
                              <span className="mb-1 block text-[11px] font-medium text-slate-600">
                                Course
                              </span>
                              <select
                                className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                                value={editTrainingForm.courseKey}
                                onChange={(e) => {
                                  const selected = HIGHFIELD_COURSES.find(
                                    (c) => c.key === e.target.value
                                  );
                                  setEditTrainingForm((p) => ({
                                    ...p,
                                    courseKey: e.target.value,
                                    course: selected?.label ?? p.course,
                                  }));
                                }}
                              >
                                {HIGHFIELD_COURSES.map((c) => (
                                  <option key={c.key} value={c.key}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <label className="block">
                              <span className="mb-1 block text-[11px] font-medium text-slate-600">
                                Course name
                              </span>
                              <input
                                className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                                value={editTrainingForm.course}
                                onChange={(e) =>
                                  setEditTrainingForm((p) => ({ ...p, course: e.target.value }))
                                }
                                placeholder="e.g. CIEH Level 2 Food Safety"
                              />
                            </label>
                          )}
                        </div>

                        {editTrainingForm.provider === "Other" ? (
                          <input
                            className="lg:col-span-2 h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editTrainingForm.providerName}
                            onChange={(e) =>
                              setEditTrainingForm((p) => ({
                                ...p,
                                providerName: e.target.value,
                              }))
                            }
                            placeholder="Provider name"
                          />
                        ) : null}

                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-slate-600">
                            Status
                          </span>
                          <select
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editTrainingForm.status}
                            onChange={(e) => {
                              const status = e.target.value as TrainingStatus;
                              setEditTrainingForm((p) => ({
                                ...p,
                                status,
                                awarded_on:
                                  status === "completed" || status === "expired"
                                    ? p.awarded_on || todayISODate()
                                    : "",
                                expires_on:
                                  status === "completed" || status === "expired"
                                    ? p.expires_on ||
                                      (p.awarded_on
                                        ? addYearsISO(p.awarded_on, 2)
                                        : addYearsISO(todayISODate(), 2))
                                    : "",
                              }));
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
                          <span className="mb-1 block text-[11px] font-medium text-slate-600">
                            Assigned date
                          </span>
                          <input
                            type="date"
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editTrainingForm.assigned_on}
                            onChange={(e) =>
                              setEditTrainingForm((p) => ({
                                ...p,
                                assigned_on: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-600">
                            Completion date
                          </label>
                          <input
                            type="date"
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs disabled:bg-slate-50"
                            value={editTrainingForm.awarded_on}
                            disabled={
                              !(
                                editTrainingForm.status === "completed" ||
                                editTrainingForm.status === "expired"
                              )
                            }
                            onChange={(e) => {
                              const awarded = e.target.value;
                              setEditTrainingForm((p) => ({
                                ...p,
                                awarded_on: awarded,
                                expires_on: awarded ? addYearsISO(awarded, 2) : "",
                              }));
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-600">
                            Expiry date
                          </label>
                          <input
                            type="date"
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs disabled:bg-slate-50"
                            value={editTrainingForm.expires_on}
                            disabled={
                              !(
                                editTrainingForm.status === "completed" ||
                                editTrainingForm.status === "expired"
                              )
                            }
                            onChange={(e) =>
                              setEditTrainingForm((p) => ({
                                ...p,
                                expires_on: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <input
                          className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                          value={editTrainingForm.certificate_url}
                          onChange={(e) =>
                            setEditTrainingForm((p) => ({
                              ...p,
                              certificate_url: e.target.value,
                            }))
                          }
                          placeholder="Certificate URL (optional)"
                        />

                        <div>
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium text-slate-600">
                              Certificate file (PDF or photo)
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 pt-1 text-xs"
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                setEditCertFile(f);
                              }}
                            />
                            {editCertFile ? (
                              <span className="mt-1 block text-[10px] text-slate-600">
                                Selected: <span className="font-medium">{editCertFile.name}</span>
                              </span>
                            ) : (
                              <span className="mt-1 block text-[10px] text-slate-500">
                                PDF preferred.
                              </span>
                            )}
                          </label>
                        </div>

                        <input
                          className="lg:col-span-2 h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                          value={editTrainingForm.notes}
                          onChange={(e) =>
                            setEditTrainingForm((p) => ({ ...p, notes: e.target.value }))
                          }
                          placeholder="Notes (optional)"
                        />

                        <div className="lg:col-span-2 flex justify-end">
                          <button
                            onClick={() => void saveTrainingRecord()}
                            disabled={editCertSaving}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            type="button"
                          >
                            {editCertSaving ? "Saving…" : "Save training"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-500">
                      Save the member first to add training.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {viewOpen && viewFor && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={closeViewCard}>
            <div
              className="mx-auto mt-16 max-h-[calc(100dvh-6rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 text-slate-900 shadow-lg backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-900 px-4 py-3 text-white">
                <div className="text-sm opacity-80">Team member</div>
                <div className="text-xl font-semibold">{viewFor.name}</div>
                <div className="opacity-80">{viewFor.active ? "Active" : "Inactive"}</div>
              </div>

              <div className="space-y-2 p-4 text-sm">
                <div>
                  <span className="font-medium">Initials:</span>{" "}
                  {viewFor.initials ?? safeInitials(viewFor) ?? "—"}
                </div>
                <div>
                  <span className="font-medium">Role:</span> {prettyRole(viewFor.role)}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {viewFor.email ?? "—"}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {viewFor.phone ?? "—"}
                </div>
                <div>
                  <span className="font-medium">Login:</span>{" "}
                  {viewFor.user_id ? "Enabled" : viewFor.login_enabled ? "Invite pending" : "Not enabled"}
                </div>
                <div>
                  <span className="font-medium">Workstation PIN:</span>{" "}
                  {viewFor.pin_set ? "Set" : "Not set"}
                </div>
                <div>
                  <span className="font-medium">Training areas:</span>{" "}
                  {normalizeAreas(viewFor.training_areas).length
                    ? normalizeAreas(viewFor.training_areas)
                        .map((k) => TRAINING_AREAS.find((a) => a.key === k)?.label ?? k)
                        .join(", ")
                    : "—"}
                </div>
                <div>
                  <span className="font-medium">Notes:</span> {viewFor.notes ?? "—"}
                </div>

                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Absences</div>
                      <div className="mt-0.5 text-[11px] text-slate-600">
                        Open this staff member’s absence log.
                      </div>
                    </div>

                    <Link
                      href={`/team/absences?teamMemberId=${viewFor.id}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open absences
                    </Link>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">Training</div>
                    <button
                      onClick={() => void loadCertsForMember(viewFor)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      type="button"
                    >
                      Refresh
                    </button>
                  </div>

                  {certsLoading ? (
                    <div className="text-xs text-slate-500">Loading…</div>
                  ) : certs.length ? (
                    <div className="space-y-2">
                      {certs.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-slate-900">
                                {certTitle(c)}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${trainingStatusPillClass(
                                    c.status
                                  )}`}
                                >
                                  {prettyTrainingStatus(c.status)}
                                </span>
                              </div>
                            </div>

                            {c.certificate_url ? (
                              <a
                                href={c.certificate_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                              >
                                View →
                              </a>
                            ) : null}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            Assigned: {formatDate(c.assigned_on)} · Completed:{" "}
                            {formatDate(c.completed_on || c.awarded_on)} · Expires:{" "}
                            {formatDate(c.certificate_expiry_date || c.expires_on)}
                          </div>
                          {c.learner_email ? (
                            <div className="mt-1 text-[11px] text-slate-600">
                              Learner: {c.learner_email}
                            </div>
                          ) : null}
                          {c.notes ? (
                            <div className="mt-1 text-[11px] text-slate-600">{c.notes}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No courses recorded.</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 p-3">
                <button
                  onClick={() => {
                    closeViewCard();
                    void openEdit(viewFor);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  type="button"
                >
                  Edit
                </button>
                <button
                  onClick={closeViewCard}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}