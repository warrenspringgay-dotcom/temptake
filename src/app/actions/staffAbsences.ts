"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";

type AbsenceStatus = "pending" | "approved" | "rejected" | "cancelled";
type AbsenceType =
  | "holiday"
  | "sickness"
  | "unpaid_leave"
  | "compassionate"
  | "medical"
  | "unauthorised"
  | "other";

type HalfDayPeriod = "am" | "pm" | null;

type CreateStaffAbsenceInput = {
  teamMemberId: string;
  locationId: string | null;
  absenceType: AbsenceType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod: HalfDayPeriod;
  notes?: string | null;
  operationalImpact?: string | null;
  status: AbsenceStatus;
};

type ListStaffAbsencesInput = {
  from?: string;
  to?: string;
  teamMemberId?: string;
  locationId?: string;
  status?: "all" | AbsenceStatus;
};

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanNullableString(value: unknown): string | null {
  const v = cleanString(value);
  return v || null;
}

function normaliseLocationFilter(value: unknown): string | undefined {
  const v = cleanString(value);
  if (!v) return undefined;

  const lowered = v.toLowerCase();
  if (lowered === "all" || lowered === "null" || lowered === "undefined") {
    return undefined;
  }

  return v;
}

function normaliseCreateLocation(value: unknown): string | null {
  const v = cleanString(value);
  if (!v) return null;

  const lowered = v.toLowerCase();
  if (
    lowered === "all" ||
    lowered === "__orgwide__" ||
    lowered === "null" ||
    lowered === "undefined"
  ) {
    return null;
  }

  return v;
}

function isValidDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function requireAuthContext() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const orgId = profile?.org_id ? String(profile.org_id) : "";
  if (!orgId) {
    throw new Error("No organisation found for this user.");
  }

  return { supabase, user, orgId };
}

async function requireManagerAccess(orgId: string, userId: string, email?: string | null) {
  const supabase = await getServerSupabase();

  let query = supabase
    .from("team_members")
    .select("id, role, email, user_id")
    .eq("org_id", orgId)
    .limit(50);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const loweredEmail = cleanString(email).toLowerCase();

  const me =
    (data ?? []).find((row: any) => row.user_id && String(row.user_id) === userId) ||
    (loweredEmail
      ? (data ?? []).find(
          (row: any) => cleanString(row.email).toLowerCase() === loweredEmail
        )
      : null);

  const role = cleanString(me?.role).toLowerCase();
  if (!["owner", "admin", "manager"].includes(role)) {
    throw new Error("You do not have permission to manage staff absences.");
  }
}

export async function listStaffAbsenceReferenceDataServer() {
  const { supabase, user, orgId } = await requireAuthContext();
  await requireManagerAccess(orgId, user.id, user.email);

  const [{ data: teamMembers, error: teamError }, { data: locations, error: locError }, { data: profile }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("id,name,initials,location_id,active")
        .eq("org_id", orgId)
        .order("name", { ascending: true }),
      supabase
        .from("locations")
        .select("id,name")
        .eq("org_id", orgId)
        .order("name", { ascending: true }),
      supabase
        .from("profiles")
        .select("active_location_id")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (teamError) throw new Error(teamError.message);
  if (locError) throw new Error(locError.message);

  return {
    teamMembers: teamMembers ?? [],
    locations: locations ?? [],
    activeLocationId: profile?.active_location_id ? String(profile.active_location_id) : null,
  };
}

export async function listStaffAbsencesServer(input: ListStaffAbsencesInput = {}) {
  const { supabase, user, orgId } = await requireAuthContext();
  await requireManagerAccess(orgId, user.id, user.email);

  const from = cleanString(input.from);
  const to = cleanString(input.to);
  const teamMemberId = cleanString(input.teamMemberId);
  const locationId = normaliseLocationFilter(input.locationId);
  const status = input.status ?? "all";

  let query = supabase
    .from("staff_absences")
    .select(`
      id,
      org_id,
      location_id,
      team_member_id,
      absence_type,
      start_date,
      end_date,
      is_half_day,
      half_day_period,
      notes,
      operational_impact,
      status,
      created_at,
      created_by,
      approved_by,
      team_members:team_member_id (
        id,
        name,
        initials
      ),
      locations:location_id (
        id,
        name
      )
    `)
    .eq("org_id", orgId)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (from && isValidDateOnly(from)) {
    query = query.gte("start_date", from);
  }

  if (to && isValidDateOnly(to)) {
    query = query.lte("end_date", to);
  }

  if (teamMemberId) {
    query = query.eq("team_member_id", teamMemberId);
  }

  if (locationId === "__orgwide__") {
    query = query.is("location_id", null);
  } else if (locationId) {
    query = query.eq("location_id", locationId);
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createStaffAbsenceServer(input: CreateStaffAbsenceInput) {
  const { supabase, user, orgId } = await requireAuthContext();
  await requireManagerAccess(orgId, user.id, user.email);

  const teamMemberId = cleanString(input.teamMemberId);
  const locationId = normaliseCreateLocation(input.locationId);
  const absenceType = cleanString(input.absenceType) as AbsenceType;
  const startDate = cleanString(input.startDate);
  const endDate = cleanString(input.endDate);
  const isHalfDay = !!input.isHalfDay;
  const halfDayPeriod = isHalfDay ? (input.halfDayPeriod ?? null) : null;
  const notes = cleanNullableString(input.notes);
  const operationalImpact = cleanNullableString(input.operationalImpact);
  const status = cleanString(input.status) as AbsenceStatus;

  if (!teamMemberId) throw new Error("Team member is required.");
  if (!isValidDateOnly(startDate)) throw new Error("Start date is invalid.");
  if (!isValidDateOnly(endDate)) throw new Error("End date is invalid.");
  if (endDate < startDate) throw new Error("End date cannot be before start date.");

  if (
    ![
      "holiday",
      "sickness",
      "unpaid_leave",
      "compassionate",
      "medical",
      "unauthorised",
      "other",
    ].includes(absenceType)
  ) {
    throw new Error("Absence type is invalid.");
  }

  if (!["pending", "approved", "rejected", "cancelled"].includes(status)) {
    throw new Error("Status is invalid.");
  }

  if (isHalfDay && halfDayPeriod !== "am" && halfDayPeriod !== "pm") {
    throw new Error("Half day period must be AM or PM.");
  }

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, org_id, location_id")
    .eq("id", teamMemberId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!member) throw new Error("Selected team member was not found in this organisation.");

  if (locationId) {
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id, org_id")
      .eq("id", locationId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (locationError) throw new Error(locationError.message);
    if (!location) throw new Error("Selected location was not found in this organisation.");
  }

  const insertPayload = {
    org_id: orgId,
    location_id: locationId,
    team_member_id: teamMemberId,
    absence_type: absenceType,
    start_date: startDate,
    end_date: endDate,
    is_half_day: isHalfDay,
    half_day_period: halfDayPeriod,
    notes,
    operational_impact: operationalImpact,
    status,
    created_by: user.id,
  };

  const { error } = await supabase.from("staff_absences").insert(insertPayload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team/absences");
  revalidatePath("/team");
}

export async function setStaffAbsenceStatusServer(
  absenceId: string,
  status: AbsenceStatus
) {
  const { supabase, user, orgId } = await requireAuthContext();
  await requireManagerAccess(orgId, user.id, user.email);

  const id = cleanString(absenceId);
  if (!id) throw new Error("Absence id is required.");

  if (!["pending", "approved", "rejected", "cancelled"].includes(status)) {
    throw new Error("Status is invalid.");
  }

  const payload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved") {
    payload.approved_by = user.id;
  }

  const { error } = await supabase
    .from("staff_absences")
    .update(payload)
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team/absences");
  revalidatePath("/team");
}

export async function deleteStaffAbsenceServer(absenceId: string) {
  const { supabase, user, orgId } = await requireAuthContext();
  await requireManagerAccess(orgId, user.id, user.email);

  const id = cleanString(absenceId);
  if (!id) throw new Error("Absence id is required.");

  const { error } = await supabase
    .from("staff_absences")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team/absences");
  revalidatePath("/team");
}