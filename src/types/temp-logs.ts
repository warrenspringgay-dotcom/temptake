// src/types/temp-logs.ts
export type TempLogRow = {
  id: string;
  org_id: string;
  created_at: string;
  date: string;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_label: string | null;
  target_min: number | null;
  target_max: number | null;
  temp_c: number | null;
  status: 'pass' | 'fail' | null;
};

export type TempLogInput = {
  date: string; // yyyy-mm-dd
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_label: string | null;
  target_min: number | null;
  target_max: number | null;
  temp_c: number | null;
};
