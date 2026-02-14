"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type Member = {
  id: string;
  org_id?: string;
  location_id: string | null;

  user_id: string | null; // linked auth user
  login_enabled: boolean;

  initials: string | null;
  name: string;
  email: string | null;
  role: string | null;
  phone: string | null;
  active: boolean | null;
  notes?: string | null;
  training_areas?: TrainingArea[] | null;
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
  // isoDate: "YYYY-MM-DD"
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";

  const dt = new Date(Date.UTC(y, m - 1, d));
  const targetYear = dt.getUTCFullYear() + years;
  const targetMonth = dt.getUTCMonth();
  const targetDay = dt.getUTCDate();

  const candidate = new Date(Date.UTC(targetYear, targetMonth, targetDay));

  // Handle Feb 29 -> Feb 28 on non-leap years
  if (candidate.getUTCMonth() !== targetMonth) {
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0));
    return lastDay.toISOString().slice(0, 10);
  }

  return candidate.toISOString().slice(0, 10);
}


/** Global rule: render as DD/MM/YYYY */
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
      ? (c.course_key ? `Provider: ${c.course_key}` : "Provider: Other")
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

  // Add-member login toggle
  const [allowLogin, setAllowLogin] = useState<boolean>(false);
  const [sendingInviteOnSave, setSendingInviteOnSave] = useState(false);

  // Edit-modal invite button state
  const [sendingInviteFromEdit, setSendingInviteFromEdit] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewFor, setViewFor] = useState<Member | null>(null);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Current signed-in auth user (so we can link + avoid inviting yourself)
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  /* ---------- Certificates state (VIEW modal) ---------- */
  const [certsLoading, setCertsLoading] = useState(false);
  const [certs, setCerts] = useState<TrainingCert[]>([]);

  /* ---------- Certificates state (EDIT modal) ---------- */
  const [editCertsLoading, setEditCertsLoading] = useState(false);
  const [editCerts, setEditCerts] = useState<TrainingCert[]>([]);
  const [editCertForm, setEditCertForm] = useState({
    courseType: "Food Safety Level 2",
    courseTitle: "Food Safety Level 2",

    provider: "Highfield" as "Highfield" | "Other",
    providerName: "",

    awarded_on: "",
    expires_on: "",
    certificate_url: "",
    notes: "",
  });

  const [editCertFile, setEditCertFile] = useState<File | null>(null);
  const [editCertSaving, setEditCertSaving] = useState(false);

  /* -------------------- Load team + determine owner -------------------- */
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

      const userName =
        (u?.user_metadata as any)?.full_name ?? u?.email ?? "Owner";

      setAuthUserId(userId);
      setAuthEmail(userEmail);

      setOrgId(oid ?? null);
      setLocationId(lid ?? null);

      if (!oid) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Location is now part of the model. If none selected, we still show org-wide list,
      // but creation will require an active location.
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

      // Auto-create owner row for this org+location if empty
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
              user_id: (inserted as any).user_id ? String((inserted as any).user_id) : null,
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

      // ✅ Auto-link logged in user to their team_members row (prevents “No login” nonsense)
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

      // Determine owner/admin from the *current location list* (or best guess)
      let ownerFlag = false;
      if (userEmail && members.length) {
        const me = members.find((m) => m.email && m.email.toLowerCase() === userEmail);
        const role = (me?.role ?? "").toLowerCase();
        ownerFlag = role === "owner" || role === "admin";
      }

      setRows(members);
      setIsOwner(ownerFlag);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load team.");
      setRows([]);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* -------------------- Deep-link handling (?staff=...) -------------------- */
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

    router.replace("/team");
  }, [searchParams, rows, router]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 8000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  /* -------------------- Filtering -------------------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.initials, r.name, r.email, r.role]
        .filter(Boolean)
        .some((s) => (s ?? "").toLowerCase().includes(term))
    );
  }, [rows, q]);

  /* -------------------- Member CRUD -------------------- */
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
    });

    setAllowLogin(false);
    setSendingInviteOnSave(false);
    setSendingInviteFromEdit(false);

    setEditCerts([]);
    setEditCertsLoading(false);
    setEditCertSaving(false);
    setEditCertFile(null);
    setEditCertForm({
      courseType: "Food Safety Level 2",
      courseTitle: "Food Safety Level 2",
      provider: "Highfield",
      providerName: "",
      awarded_on: "",
      expires_on: "",
      certificate_url: "",
      notes: "",
    });

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

    await loadEditCertsForMember(m);

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

    // ✅ Don’t allow inviting yourself (you already exist in Auth)
    if (authEmail && emailNormalized === authEmail) {
      // try to link instead
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
      // Production hides server action errors, so give a sane hint
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

      // Adding a new member
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

  /* -------------------- Certificates / Education -------------------- */
  async function loadCertsForMember(m: Member) {
    setCerts([]);
    setCertsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trainings")
        .select("id,type,awarded_on,expires_on,certificate_url,notes,provider_name,course_key")
        .eq("team_member_id", m.id)
        .order("awarded_on", { ascending: false })
        .limit(10);

      if (error) throw error;
      setCerts((data ?? []) as TrainingCert[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load education/certificates.");
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
        .select("id,type,awarded_on,expires_on,certificate_url,notes,provider_name,course_key")
        .eq("team_member_id", m.id)
        .order("awarded_on", { ascending: false })
        .limit(10);

      if (error) throw error;
      setEditCerts((data ?? []) as TrainingCert[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load education/certificates.");
      setEditCerts([]);
    } finally {
      setEditCertsLoading(false);
    }
  }

  async function addEditCertificate() {
    if (!editing) return;
    if (!orgId) return alert("No organisation found.");

    const courseType = (editCertForm.courseType ?? "").trim();
    const courseTitle = (editCertForm.courseTitle ?? "").trim();
    if (!courseType) return alert("Course type is required.");
    if (!courseTitle) return alert("Course title is required.");

    const provider_name: "Highfield" | "Other" =
      editCertForm.provider === "Other" ? "Other" : "Highfield";

    const course_key =
      provider_name === "Other"
        ? ((editCertForm.providerName ?? "").trim() || null)
        : courseType;

    setEditCertSaving(true);

    try {
      let certificate_url: string | null =
        (editCertForm.certificate_url ?? "").trim() || null;

      if (editCertFile) {
        const up = await uploadTrainingCertificateServer({ file: editCertFile });

        if (!up?.url && !up?.path) {
          throw new Error("Certificate upload failed (no URL/path returned).");
        }

        certificate_url = up.url || certificate_url;
      }

 const awarded_on =
  (editCertForm.awarded_on ?? "").trim() || new Date().toISOString().slice(0, 10);

const expires_on_raw = (editCertForm.expires_on ?? "").trim();

const expires_on =
  expires_on_raw
    ? expires_on_raw
    : awarded_on
    ? addYearsISO(awarded_on, 2)
    : null;

      await createTrainingServer({
        teamMemberId: editing.id,
        type: courseTitle,
        course_key,
        provider_name,
        awarded_on,
        expires_on,
        certificate_url,
        notes: (editCertForm.notes ?? "").trim() || null,
      });

      setEditCertForm({
        courseType: "Food Safety Level 2",
        courseTitle: "Food Safety Level 2",
        provider: "Highfield",
        providerName: "",
        awarded_on: "",
        expires_on: "",
        certificate_url: "",
        notes: "",
      });
      setEditCertFile(null);

      await loadEditCertsForMember(editing);
    } catch (e: any) {
      alert(e?.message ?? "Failed to add education/certificate.");
    } finally {
      setEditCertSaving(false);
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

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-900">Team</h1>

        <div className="ml-auto flex min-w-0 items-center gap-2">
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

      {/* Card grid */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
          Loading…
        </div>
      ) : filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const initials = safeInitials(m) || "—";
            const roleLabel = prettyRole(m.role);
            const activeLabel = m.active ? "Active" : "Inactive";
            const areas = normalizeAreas(m.training_areas);

            const hasLinkedLogin = !!m.user_id;
            const loginLabel = hasLinkedLogin
              ? { text: "Login", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" }
              : m.login_enabled && cleanEmail(m.email)
              ? { text: "Invite pending", cls: "border-indigo-200 bg-indigo-50 text-indigo-800" }
              : { text: "No login", cls: "border-amber-200 bg-amber-50 text-amber-800" };

            return (
              <div
                key={m.id}
                className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-sm transition hover:shadow-md ${
                  highlightId === m.id
                    ? "bg-emerald-50/80 ring-1 ring-emerald-300/60 animate-pulse"
                    : ""
                }`}
              >
                {/* Header */}
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
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-slate-50 text-slate-500 border border-slate-100"
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

                {/* Training pills row */}
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
                    <span className="text-[11px] text-slate-400">No training selected</span>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-1 text-xs text-slate-800">
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

                {/* Footer */}
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

      {/* Edit / Add modal */}
      {editOpen && editing && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setEditOpen(false)}>
          <div
  className="mx-auto mt-10 w-[min(1100px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur
             max-h-[calc(100dvh-5rem)] overflow-y-auto"
  onClick={(e) => e.stopPropagation()}
>

              <div className="mb-3 flex items-center justify-between">
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

              {!locationId ? (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  No active location selected. Pick a location at the top of the app first.
                </div>
              ) : null}

              <div className="grid gap-3">
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

                {/* Add-only: Allow login */}
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
                          If enabled, we’ll send them an invite email on Save. If disabled, this is
                          a staff record only (no login).
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

                {/* ✅ Edit-only: enable login + invite button */}
                {canInviteInEdit && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                    <div className="text-sm font-semibold text-slate-900">Login access</div>
                    <div className="mt-0.5 text-[11px] text-slate-700">
                      This staff member doesn’t currently have a linked login. You can send an invite
                      so they can create a password and sign in.
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

                {/* Training areas selector */}
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
                    Tap to toggle. Each selected area is recorded as trained today and given a due date
                    in 12 months.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Notes</label>
                  <textarea
                    className="min-h-[80px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                    value={editing.notes ?? ""}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  />
                </div>

                {/* Education / Courses */}
                {editing.id ? (
                  <div className="mt-1 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">Training</div>
                      <button
                        onClick={() => void loadEditCertsForMember(editing)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        type="button"
                      >
                        Refresh
                      </button>
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
                              <div className="text-xs font-semibold text-slate-900">
                                {certTitle(c)}
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
                              Passed: {formatDate(c.awarded_on)} · Expires: {formatDate(c.expires_on)}
                            </div>
                            {c.notes ? (
                              <div className="mt-1 text-[11px] text-slate-600">{c.notes}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">No training recorded.</div>
                    )}

                    {/* Add course form */}
                    <div className="mt-3 grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-slate-600">
                            Course type
                          </span>
                          <select
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editCertForm.courseType}
                            onChange={(e) =>
                              setEditCertForm((p) => ({
                                ...p,
                                courseType: e.target.value,
                              }))
                            }
                          >
                            <option value="Food Safety Level 2">Food Safety Level 2</option>
                            <option value="Food Safety Level 1">Food Safety Level 1</option>
                            <option value="Introduction to Allergens">Introduction to Allergens</option>
                            <option value="Food Hygiene Level 2">Food Hygiene Level 2</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-slate-600">
                            Provider
                          </span>
                          <select
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editCertForm.provider}
                            onChange={(e) =>
                              setEditCertForm((p) => ({
                                ...p,
                                provider: e.target.value as any,
                              }))
                            }
                          >
                            <option value="Highfield">Highfield</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                      </div>

                      {editCertForm.provider === "Other" ? (
                        <input
                          className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                          value={editCertForm.providerName}
                          onChange={(e) =>
                            setEditCertForm((p) => ({ ...p, providerName: e.target.value }))
                          }
                          placeholder="Provider name (e.g. CIEH)"
                        />
                      ) : null}

                      <input
                        className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                        value={editCertForm.courseTitle}
                        onChange={(e) =>
                          setEditCertForm((p) => ({ ...p, courseTitle: e.target.value }))
                        }
                        placeholder="Course title (shown to inspector)"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-600">
                            Date passed
                          </label>
                          <input
                            type="date"
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editCertForm.awarded_on}
                            onChange={(e) => {
  const awarded = e.target.value;

  setEditCertForm((p) => ({
    ...p,
    awarded_on: awarded,
    // hard rule: 2 years from pass date
    expires_on: awarded ? addYearsISO(awarded, 2) : "",
  }));
}}

                            aria-label="Date passed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-600">
                            Expiry date
                          </label>
                        <input
  type="date"
  className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
  value={editCertForm.expires_on}
  readOnly
  aria-label="Expiry date"
/>

                         
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                          value={editCertForm.certificate_url}
                          onChange={(e) =>
                            setEditCertForm((p) => ({ ...p, certificate_url: e.target.value }))
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
                              className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs pt-1"
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                setEditCertFile(f);
                              }}
                            />
                            <span className="mt-1 block text-[10px] text-slate-500">
                              Upload the staff member’s training certificate (PDF preferred). Stored
                              for inspections.
                            </span>

                            {editCertFile ? (
                              <span className="mt-1 block text-[10px] text-slate-600">
                                Selected:{" "}
                                <span className="font-medium">{editCertFile.name}</span>
                              </span>
                            ) : null}
                          </label>
                        </div>
                      </div>

                      <input
                        className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                        value={editCertForm.notes}
                        onChange={(e) => setEditCertForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Notes (optional)"
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={() => void addEditCertificate()}
                          disabled={editCertSaving}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          type="button"
                        >
                          {editCertSaving ? "Saving…" : "Add training"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

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
            </div>
          </div>
        </ModalPortal>
      )}

      {/* View modal */}
      {viewOpen && viewFor && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setViewOpen(false)}>
            <div
              className="mx-auto mt-16 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 text-slate-900 shadow-lg backdrop-blur max-h-[calc(100dvh-6rem)] overflow-y-auto"
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

                {/* Education / certificates (READ ONLY) */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      Education / Courses
                    </div>
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
                            <div className="text-xs font-semibold text-slate-900">
                              {certTitle(c)}
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
                            Passed: {formatDate(c.awarded_on)} · Expires:{" "}
                            {formatDate(c.expires_on)}
                          </div>
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
                    setViewOpen(false);
                    void openEdit(viewFor);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  type="button"
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewOpen(false)}
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
