"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";

export type StaffAbsenceType =
  | "holiday"
  | "sickness"
  | "unpaid_leave"
  | "compassionate"
  | "medical"
  | "unauthorised"
  | "other";

export type StaffAbsenceStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type CreateStaffAbsenceInput = {
  teamMemberId: string;
  locationId?: string | null;
  absenceType: StaffAbsenceType;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "am" | "pm" | null;
  notes?: string | null;
  operationalImpact?: string | null;
  status?: StaffAbsenceStatus;
};

export type UpdateStaffAbsenceInput = {
  id: string;
  teamMemberId: string;
  locationId?: string | null;
  absenceType: StaffAbsenceType;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "am" | "pm" | null;
  notes?: string | null;
  operationalImpact?: string | null;
  status: StaffAbsenceStatus;
};

function normaliseNullableText(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function validateDates(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required.");
  }
  if (endDate < startDate) {
    throw new Error("End date cannot be before start date.");
  }
}

function validateHalfDay(
  startDate: string,
  endDate: string,
  isHalfDay?: boolean,
  halfDayPeriod?: "am" | "pm" | null
) {
  if (!isHalfDay) return;

  if (startDate !== endDate) {
    throw new Error("Half day absences must be a single date.");
  }

  if (!halfDayPeriod) {
    throw new Error("Half day period is required.");
  }
}

export async function listStaffAbsencesServer(params?: {
  from?: string;
  to?: string;
  teamMemberId?: string;
  locationId?: string;
  status?: StaffAbsenceStatus | "all";
}) {
  const supabase = await getServerSupabase();

  let query = supabase
    .from("staff_absences")
    .select(
      `
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
      linked_incident_id,
      created_by,
      approved_by,
      created_at,
      updated_at,
      team_members:team_member_id (
        id,
        name,
        initials,
        location_id
      ),
      locations:location_id (
        id,
        name
      )
    `
    )
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (params?.from) {
    query = query.gte("end_date", params.from);
  }

  if (params?.to) {
    query = query.lte("start_date", params.to);
  }

  if (params?.teamMemberId) {
    query = query.eq("team_member_id", params.teamMemberId);
  }

  if (params?.locationId) {
    query = query.eq("location_id", params.locationId);
  }

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Failed to load staff absences.");
  }

  return data ?? [];
}

export async function createStaffAbsenceServer(
  input: CreateStaffAbsenceInput
) {
  validateDates(input.startDate, input.endDate);
  validateHalfDay(
    input.startDate,
    input.endDate,
    input.isHalfDay,
    input.halfDayPeriod
  );

  const supabase = await getServerSupabase();

  const payload = {
    team_member_id: input.teamMemberId,
    location_id: input.locationId || null,
    absence_type: input.absenceType,
    start_date: input.startDate,
    end_date: input.endDate,
    is_half_day: !!input.isHalfDay,
    half_day_period: input.isHalfDay ? input.halfDayPeriod || null : null,
    notes: normaliseNullableText(input.notes),
    operational_impact: normaliseNullableText(input.operationalImpact),
    status: input.status || "approved",
  };

  const { data, error } = await supabase
    .from("staff_absences")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create absence.");
  }

  revalidatePath("/team/absences");
  revalidatePath("/team");

  return data;
}

export async function updateStaffAbsenceServer(
  input: UpdateStaffAbsenceInput
) {
  validateDates(input.startDate, input.endDate);
  validateHalfDay(
    input.startDate,
    input.endDate,
    input.isHalfDay,
    input.halfDayPeriod
  );

  const supabase = await getServerSupabase();

  const payload = {
    team_member_id: input.teamMemberId,
    location_id: input.locationId || null,
    absence_type: input.absenceType,
    start_date: input.startDate,
    end_date: input.endDate,
    is_half_day: !!input.isHalfDay,
    half_day_period: input.isHalfDay ? input.halfDayPeriod || null : null,
    notes: normaliseNullableText(input.notes),
    operational_impact: normaliseNullableText(input.operationalImpact),
    status: input.status,
  };

  const { error } = await supabase
    .from("staff_absences")
    .update(payload)
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message || "Failed to update absence.");
  }

  revalidatePath("/team/absences");
  revalidatePath("/team");
}

export async function deleteStaffAbsenceServer(id: string) {
  if (!id) {
    throw new Error("Absence id is required.");
  }

  const supabase = await getServerSupabase();

  const { error } = await supabase.from("staff_absences").delete().eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to delete absence.");
  }

  revalidatePath("/team/absences");
  revalidatePath("/team");
}

export async function setStaffAbsenceStatusServer(
  id: string,
  status: StaffAbsenceStatus
) {
  if (!id) {
    throw new Error("Absence id is required.");
  }

  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message || "Failed to resolve user.");
  }

  const { error } = await supabase
    .from("staff_absences")
    .update({
      status,
      approved_by:
        status === "approved" || status === "rejected" ? user?.id ?? null : null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to update absence status.");
  }

  revalidatePath("/team/absences");
  revalidatePath("/team");
}

export async function listStaffAbsenceReferenceDataServer() {
  const supabase = await getServerSupabase();

  const [{ data: teamMembers, error: teamError }, { data: locations, error: locationError }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("id, name, initials, location_id")
        .order("name", { ascending: true }),
      supabase
        .from("locations")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

  if (teamError) {
    throw new Error(teamError.message || "Failed to load team members.");
  }

  if (locationError) {
    throw new Error(locationError.message || "Failed to load locations.");
  }

  return {
    teamMembers: teamMembers ?? [],
    locations: locations ?? [],
  };
}