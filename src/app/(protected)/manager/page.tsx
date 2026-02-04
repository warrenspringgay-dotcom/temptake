"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import ActionMenu from "@/components/ActionMenu";
import { inviteTeamMemberServer } from "@/app/actions/team";

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
  initials: string | null;
  name: string;
  email: string | null;
  role: string | null;
  phone: string | null;
  active: boolean | null;
  notes?: string | null;
  training_areas?: TrainingArea[] | null; // stored on team_members as text[]
};

type TrainingCert = {
  id: string;
  type: string | null;
  awarded_on: string | null;
  expires_on: string | null;
  certificate_url: string | null;
  notes: string | null;
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

/**
 * 12-month policy for pills.
 * If you want "12 months" exactly regardless of leap years,
 * we do date + 12 months (not 365 days).
 */
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

/* ================= CSV import helpers ================= */

function stripBOM(s: string) {
  return s.replace(/^\uFEFF/, "");
}

function normalizeHeader(s: string) {
  return stripBOM(String(s ?? ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 _-]/g, "");
}

function parseDateToISO(val: string): string | null {
  const raw = String(val ?? "").trim();
  if (!raw) return null;

  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // UK dd/mm/yyyy or dd-mm-yyyy
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yyyy = String(m[3]);
    return `${yyyy}-${mm}-${dd}`;
  }

  // Try Date parse
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

/**
 * Simple CSV parser that supports quoted values.
 * Not trying to win awards, just trying to not explode.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const s = stripBOM(text ?? "");
  let i = 0;

  const readCell = () => {
    let cell = "";
    let quoted = false;

    if (s[i] === '"') {
      quoted = true;
      i++;
      while (i < s.length) {
        const ch = s[i];
        if (ch === '"') {
          if (s[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          i++; // closing quote
          break;
        }
        cell += ch;
        i++;
      }
      // consume trailing spaces
      while (i < s.length && s[i] === " ") i++;
      // consume optional comma handled by caller
    } else {
      while (i < s.length) {
        const ch = s[i];
        if (ch === "," || ch === "\n" || ch === "\r") break;
        cell += ch;
        i++;
      }
    }

    return quoted ? cell : cell.trim();
  };

  while (i < s.length) {
    const row: string[] = [];
    // skip empty newlines
    while (i < s.length && (s[i] === "\n" || s[i] === "\r")) i++;
    if (i >= s.length) break;

    while (i < s.length) {
      const cell = readCell();
      row.push(cell);

      if (s[i] === ",") {
        i++;
        continue;
      }

      // end of line
      if (s[i] === "\r") i++;
      if (s[i] === "\n") i++;
      break;
    }

    // ignore totally empty rows
    if (row.some((c) => String(c ?? "").trim() !== "")) rows.push(row);
  }

  return rows;
}

type ImportRow = {
  email: string;
  course: string;
  awarded_on: string | null;
  expires_on: string | null;
  certificate_url: string | null;
  notes: string | null;
};

function mapCSVToImportRows(csvText: string): { rows: ImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const grid = parseCSV(csvText);

  if (grid.length < 2) {
    return { rows: [], errors: ["CSV needs a header row and at least one data row."] };
  }

  const header = grid[0]!.map(normalizeHeader);

  // flexible header mapping
  const idx = (keys: string[]) => header.findIndex((h) => keys.includes(h));

  const emailIdx = idx(["email", "email address", "learner email", "learner_email"]);
  const courseIdx = idx(["course", "course title", "course_name", "title", "learning", "programme"]);
  const awardedIdx = idx(["completed", "completed on", "completion date", "completed_on", "passed", "date passed", "awarded on", "awarded_on"]);
  const expiresIdx = idx(["expires", "expiry", "expiry date", "expires_on", "expiration", "certificate expiry", "cert expiry"]);
  const certUrlIdx = idx(["certificate", "certificate url", "certificate_url", "certificate link", "cert url", "pdf"]);

  if (emailIdx === -1) errors.push("Missing email column. Expected header like: Email / Email address / Learner email.");
  if (courseIdx === -1) errors.push("Missing course column. Expected header like: Course / Course title / Title.");
  if (errors.length) return { rows: [], errors };

  const out: ImportRow[] = [];

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const email = String(row[emailIdx] ?? "").trim().toLowerCase();
    const course = String(row[courseIdx] ?? "").trim();

    if (!email || !course) continue;

    const awardedRaw = awardedIdx !== -1 ? String(row[awardedIdx] ?? "").trim() : "";
    const expiresRaw = expiresIdx !== -1 ? String(row[expiresIdx] ?? "").trim() : "";
    const certUrlRaw = certUrlIdx !== -1 ? String(row[certUrlIdx] ?? "").trim() : "";

    const awarded_on = parseDateToISO(awardedRaw);
    const expires_on = parseDateToISO(expiresRaw);

    out.push({
      email,
      course,
      awarded_on,
      expires_on,
      certificate_url: certUrlRaw || null,
      notes: "Imported from Highfield LMS",
    });
  }

  if (!out.length) errors.push("No usable rows found. Check the headers and data.");
  return { rows: out, errors };
}

/* ================================================= */
export default function TeamManager() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [q, setQ] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewFor, setViewFor] = useState<Member | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "staff",
  });
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  /* ---------- Certificates state (VIEW modal) ---------- */
  const [certsLoading, setCertsLoading] = useState(false);
  const [certs, setCerts] = useState<TrainingCert[]>([]);

  /* ---------- Certificates state (EDIT modal) ---------- */
  const [editCertsLoading, setEditCertsLoading] = useState(false);
  const [editCerts, setEditCerts] = useState<TrainingCert[]>([]);
  const [editCertForm, setEditCertForm] = useState({
    type: "Food Hygiene Level 2",
    awarded_on: "",
    expires_on: "",
    certificate_url: "",
    notes: "",
  });
  const [editCertSaving, setEditCertSaving] = useState(false);

  /* ---------- CSV import (Highfield) ---------- */
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importMissingEmails, setImportMissingEmails] = useState<string[]>([]);

  /* -------------------- Load team + determine owner -------------------- */
  async function load() {
    setLoading(true);
    setIsOwner(false);

    try {
      const [id, userRes] = await Promise.all([
        getActiveOrgIdClient(),
        supabase.auth.getUser(),
      ]);

      const userEmail = userRes.data.user?.email?.toLowerCase() ?? null;
      const userName =
        (userRes.data.user?.user_metadata as any)?.full_name ??
        userRes.data.user?.email ??
        "Owner";

      setOrgId(id ?? null);

      if (!id) {
        setRows([]);
        setLoading(false);
        return;
      }

      let members: Member[] = [];
      let ownerFlag = false;

      const { data, error } = await supabase
        .from("team_members")
        .select("id, initials, name, email, role, phone, active, notes, training_areas")
        .eq("org_id", id)
        .order("name", { ascending: true });

      if (error) throw error;

      members = (data ?? []).map((m: any) => ({
        ...m,
        training_areas: normalizeAreas(m.training_areas),
      })) as Member[];

      // Auto-create owner row if empty
      if (members.length === 0 && id && userEmail) {
        const { data: inserted, error: insErr } = await supabase
          .from("team_members")
          .insert({
            org_id: id,
            initials: null,
            name: userName,
            email: userEmail,
            role: "owner",
            phone: null,
            notes: null,
            active: true,
            training_areas: [],
          })
          .select("id, initials, name, email, role, phone, active, notes, training_areas")
          .maybeSingle();

        if (!insErr && inserted) {
          members = [
            {
              ...(inserted as any),
              training_areas: normalizeAreas((inserted as any).training_areas),
            },
          ];
          ownerFlag = true;
        }
      }

      if (!ownerFlag && userEmail && members.length) {
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
      initials: "",
      name: "",
      email: "",
      role: "staff",
      phone: "",
      active: true,
      notes: "",
      training_areas: [],
    });
    // reset edit-education state
    setEditCerts([]);
    setEditCertsLoading(false);
    setEditCertSaving(false);
    setEditCertForm({
      type: "Food Hygiene Level 2",
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
      training_areas: normalizeAreas(m.training_areas),
    });

    // Load education into EDIT modal
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

  /**
   * Keep pills in team_members AND also track due date per pill in team_training_area_status
   * due_on = today + 12 months.
   */
  async function syncTrainingTracking(memberId: string, selectedAreas: TrainingArea[]) {
    if (!orgId) return;

    const trained_on = todayISODate();
    const due_on = addMonthsISODate(12);

    // Upsert selected
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

    // Delete unselected
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

  async function saveMember() {
    if (!editing) return;
    try {
      if (!orgId) return alert("No organisation found.");
      if (!editing.name.trim()) return alert("Name is required.");

      const roleValue = (editing.role ?? "").trim().toLowerCase() || "staff";
      const trainingAreas = normalizeAreas(editing.training_areas);

      if (editing.id) {
        const updatePayload: any = {
          initials: editing.initials?.trim() || null,
          name: editing.name.trim(),
          email: editing.email?.trim() || null,
          phone: editing.phone?.trim() || null,
          notes: editing.notes?.trim() || null,
          active: editing.active ?? true,
          training_areas: trainingAreas,
        };

        if (isOwner) {
          updatePayload.role = roleValue;
        }

        const { error } = await supabase
          .from("team_members")
          .update(updatePayload)
          .eq("id", editing.id)
          .eq("org_id", orgId);
        if (error) throw error;

        await syncTrainingTracking(editing.id, trainingAreas);
      } else {
        if (!isOwner) {
          alert("Only the owner can add team members.");
          return;
        }

        const { data: inserted, error } = await supabase
          .from("team_members")
          .insert({
            org_id: orgId,
            initials: editing.initials?.trim() || null,
            name: editing.name.trim(),
            email: editing.email?.trim() || null,
            role: roleValue,
            phone: editing.phone?.trim() || null,
            notes: editing.notes?.trim() || null,
            active: true,
            training_areas: trainingAreas,
          })
          .select("id")
          .single();

        if (error) throw error;

        if (inserted?.id) {
          await syncTrainingTracking(inserted.id, trainingAreas);
        }
      }

      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Save failed.");
    }
  }

  async function remove(id: string) {
    if (!isOwner) {
      alert("Only the owner can delete team members.");
      return;
    }
    if (!confirm("Delete this team member?")) return;
    try {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Delete failed.");
    }
  }

  /* -------------------- Certificates / Education (team_members-based) -------------------- */
  async function loadCertsForMember(m: Member) {
    setCerts([]);
    setCertsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trainings")
        .select("id,type,awarded_on,expires_on,certificate_url,notes")
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
        .select("id,type,awarded_on,expires_on,certificate_url,notes")
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

    const type = (editCertForm.type ?? "").trim();
    if (!type) return alert("Course type is required.");

    setEditCertSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const created_by = auth.user?.id ?? null;

      const { error } = await supabase.from("trainings").insert({
        org_id: orgId,
        team_member_id: editing.id,
        type,
        awarded_on: editCertForm.awarded_on || null,
        expires_on: editCertForm.expires_on || null,
        certificate_url: editCertForm.certificate_url || null,
        notes: editCertForm.notes || null,
        created_by,
      });

      if (error) throw error;

      setEditCertForm({
        type: "Food Hygiene Level 2",
        awarded_on: "",
        expires_on: "",
        certificate_url: "",
        notes: "",
      });

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

  /* -------------------- Invite flow -------------------- */
  function openInvite() {
    setInviteForm({ email: "", role: "staff" });
    setInviteError(null);
    setInviteInfo(null);
    setInviteOpen(true);
  }

  async function sendInvite() {
    setInviteError(null);
    setInviteInfo(null);

    const cleanEmail = inviteForm.email.trim().toLowerCase();
    const role = (inviteForm.role.trim() || "staff").toLowerCase();

    if (!cleanEmail) {
      setInviteError("Enter an email to invite.");
      return;
    }

    try {
      setInviteSending(true);

      const res = await inviteTeamMemberServer({
        email: cleanEmail,
        role,
      });

      if (!res.ok) {
        setInviteError(res.message ?? "Failed to send invite.");
      } else {
        setInviteInfo("Invite sent. They’ll get an email to set their password and log in.");
        await load();
      }
    } catch (e: any) {
      setInviteError(e?.message ?? "Failed to send invite.");
    } finally {
      setInviteSending(false);
    }
  }

  /* -------------------- Highfield CSV Import -------------------- */
  function openImport() {
    if (!isOwner) {
      alert("Only the owner/admin can import training records.");
      return;
    }
    setImportError(null);
    setImportInfo(null);
    setImportText("");
    setImportPreview([]);
    setImportMissingEmails([]);
    setImportOpen(true);
  }

  function updatePreview(text: string) {
    setImportText(text);
    setImportError(null);
    setImportInfo(null);

    if (!text.trim()) {
      setImportPreview([]);
      setImportMissingEmails([]);
      return;
    }

    const mapped = mapCSVToImportRows(text);
    if (mapped.errors.length) {
      setImportPreview([]);
      setImportMissingEmails([]);
      setImportError(mapped.errors.join(" "));
      return;
    }

    const preview = mapped.rows.slice(0, 50);
    setImportPreview(preview);

    const known = new Set(
      rows
        .map((m) => (m.email ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    const missing = Array.from(
      new Set(preview.map((r) => r.email).filter((e) => e && !known.has(e)))
    );
    setImportMissingEmails(missing);
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    updatePreview(text);
  }

  async function upsertTrainingRow(
    org_id: string,
    team_member_id: string,
    type: string,
    awarded_on: string | null,
    expires_on: string | null,
    certificate_url: string | null,
    notes: string | null
  ) {
    // Try to find an existing record for same course+awarded_on
    const { data: existing, error: selErr } = await supabase
      .from("trainings")
      .select("id")
      .eq("org_id", org_id)
      .eq("team_member_id", team_member_id)
      .eq("type", type)
      .eq("awarded_on", awarded_on)
      .maybeSingle();

    if (selErr) throw selErr;

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("trainings")
        .update({
          expires_on,
          certificate_url,
          notes,
        })
        .eq("id", existing.id)
        .eq("org_id", org_id);

      if (upErr) throw upErr;
      return "updated";
    }

    const { error: insErr } = await supabase.from("trainings").insert({
      org_id,
      team_member_id,
      type,
      awarded_on,
      expires_on,
      certificate_url,
      notes,
    });

    if (insErr) throw insErr;
    return "inserted";
  }

  async function runImport() {
    if (!orgId) return alert("No organisation found.");
    if (!isOwner) return alert("Only the owner/admin can import training records.");
    if (!importText.trim()) return alert("Paste CSV or upload a CSV file.");

    setImportBusy(true);
    setImportError(null);
    setImportInfo(null);

    try {
      const mapped = mapCSVToImportRows(importText);
      if (mapped.errors.length) {
        setImportError(mapped.errors.join(" "));
        return;
      }

      // Build email->member map
      const memberByEmail = new Map<string, Member>();
      for (const m of rows) {
        const em = (m.email ?? "").trim().toLowerCase();
        if (em) memberByEmail.set(em, m);
      }

      const missing: string[] = [];
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      // Chunking to avoid hammering
      const allRows = mapped.rows;

      for (let i = 0; i < allRows.length; i++) {
        const r = allRows[i]!;
        const m = memberByEmail.get(r.email);
        if (!m) {
          missing.push(r.email);
          skipped++;
          continue;
        }

        const type = r.course.trim();
        const awarded_on = r.awarded_on;
        const expires_on = r.expires_on;
        const certificate_url = r.certificate_url;
        const notes = r.notes;

        const res = await upsertTrainingRow(
          orgId,
          m.id,
          type,
          awarded_on,
          expires_on,
          certificate_url,
          notes
        );

        if (res === "inserted") inserted++;
        else updated++;
      }

      setImportMissingEmails(Array.from(new Set(missing)));

      setImportInfo(
        `Import complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped (no matching team member email).`
      );

      // Refresh any open card lists
      if (viewFor) await loadCertsForMember(viewFor);
      if (editing?.id) await loadEditCertsForMember(editing);

    } catch (e: any) {
      setImportError(e?.message ?? "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

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
            <>
              <button
                onClick={openImport}
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                title="Import Highfield LMS training CSV"
              >
                Import training CSV
              </button>

              <button
                onClick={openInvite}
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Invite by email
              </button>
              <button
                onClick={openAdd}
                className="whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                + Add member
              </button>
            </>
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
                    Edit training
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

      {/* ================= Highfield CSV Import modal ================= */}
      {importOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setImportOpen(false)}>
            <div
              className="mx-auto mt-12 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur max-h-[calc(100dvh-6rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">Import training CSV</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Export from Highfield LMS reports, then paste/upload here. Matching is by team member email.
                  </div>
                </div>
                <button
                  onClick={() => setImportOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                    />
                    Upload CSV
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setImportText("");
                      setImportPreview([]);
                      setImportMissingEmails([]);
                      setImportError(null);
                      setImportInfo(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>

                  <div className="ml-auto text-xs text-slate-500">
                    Expected headers: <span className="font-medium">Email</span>,{" "}
                    <span className="font-medium">Course</span>,{" "}
                    <span className="font-medium">Completed</span>,{" "}
                    <span className="font-medium">Expiry</span>,{" "}
                    <span className="font-medium">Certificate URL</span>
                  </div>
                </div>

                <textarea
                  className="min-h-[180px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-xs font-mono"
                  placeholder="Paste CSV here…"
                  value={importText}
                  onChange={(e) => updatePreview(e.target.value)}
                />

                {importError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {importError}
                  </div>
                )}

                {importInfo && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    {importInfo}
                  </div>
                )}

                {!!importMissingEmails.length && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <div className="font-semibold">Skipped (no matching team member email):</div>
                    <div className="mt-1 text-xs">
                      {importMissingEmails.slice(0, 12).join(", ")}
                      {importMissingEmails.length > 12 ? ` (+${importMissingEmails.length - 12} more)` : ""}
                    </div>
                    <div className="mt-1 text-[11px] text-amber-900/80">
                      Fix: add these emails to Team members first (or correct the emails in the CSV), then re-import.
                    </div>
                  </div>
                )}

                {importPreview.length ? (
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold">Preview (first {Math.min(50, importPreview.length)} rows)</div>
                      <div className="text-xs text-slate-500">We’ll upsert into trainings</div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr className="text-left">
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Course</th>
                            <th className="px-3 py-2">Awarded</th>
                            <th className="px-3 py-2">Expires</th>
                            <th className="px-3 py-2">Cert</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((r, idx) => (
                            <tr key={`${r.email}_${idx}`} className="border-t border-slate-100 text-slate-800">
                              <td className="px-3 py-2 whitespace-nowrap">{r.email}</td>
                              <td className="px-3 py-2">{r.course}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.awarded_on)}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.expires_on)}</td>
                              <td className="px-3 py-2">
                                {r.certificate_url ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium">
                                    link
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImportOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    disabled={importBusy}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void runImport()}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={importBusy}
                  >
                    {importBusy ? "Importing…" : "Run import"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Edit / Add modal */}
      {editOpen && editing && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setEditOpen(false)}>
            <div
              className="mx-auto mt-16 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur max-h-[calc(100dvh-6rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold">{editing.id ? "Edit member" : "Add member"}</div>
                <button onClick={() => setEditOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                  ✕
                </button>
              </div>

              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Initials</label>
                    <input
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                      value={editing.initials ?? ""}
                      onChange={(e) => setEditing({ ...editing, initials: e.target.value })}
                    />
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Email</label>
                    <input
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                      value={editing.email ?? ""}
                      onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    />
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
                    Tap to toggle. Each selected area is recorded as trained today and given a due date in 12 months.
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

                {/* Education moved HERE (Edit modal) */}
                {editing.id ? (
                  <div className="mt-1 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">Education / Courses</div>
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
                                {c.type ?? "—"}
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
                              Awarded: {formatDate(c.awarded_on)} · Expires: {formatDate(c.expires_on)}
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

                    {/* Add course form */}
                    <div className="mt-3 grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                          value={editCertForm.type}
                          onChange={(e) => setEditCertForm((p) => ({ ...p, type: e.target.value }))}
                          placeholder="Type (e.g. Food Hygiene Level 2)"
                        />
                        <input
                          className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                          value={editCertForm.certificate_url}
                          onChange={(e) =>
                            setEditCertForm((p) => ({ ...p, certificate_url: e.target.value }))
                          }
                          placeholder="Certificate URL (optional)"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-600">
                            Date passed
                          </label>
                          <input
                            type="date"
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editCertForm.awarded_on}
                            onChange={(e) =>
                              setEditCertForm((p) => ({ ...p, awarded_on: e.target.value }))
                            }
                            aria-label="Date passed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-600">
                            Date expired
                          </label>
                          <input
                            type="date"
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-xs"
                            value={editCertForm.expires_on}
                            onChange={(e) =>
                              setEditCertForm((p) => ({ ...p, expires_on: e.target.value }))
                            }
                            aria-label="Date expired"
                          />
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
                          {editCertSaving ? "Saving…" : "Add education"}
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
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    onClick={() => void saveMember()}
                    type="button"
                  >
                    Save
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
                    <div className="text-sm font-semibold text-slate-900">Education / Courses</div>
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
                              {c.type ?? "—"}
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
                            Awarded: {formatDate(c.awarded_on)} · Expires: {formatDate(c.expires_on)}
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

      {/* Invite modal */}
      {inviteOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setInviteOpen(false)}>
            <div
              className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur max-h-[calc(100dvh-6rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold">Invite team member</div>
                <button onClick={() => setInviteOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Email</label>
                  <input
                    type="email"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    placeholder="team@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Role</label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <p className="text-xs text-slate-500">
                  We’ll add them to this business and send a sign-in link.
                </p>

                {inviteError && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {inviteError}
                  </div>
                )}
                {inviteInfo && (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    {inviteInfo}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setInviteOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={inviteSending}
                    onClick={() => void sendInvite()}
                  >
                    {inviteSending ? "Sending…" : "Send invite"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
