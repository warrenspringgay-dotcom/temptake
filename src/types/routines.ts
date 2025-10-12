// src/types/routines.ts
export type RoutineItemInput = {
  position: number;
  location: string | null;
  item: string | null;
  target_key: string | null;
};

export type RoutineItem = {
  id?: string;
  position?: number;
  location?: string | null;
  item?: string | null;
  target_key?: string | null;
};

export type RoutineWithItems = {
  id: string;
  name: string;
  last_used_at: string | null;
  items: RoutineItem[];
};
