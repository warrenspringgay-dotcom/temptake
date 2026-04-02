export type DemoLocationOption = {
  id: string;
  name: string;
};

export type DemoTempSummary = {
  today: number;
  fails7d: number;
};

export type DemoUnifiedIncidentRow = {
  id: string;
  happened_on: string | null;
  created_at: string | null;
  type: string | null;
  details: string | null;
  immediate_action: string | null;
  corrective_action: string | null;
  created_by: string | null;
  source: "incident" | "temp_fail";
};

export type DemoCleaningCategoryProgress = {
  category: string;
  done: number;
  total: number;
};

export type DemoCleaningActivityRow = {
  id: string;
  time: string | null;
  category: string;
  staff: string | null;
  notes: string | null;
  task: string | null;
};

export type DemoTempLogRow = {
  id: string;
  time: string | null;
  staff: string | null;
  area: string | null;
  item: string | null;
  temp_c: number | null;
  status: string | null;
};

export type DemoSignoffRow = {
  id: string;
  signoff_on: string;
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
};

export type DemoSignoffSummary = {
  todayCount: number;
};

export type DemoStaffAbsenceRow = {
  id: string;
  start_date: string;
  end_date: string;
  created_at: string | null;
  absence_type: string;
  is_half_day: boolean;
  half_day_period: string | null;
  notes: string | null;
  operational_impact: string | null;
  status: string;
  team_member_id: string | null;
  staff: { initials: string | null; name: string | null; role: string | null } | null;
};

export type DemoAllergenChangeLogRow = {
  id: string;
  created_at: string | null;
  action: string | null;
  item_name: string | null;
  category_before: string | null;
  category_after: string | null;
  staff_initials: string | null;
};

export type DemoAllergenReviewRow = {
  id: string;
  last_reviewed: string | null;
  reviewer: string | null;
  interval_days: number;
  created_at: string | null;
};

export type DemoTrainingRow = {
  id: string;
  team_member_id: string | null;
  type: string | null;
  awarded_on: string | null;
  expires_on: string | null;
  provider_name: string | null;
  course_key: string | null;
  notes: string | null;
  created_at: string | null;
  team_member: { name: string | null; initials: string | null; location_id: string | null } | null;
};

export type DemoTeamMemberOption = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
  active: boolean | null;
  user_id: string | null;
  email?: string | null;
  training_areas?: string[] | null;
  location_id?: string | null;
};

export type DemoCalibrationCheckRow = {
  id: string;
  checked_on: string;
  staff_initials: string | null;
  all_equipment_calibrated: boolean | null;
  notes: string | null;
  created_at: string | null;
};

export type DemoDashboardData = {
  orgId: string;
  locationId: string;
  locationName: string;
  selectedDateISO: string;
  centeredDate: string;

  tempsSummary: DemoTempSummary;
  cleaningTotal: number;
  cleaningDoneTotal: number;
  incidentsToday: number;
  incidents7d: number;
  staffOffToday: number;
  staffAbsences30d: number;
  trainingExpired: number;
  trainingDueSoon: number;
  calibrationDue: boolean;

  todayTemps: DemoTempLogRow[];
  cleaningActivity: DemoCleaningActivityRow[];
  cleaningCategoryProgress: DemoCleaningCategoryProgress[];
  tempFailsToday: DemoUnifiedIncidentRow[];
  incidentsHistory: DemoUnifiedIncidentRow[];
  staffAbsences: DemoStaffAbsenceRow[];

  signoffsToday: DemoSignoffRow[];
  signoffSummary: DemoSignoffSummary;

  allergenReviews: DemoAllergenReviewRow[];
  allergenLogs: DemoAllergenChangeLogRow[];

  trainingRows: DemoTrainingRow[];
  trainingAreasRows: DemoTeamMemberOption[];

  calibrationChecks: DemoCalibrationCheckRow[];
};