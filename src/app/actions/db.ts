export type TempLogRow = {
  id: string; created_at: string;
  staff: string; location: string; item: string;
  target: string; temp_c: number; pass: boolean; notes?: string | null;
};
export type TempLogInput = Omit<TempLogRow,"id"|"created_at"|"pass"> & { temp_c: number };

export async function listTempLogs(params?: {from?: string; to?: string}): Promise<TempLogRow[]>;
export async function upsertTempLog(input: TempLogInput): Promise<{ id: string }>;
export async function deleteTempLog(id: string): Promise<void>;
export async function listStaffInitials(): Promise<string[]>;        // e.g. ["WS","AB","JK"]
export async function listTargets(): Promise<Array<{id:string; name:string; min:number; max:number}>>;
// You already have most of these wired; names match what we’ve been using.