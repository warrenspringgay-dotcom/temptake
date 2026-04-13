// src/components/QuickActionsFab.tsx
"use client";
import posthog from "posthog-js";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import {
  TARGET_PRESETS,
  TARGET_BY_KEY,
  type TargetPreset,
} from "@/lib/temp-constants";
import { useToast } from "@/components/ui/use-toast";
import RoutineRunModal from "@/components/RoutineRunModal";
import type { RoutineRow } from "@/components/RoutinePickerModal";
import IncidentModal from "@/components/IncidentModal";
import { useActiveLocation } from "@/hooks/useActiveLocation";

import {
  Thermometer,
  Lock,
  Unlock,
  Brush,
  Mic,
  MicOff,
  ClipboardList,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useVoiceTempEntry } from "@/lib/useVoiceTempEntry";

// ✅ Workstation operator (PIN user)
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

const DEFAULT_AREA = "Kitchen";
const PRESET_AREAS = [
  "Kitchen",
  "Prep",
  "Front counter",
  "Storage",
  "Walk-in fridge",
  "Walk-in freezer",
  "Hot hold",
  "Service area",
];

type FormState = {
  date: string;
  staff_initials: string;
  location: string;
  item: string;
  target_key: string;
  temp_c: string;
};

type LocationDayStatus = {
  isOpen: boolean;
  source: "default" | "weekly_schedule" | "closure_override";
  note: string | null;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

// ===== Cleaning helpers (aligned with FoodTempLogger) =====
const isoToday = () => new Date().toISOString().slice(0, 10);
const getDow1to7 = (ymd: string) => {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1;
};
const getDom = (ymd: string) => new Date(ymd).getDate();

function isDueOn(
  frequency: "daily" | "weekly" | "monthly",
  weekday: number | null,
  month_day: number | null,
  ymd: string
) {
  switch (frequency) {
    case "daily":
      return true;
    case "weekly":
      return weekday === getDow1to7(ymd);
    case "monthly":
      return month_day === getDom(ymd);
    default:
      return false;
  }
}

function inferStatus(
  temp: number | null,
  preset?: TargetPreset
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

/* ---------- location open/closed helpers ---------- */

async function getLocationDayStatus(
  orgId: string,
  locationId: string | null,
  dateISO: string
): Promise<LocationDayStatus> {
  if (!locationId) {
    return {
      isOpen: true,
      source: "default",
      note: null,
    };
  }

  try {
    const { data: closure, error: closureErr } = await supabase
      .from("location_closures")
      .select("id, reason")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("date", dateISO)
      .maybeSingle();

    if (!closureErr && closure) {
      return {
        isOpen: false,
        source: "closure_override",
        note: closure.reason ? String(closure.reason) : "Marked closed for today.",
      };
    }
  } catch {
    // ignore and fall through
  }

  const weekday0to6 = new Date(dateISO).getDay();
  const weekday1to7 = getDow1to7(dateISO);

  try {
    const { data: scheduleRows, error: scheduleErr } = await supabase
      .from("location_opening_days")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .in("weekday", [weekday1to7, weekday0to6]);

    if (!scheduleErr && Array.isArray(scheduleRows) && scheduleRows.length > 0) {
      const exact1to7 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday1to7
      );
      const exact0to6 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday0to6
      );
      const row = exact1to7 ?? exact0to6 ?? scheduleRows[0];

      const isOpen = row?.is_open !== false;

      let note: string | null = null;
      if (!isOpen) {
        note = "Closed by weekly opening days.";
      } else if (row?.opens_at && row?.closes_at) {
        note = `${String(row.opens_at).slice(0, 5)}–${String(row.closes_at).slice(0, 5)}`;
      }

      return {
        isOpen,
        source: "weekly_schedule",
        note,
      };
    }
  } catch {
    // ignore and fall through
  }

  return {
    isOpen: true,
    source: "default",
    note: null,
  };
}

/* ---------- temp helpers ---------- */
function isFrozenPreset(preset?: TargetPreset) {
  if (!preset) return false;

  const label = (preset.label ?? "").toLowerCase();

  if (
    typeof preset.minC === "number" &&
    typeof preset.maxC === "number" &&
    preset.minC <= 0 &&
    preset.maxC <= 0
  ) {
    return true;
  }

  if (label.includes("frozen") || label.includes("freezer")) {
    return true;
  }

  return false;
}

function normalizeTempStringForPreset(
  raw: string,
  preset?: TargetPreset
): string {
  const value = (raw ?? "").trim();
  if (!value) return "";

  if (!preset || !isFrozenPreset(preset)) return value;

  if (value === "-" || value === "." || value === "-." || value === "+") {
    return value;
  }

  const compact = value.replace(/\s+/g, "");

  if (/^[+]?\d*\.?\d+$/.test(compact)) {
    return `-${compact.replace(/^\+/, "")}`;
  }

  if (/^-\d*\.?\d+$/.test(compact)) {
    return compact;
  }

  return value;
}

function parseTempForPreset(
  raw: string,
  preset?: TargetPreset
): number | null {
  const normalized = normalizeTempStringForPreset(raw, preset).trim();
  if (!normalized) return null;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function tempPlaceholderForPreset(preset?: TargetPreset) {
  return isFrozenPreset(preset) ? "e.g. 18 = -18°C" : "e.g. 3.4";
}

/** TS-safe sort comparator */
type HasPosition = { position: number };
const byPosition = (a: HasPosition, b: HasPosition) => a.position - b.position;

async function getActiveContext(): Promise<{
  orgId: string | null;
  locationId: string | null;
}> {
  const orgId = await getActiveOrgIdClient();
  if (!orgId) return { orgId: null, locationId: null };

  const locationId = await getActiveLocationIdClient(orgId);
  return { orgId, locationId };
}

/* ===================== Daily sign-off modal + logic ===================== */

type DailySignoffRow = {
  id: string;
  org_id: string;
  location_id: string;
  signoff_on: string;
  signed_by: string | null;
  notes: string | null;
  created_at: string | null;
};

function SignoffModal({
  open,
  dateLabel,
  initials,
  notes,
  saving,
  signedAlready,
  onClose,
  onSave,
  setInitials,
  setNotes,
  operatorLocked,
}: {
  open: boolean;
  dateLabel: string;
  initials: string;
  notes: string;
  saving: boolean;
  signedAlready: boolean;
  onClose: () => void;
  onSave: () => void;
  setInitials: (v: string) => void;
  setNotes: (v: string) => void;
  operatorLocked: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close sign off modal"
      />

      <div className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl">
        <div className="bg-slate-900 px-5 py-4 text-white">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] opacity-80">
            Day sign-off
          </div>
          <div className="text-xl font-extrabold leading-tight">{dateLabel}</div>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Daily diary sign-off</div>
            <div>
              By signing, I confirm today’s food safety checks were completed and
              I have reviewed the records for this site (temps, cleaning,
              allergens and any issues). Any problems found have been recorded
              with corrective actions and notes.
            </div>
            {signedAlready ? (
              <div className="text-xs text-slate-500">
                Already signed off today. Saving again updates initials/notes.
              </div>
            ) : null}
            {operatorLocked ? (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Workstation is locked. Select an operator and enter PIN before
                signing off.
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Initials</div>
            <input
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm uppercase shadow-sm"
              placeholder="e.g. WS"
              maxLength={8}
              readOnly
            />
            <div className="mt-1 text-[11px] text-slate-500">
              Taken from workstation operator (PIN).
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">
              Notes (optional)
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="Issues, corrective actions, follow-ups..."
              maxLength={1500}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Close
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving || operatorLocked}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Sign off"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function prettyDateLabel(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const year = d.toLocaleDateString("en-GB", { year: "numeric" });
  return `${weekday} ${day} ${month} ${year}`;
}

/* ===================== Corrective action modal + logic ===================== */

type CorrectiveDraft = {
  open: boolean;
  tempLogId: string | null;
  org_id: string | null;
  location_id: string | null;
  staff_initials: string;
  area: string;
  item: string;
  target_key: string;
  temp_c: number | null;
};

function CorrectiveModal({
  open,
  saving,
  draft,
  action,
  recheckEnabled,
  recheckTemp,
  onClose,
  onSave,
  setAction,
  setRecheckEnabled,
  setRecheckTemp,
}: {
  open: boolean;
  saving: boolean;
  draft: CorrectiveDraft;
  action: string;
  recheckEnabled: boolean;
  recheckTemp: string;
  onClose: () => void;
  onSave: () => void;
  setAction: (v: string) => void;
  setRecheckEnabled: (v: boolean) => void;
  setRecheckTemp: (v: string) => void;
}) {
  if (!open) return null;

  const tempLabel =
    draft.temp_c == null || !Number.isFinite(draft.temp_c)
      ? "—"
      : `${draft.temp_c}°C`;

  const preset =
    (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[draft.target_key];
  const frozen = isFrozenPreset(preset);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close corrective action modal"
      />

      <div className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl">
        <div className="bg-slate-900 px-5 py-4 text-white">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] opacity-80">
            Corrective action
          </div>
          <div className="text-xl font-extrabold leading-tight">
            Failed temperature recorded
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-semibold text-red-900">Details</div>
            <div>
              <span className="font-semibold">Area:</span> {draft.area || "—"}
            </div>
            <div>
              <span className="font-semibold">Item:</span> {draft.item || "—"}
            </div>
            <div>
              <span className="font-semibold">Target:</span>{" "}
              {draft.target_key || "—"}
            </div>
            <div>
              <span className="font-semibold">Temp:</span> {tempLabel}
            </div>
            <div>
              <span className="font-semibold">Initials:</span>{" "}
              {draft.staff_initials || "—"}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">
              What corrective action did you take?
            </div>
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="e.g. moved food to working fridge, adjusted thermostat, discarded batch, called engineer..."
              maxLength={1500}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={recheckEnabled}
              onChange={(e) => setRecheckEnabled(e.target.checked)}
            />
            Record a re-check temperature now (optional)
          </label>

          {recheckEnabled && (
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Re-check temperature (°C)
              </div>
              <input
                value={recheckTemp}
                onChange={(e) => setRecheckTemp(e.target.value)}
                onBlur={() =>
                  setRecheckTemp(normalizeTempStringForPreset(recheckTemp, preset))
                }
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                placeholder={frozen ? "e.g. 18 = -18°C" : "e.g. 3.2"}
                inputMode="decimal"
              />
              {frozen && (
                <div className="mt-1 text-[11px] text-emerald-700">
                  Frozen item: typing 18 will save as -18°C
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Close
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving || !action.trim()}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save action"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Feedback modal (FAB) ===================== */

type FeedbackKind = "bug" | "confusing" | "idea" | "other";

function FeedbackModal({
  open,
  onClose,
  locationId,
  area,
}: {
  open: boolean;
  onClose: () => void;
  locationId: string | null;
  area: string | null;
}) {
  const { addToast } = useToast();
  const [kind, setKind] = useState<FeedbackKind>("other");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("other");
    setMessage("");
    setSaving(false);
  }, [open]);

  async function submit() {
    const text = message.trim();
    if (text.length < 3) {
      addToast({
        title: "Add a bit more detail",
        message: "Feedback needs at least 3 characters.",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) throw new Error("No organisation found.");

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Not signed in.");

      const pagePath =
        typeof window !== "undefined" ? window.location.pathname : null;

      const meta = {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        timestampClient: new Date().toISOString(),
      };

      const { error } = await supabase.from("feedback_items").insert({
        org_id: orgId,
        user_id: userId,
        location_id: locationId,
        area: area || null,
        kind,
        message: text,
        page_path: pagePath,
        meta,
      });

      if (error) throw error;

      addToast({ title: "Feedback sent", type: "success" });
      posthog.capture("feedback_sent", {
        source: "fab",
        kind,
        has_area: !!area,
        page_path: pagePath,
      });

      onClose();
    } catch (e: any) {
      addToast({
        title: "Could not send feedback",
        message: e?.message ?? "Something went wrong.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close feedback modal"
      />

      <div className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl">
        <div className="bg-slate-900 px-5 py-4 text-white">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] opacity-80">
            Feedback
          </div>
          <div className="text-xl font-extrabold leading-tight">
            Send a quick note
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="text-sm font-semibold text-slate-900">Type</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["bug", "confusing", "idea", "other"] as FeedbackKind[]).map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cls(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      kind === k
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    {k === "bug"
                      ? "Bug"
                      : k === "confusing"
                      ? "Confusing"
                      : k === "idea"
                      ? "Idea"
                      : "Other"}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Message</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="What were you trying to do?"
              maxLength={1500}
            />
            <div className="mt-2 text-[11px] text-slate-500">
              {locationId ? (
                <>
                  Location selected:{" "}
                  <span className="font-mono">{locationId.slice(0, 8)}…</span>
                </>
              ) : (
                <>No location selected</>
              )}
              {area ? (
                <>
                  {" "}
                  · Area: <span className="font-mono">{area}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Close
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={saving || message.trim().length < 3}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================= */

export default function TempFab() {
  const { addToast } = useToast();
  const router = useRouter();
  const {
    orgId: hookOrgId,
    locationId: hookLocationId,
    loading: activeLocationLoading,
  } = useActiveLocation();

  // ✅ Workstation operator (PIN user)
  const ws = useWorkstation();
  const operator = ws.operator;
  const locked = ws.locked;

  const operatorInitials = (operator?.initials ?? "")
    .toString()
    .trim()
    .toUpperCase();

  const [open, setOpen] = useState(false);
  const [entriesToday, setEntriesToday] = useState<number | null>(null);
  const [openCleaning, setOpenCleaning] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const [locations, setLocations] = useState<string[]>(PRESET_AREAS);
  const [customLocationEnabled, setCustomLocationEnabled] = useState(false);
  const [form, setForm] = useState<FormState>({
    date: isoToday(),
    staff_initials: "",
    location: DEFAULT_AREA,
    item: "",
    target_key: TARGET_PRESETS[0]?.key ?? "chill",
    temp_c: "",
  });

  // Routine picker / runner
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [pickerList, setPickerList] = useState<RoutineRow[]>([]);
  const [runRoutine, setRunRoutine] = useState<RoutineRow | null>(null);

  // local cache for active ids
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  const [todayStatus, setTodayStatus] = useState<LocationDayStatus>({
    isOpen: true,
    source: "default",
    note: null,
  });

  // Prevent overlapping cleaning refresh calls
  const cleaningRefreshInFlight = useRef(false);
  const cleaningRefreshQueued = useRef(false);

  // Sign-off state
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffSaving, setSignoffSaving] = useState(false);
  const [signoffInitials, setSignoffInitials] = useState("");
  const [signoffNotes, setSignoffNotes] = useState("");
  const [signoffExisting, setSignoffExisting] = useState<DailySignoffRow | null>(
    null
  );

  const signoffDateISO = useMemo(() => isoToday(), []);
  const signoffDateLabel = useMemo(
    () => prettyDateLabel(signoffDateISO),
    [signoffDateISO]
  );

  // Corrective action state
  const [corrective, setCorrective] = useState<CorrectiveDraft>({
    open: false,
    tempLogId: null,
    org_id: null,
    location_id: null,
    staff_initials: "",
    area: "",
    item: "",
    target_key: "",
    temp_c: null,
  });
  const [correctiveSaving, setCorrectiveSaving] = useState(false);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [correctiveRecheckEnabled, setCorrectiveRecheckEnabled] = useState(true);
  const [correctiveRecheckTemp, setCorrectiveRecheckTemp] = useState("");

  // Feedback modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Incident modal state
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentArea, setIncidentArea] = useState<string | null>(null);

  // Keep form.staff_initials synced to operator
  useEffect(() => {
    setForm((f) => ({ ...f, staff_initials: operatorInitials }));
  }, [operatorInitials]);

  const selectedPreset = useMemo(
    () =>
      (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[form.target_key],
    [form.target_key]
  );

  const dayClosed = !todayStatus.isOpen;

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0 &&
    !!operatorInitials &&
    !locked &&
    !dayClosed;

  function openWorkstationLock() {
    ws.openLockModal();
  }

  function lockWorkstationNow() {
    ws.lockNow();
  }

  function requireOperator(): boolean {
    if (locked || !operatorInitials) {
      addToast({
        title: "Workstation locked",
        message: "Select a user and enter PIN to continue.",
        type: "error",
      });

      openWorkstationLock();
      return false;
    }
    return true;
  }

  function requireOpenDay(actionLabel: string): boolean {
    if (!dayClosed) return true;

    addToast({
      title: "Location marked closed today",
      message:
        todayStatus.note ??
        `${actionLabel} is blocked because this site is marked closed today.`,
      type: "error",
    });

    return false;
  }

  async function refreshTodayStatus(force = false) {
    try {
      let orgId = activeOrgId;
      let locationId = activeLocationId;

      if (force || !orgId) {
        if (hookOrgId !== undefined) {
          orgId = hookOrgId ?? null;
          locationId = hookLocationId ?? null;
        } else {
          const ctx = await getActiveContext();
          orgId = ctx.orgId;
          locationId = ctx.locationId;
        }
      }

      if (!orgId) {
        setTodayStatus({ isOpen: true, source: "default", note: null });
        return;
      }

      if (orgId !== activeOrgId) setActiveOrgId(orgId);
      if ((locationId ?? null) !== (activeLocationId ?? null)) {
        setActiveLocationId(locationId ?? null);
      }

      const status = await getLocationDayStatus(orgId, locationId, isoToday());
      setTodayStatus(status);
    } catch {
      setTodayStatus({ isOpen: true, source: "default", note: null });
    }
  }

  async function refreshAreaSuggestions(
    orgId: string | null,
    locationId: string | null
  ) {
    if (!orgId) {
      setLocations(PRESET_AREAS);
      return;
    }

    try {
      let q = supabase
        .from("food_temp_logs")
        .select("area")
        .eq("org_id", orgId)
        .order("at", { ascending: false })
        .limit(200);

      if (locationId) q = q.eq("location_id", locationId);

      type LogRow = { area: string | null };
      const { data: logsData } = await q;

      const fromAreas: string[] = (logsData ?? [])
        .map((r: LogRow) => (r.area ?? "").toString().trim())
        .filter((s: string) => s.length > 0);

      const uniqueDynamic = Array.from(new Set(fromAreas));
      const finalAreas: string[] = Array.from(
        new Set([...PRESET_AREAS, ...uniqueDynamic])
      );

      setLocations(finalAreas);
    } catch {
      setLocations(PRESET_AREAS);
    }
  }

  function closeCorrective() {
    setCorrective((c) => ({ ...c, open: false }));
  }

  async function saveCorrective() {
    if (!corrective.tempLogId || !corrective.org_id) return;

    const action = correctiveAction.trim();
    if (!action) return;

    const preset = (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
      corrective.target_key
    ];

    const recheck_temp_c = correctiveRecheckEnabled
      ? parseTempForPreset(correctiveRecheckTemp, preset)
      : null;

    const recheck_status =
      recheck_temp_c != null ? inferStatus(recheck_temp_c, preset) : null;

    setCorrectiveSaving(true);
    try {
      const payload = {
        org_id: corrective.org_id,
        location_id: corrective.location_id,
        temp_log_id: corrective.tempLogId,
        action,
        recheck_temp_c,
        recheck_at: recheck_temp_c != null ? new Date().toISOString() : null,
        recheck_status,
        recorded_by: corrective.staff_initials
          ? corrective.staff_initials.toUpperCase()
          : null,
      };

      const { error } = await supabase
        .from("food_temp_corrective_actions")
        .insert(payload);

      if (error) throw error;

      addToast({ title: "Corrective action saved", type: "success" });
      posthog.capture("temp_corrective_saved", {
        source: "fab_quick",
        recheck: recheck_temp_c != null,
        recheck_status,
      });

      closeCorrective();
      setCorrectiveAction("");
      setCorrectiveRecheckEnabled(true);
      setCorrectiveRecheckTemp("");

      try {
        window.dispatchEvent(new Event("tt-temps-changed"));
      } catch {}
    } catch (e: any) {
      console.error(e);
      addToast({
        title: "Could not save corrective action",
        message: e?.message ?? "Something went wrong.",
        type: "error",
      });
    } finally {
      setCorrectiveSaving(false);
    }
  }

  // Voice hook
  const { supported: voiceSupported, listening, start, stop } = useVoiceTempEntry(
    {
      lang: "en-GB",
      onResult: (r) => {
        setForm((f) => {
          const nextLocation = r.location?.trim() || "";
          const nextPreset =
            (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
              f.target_key
            ];

          return {
            ...f,
            temp_c: r.temp_c
              ? normalizeTempStringForPreset(String(r.temp_c), nextPreset)
              : f.temp_c,
            item: r.item ?? f.item,
            location: nextLocation || f.location,
            staff_initials: operatorInitials || f.staff_initials,
          };
        });

        if (r.location?.trim()) {
          const nextLocation = r.location.trim();
          const isPreset = locations.some(
            (loc) => loc.toLowerCase() === nextLocation.toLowerCase()
          );
          setCustomLocationEnabled(!isPreset);
        }

        posthog.capture("temp_voice_parsed", {
          raw: r.raw,
          has_temp: !!r.temp_c,
          has_item: !!r.item,
          has_location: !!r.location,
        });
      },
      onError: (msg) => {
        addToast({ title: "Voice entry failed", message: msg, type: "error" });
      },
    }
  );

  async function refreshEntriesToday() {
    try {
      let orgId = hookOrgId ?? activeOrgId;
      let locationId = hookLocationId ?? activeLocationId;

      if (!orgId) {
        const ctx = await getActiveContext();
        orgId = ctx.orgId;
        locationId = ctx.locationId;
      }

      if (!orgId) {
        setEntriesToday(0);
        return;
      }

      const todayISO = isoToday();

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      let qFood = supabase
        .from("food_temp_logs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("at", start.toISOString())
        .lte("at", end.toISOString());

      if (locationId) qFood = qFood.eq("location_id", locationId);

      const { count: foodCount, error: foodErr } = await qFood;

      let legacyCount = 0;

      try {
        let qLegacy = supabase
          .from("temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("date", todayISO);

        if (locationId) qLegacy = qLegacy.eq("location_id", locationId);

        const { count, error } = await qLegacy;
        if (!error && count != null) legacyCount = count;
      } catch {
        try {
          let qLegacy2 = supabase
            .from("temp_logs")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .eq("logged_on", todayISO as any);

          if (locationId) qLegacy2 = qLegacy2.eq("location_id", locationId);

          const { count, error } = await qLegacy2;
          if (!error && count != null) legacyCount = count;
        } catch {
          legacyCount = 0;
        }
      }

      const total = (foodErr || foodCount == null ? 0 : foodCount) + legacyCount;
      setEntriesToday(total);
    } catch {
      setEntriesToday(0);
    }
  }

  async function refreshCleaningOpen(force = false) {
    if (cleaningRefreshInFlight.current) {
      cleaningRefreshQueued.current = true;
      return;
    }

    cleaningRefreshInFlight.current = true;

    try {
      let orgId = hookOrgId ?? activeOrgId;
      let locationId = hookLocationId ?? activeLocationId;

      if (force || !orgId || !locationId) {
        if (hookOrgId !== undefined) {
          orgId = hookOrgId ?? null;
          locationId = hookLocationId ?? null;
        } else {
          const ctx = await getActiveContext();
          orgId = ctx.orgId;
          locationId = ctx.locationId;
        }
      }

      if (!orgId || !locationId) {
        setOpenCleaning(0);
        return;
      }

      if (orgId !== activeOrgId) setActiveOrgId(orgId);
      if ((locationId ?? null) !== (activeLocationId ?? null)) {
        setActiveLocationId(locationId);
      }

      const todayISO = isoToday();

      const { data: tData, error: tErr } = await supabase
        .from("cleaning_tasks")
        .select("id, frequency, weekday, month_day, location_id")
        .eq("org_id", orgId)
        .eq("active", true)
        .or(`location_id.is.null,location_id.eq.${locationId}`);

      if (tErr || !tData) {
        setOpenCleaning(0);
        return;
      }

      type TaskRow = {
        id: string | number;
        frequency: "daily" | "weekly" | "monthly" | null;
        weekday: number | null;
        month_day: number | null;
        location_id: string | null;
      };

      const tasks: TaskRow[] = tData as TaskRow[];

      const dueToday = tasks.filter((t) =>
        isDueOn(
          (t.frequency ?? "daily") as "daily" | "weekly" | "monthly",
          t.weekday ?? null,
          t.month_day ?? null,
          todayISO
        )
      );

      if (dueToday.length === 0) {
        setOpenCleaning(0);
        return;
      }

      let doneIds = new Set<string>();

      const runsByDoneDate = await supabase
        .from("cleaning_task_runs")
        .select("task_id")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .eq("done_date", todayISO);

      if (!runsByDoneDate.error && runsByDoneDate.data) {
        doneIds = new Set<string>(
          runsByDoneDate.data.map((r: any) => String(r.task_id))
        );
      } else {
        const runsByRunOn = await supabase
          .from("cleaning_task_runs")
          .select("task_id")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("run_on", todayISO);

        if (runsByRunOn.error) {
          setOpenCleaning(0);
          return;
        }

        doneIds = new Set<string>(
          (runsByRunOn.data ?? []).map((r: any) => String(r.task_id))
        );
      }

      const openCount = dueToday.filter((t) => !doneIds.has(String(t.id))).length;
      setOpenCleaning(openCount);
    } catch {
      setOpenCleaning(0);
    } finally {
      cleaningRefreshInFlight.current = false;

      if (cleaningRefreshQueued.current) {
        cleaningRefreshQueued.current = false;
        void refreshCleaningOpen(true);
      }
    }
  }

  async function openDaySignoff() {
    setShowMenu(false);

    if (!requireOperator()) return;

    try {
      const { orgId, locationId } = await getActiveContext();

      if (!orgId || !locationId) {
        addToast({
          title: "Missing org/location",
          message: "Select a location first.",
          type: "error",
        });
        return;
      }

      const todayISO = isoToday();

      const { data, error } = await supabase
        .from("daily_signoffs")
        .select("id,org_id,location_id,signoff_on,signed_by,notes,created_at")
        .eq("org_id", String(orgId))
        .eq("location_id", String(locationId))
        .eq("signoff_on", todayISO)
        .maybeSingle();

      if (error) throw error;

      const existing = data
        ? ({
            id: String((data as any).id),
            org_id: String((data as any).org_id),
            location_id: String((data as any).location_id),
            signoff_on: String((data as any).signoff_on),
            signed_by: (data as any).signed_by
              ? String((data as any).signed_by)
              : null,
            notes: (data as any).notes ? String((data as any).notes) : null,
            created_at: (data as any).created_at
              ? String((data as any).created_at)
              : null,
          } as DailySignoffRow)
        : null;

      setSignoffExisting(existing);
      setSignoffInitials((existing?.signed_by ?? operatorInitials).toUpperCase());
      setSignoffNotes(existing?.notes ?? "");
      setSignoffOpen(true);

      posthog.capture("fab_choose_day_signoff");
    } catch (e: any) {
      console.error(e);
      addToast({
        title: "Couldn’t open sign off",
        message: e?.message ?? "Something went wrong.",
        type: "error",
      });
    }
  }

  async function saveDaySignoff() {
    if (!requireOperator()) return;

    const initialsTxt = operatorInitials;
    if (!initialsTxt) {
      addToast({
        title: "Operator required",
        message: "Select a user and enter PIN first.",
        type: "error",
      });
      openWorkstationLock();
      return;
    }

    setSignoffSaving(true);
    try {
      const { orgId, locationId } = await getActiveContext();

      if (!orgId || !locationId) throw new Error("Missing org/location");

      const todayISO = isoToday();

      const payload = {
        org_id: String(orgId),
        location_id: String(locationId),
        signoff_on: todayISO,
        signed_by: initialsTxt,
        notes: signoffNotes.trim() ? signoffNotes.trim() : null,
      };

      const { data, error } = await supabase
        .from("daily_signoffs")
        .upsert(payload, { onConflict: "org_id,location_id,signoff_on" })
        .select("id,org_id,location_id,signoff_on,signed_by,notes,created_at")
        .single();

      if (error) throw error;

      setSignoffExisting({
        id: String((data as any).id),
        org_id: String((data as any).org_id),
        location_id: String((data as any).location_id),
        signoff_on: String((data as any).signoff_on),
        signed_by: (data as any).signed_by ? String((data as any).signed_by) : null,
        notes: (data as any).notes ? String((data as any).notes) : null,
        created_at: (data as any).created_at ? String((data as any).created_at) : null,
      });

      addToast({ title: "Day signed off", type: "success" });
      setSignoffOpen(false);

      posthog.capture("day_signoff_saved", { source: "fab", date: todayISO });
    } catch (e: any) {
      console.error(e);
      addToast({
        title: "Sign off failed",
        message: e?.message ?? "Could not save sign off.",
        type: "error",
      });
    } finally {
      setSignoffSaving(false);
    }
  }

  /* --------- boot: locations + default values --------- */

  useEffect(() => {
    setForm((f) => ({
      ...f,
      date: isoToday(),
      location: DEFAULT_AREA,
    }));
    setCustomLocationEnabled(false);
  }, []);

  useEffect(() => {
    if (activeLocationLoading) return;

    const nextOrgId = hookOrgId ?? null;
    const nextLocationId = hookLocationId ?? null;

    setActiveOrgId(nextOrgId);
    setActiveLocationId(nextLocationId);

    void refreshTodayStatus(true);
    void refreshCleaningOpen(true);
    void refreshEntriesToday();
    void refreshAreaSuggestions(nextOrgId, nextLocationId);

    setForm((f) => ({
      ...f,
      location: DEFAULT_AREA,
    }));
    setCustomLocationEnabled(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocationLoading, hookOrgId, hookLocationId]);

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({
      ...f,
      date: isoToday(),
      location: DEFAULT_AREA,
    }));
    setCustomLocationEnabled(false);
  }, [open]);

  useEffect(() => {
    const onTempsChanged = () => {
      void refreshEntriesToday();
    };
    window.addEventListener("tt-temps-changed", onTempsChanged);
    return () => window.removeEventListener("tt-temps-changed", onTempsChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void refreshCleaningOpen(false);
      void refreshTodayStatus(false);
    }, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, activeLocationId, hookOrgId, hookLocationId]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshCleaningOpen(true);
        void refreshTodayStatus(true);
        void refreshEntriesToday();
      }
    };
    const onFocus = () => {
      void refreshCleaningOpen(true);
      void refreshTodayStatus(true);
      void refreshEntriesToday();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onCleaningChanged = () => {
      void refreshCleaningOpen(true);
    };
    window.addEventListener("tt-cleaning-changed", onCleaningChanged);
    return () =>
      window.removeEventListener("tt-cleaning-changed", onCleaningChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onLocationChanged = () => {
      void refreshTodayStatus(true);
      void refreshCleaningOpen(true);
      void refreshEntriesToday();
      void refreshAreaSuggestions(hookOrgId ?? activeOrgId, hookLocationId ?? activeLocationId);
    };
    window.addEventListener("tt-location-changed" as any, onLocationChanged);
    return () =>
      window.removeEventListener("tt-location-changed" as any, onLocationChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookOrgId, hookLocationId, activeOrgId, activeLocationId]);

  useEffect(() => {
    const subOrgId = hookOrgId ?? activeOrgId;
    const subLocationId = hookLocationId ?? activeLocationId;

    if (!subOrgId || !subLocationId) return;

    const channel = supabase
      .channel("food_temp_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_temp_logs",
          filter: `org_id=eq.${subOrgId}`,
        },
        (payload: any) => {
          const loc =
            (payload.new as any)?.location_id ??
            (payload.old as any)?.location_id ??
            null;
          if (loc && String(loc) !== String(subLocationId)) return;

          void refreshCleaningOpen(true);
          void refreshEntriesToday();
          void refreshAreaSuggestions(subOrgId, subLocationId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookOrgId, hookLocationId, activeOrgId, activeLocationId]);

  useEffect(() => {
    const handler = () => {
      setShowMenu(false);

      if (dayClosed) {
        addToast({
          title: "Location marked closed today",
          message:
            todayStatus.note ??
            "Quick temp logging is blocked because this site is marked closed today.",
          type: "error",
        });
        return;
      }

      setOpen(true);
      posthog.capture("temp_kpi_card_clicked");
    };

    window.addEventListener("tt-open-temp-modal", handler);
    return () => window.removeEventListener("tt-open-temp-modal", handler);
  }, [dayClosed, todayStatus.note, addToast]);

  /* --------- save entry --------- */

  async function handleSave() {
    if (!canSave) return;
    if (!requireOperator()) return;
    if (!requireOpenDay("Temperature logging")) return;

    const preset = (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
      form.target_key
    ];

    const normalizedTemp = normalizeTempStringForPreset(form.temp_c, preset);
    const tempNum = parseTempForPreset(normalizedTemp, preset);
    const status: "pass" | "fail" | null = inferStatus(tempNum, preset);

    const { orgId: org_id, locationId: location_id } = await getActiveContext();

    if (!org_id) {
      addToast({
        title: "No organisation found",
        message: "Please check your account and try again.",
        type: "error",
      });
      return;
    }

    if (!location_id) {
      addToast({
        title: "No location selected",
        message: "Pick a site/location first.",
        type: "error",
      });
      return;
    }

    const latestStatus = await getLocationDayStatus(org_id, location_id, isoToday());
    setTodayStatus(latestStatus);

    if (!latestStatus.isOpen) {
      addToast({
        title: "Location marked closed today",
        message:
          latestStatus.note ??
          "Temperature logging is blocked because this site is marked closed today.",
        type: "error",
      });
      return;
    }

    let atIso: string;
    try {
      const selectedDate = new Date(form.date);
      const now = new Date();
      const at = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      );
      atIso = at.toISOString();
    } catch {
      atIso = new Date().toISOString();
    }

    const payload: any = {
      org_id,
      location_id,
      at: atIso,
      area: form.location || null,
      note: form.item || null,
      staff_initials: operatorInitials || null,
      target_key: form.target_key || null,
      temp_c: tempNum,
      status,
    };

    const { data: inserted, error } = await supabase
      .from("food_temp_logs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      addToast({
        title: "Save failed",
        message: error.message,
        type: "error",
      });
      return;
    }

    addToast({ title: "Temperature saved", type: "success" });

    posthog.capture("temp_quick_log_saved", {
      source: "fab_quick",
      target_key: form.target_key,
      temp_c: tempNum,
      status,
    });

    setForm((f) => ({
      ...f,
      location: DEFAULT_AREA,
      item: "",
      temp_c: "",
    }));
    setCustomLocationEnabled(false);
    await refreshEntriesToday();
    await refreshAreaSuggestions(org_id, location_id);

    if (status === "fail" && inserted?.id) {
      setCorrective({
        open: true,
        tempLogId: String(inserted.id),
        org_id,
        location_id,
        staff_initials: operatorInitials,
        area: form.location || "",
        item: form.item || "",
        target_key: form.target_key || "",
        temp_c: tempNum,
      });
      setCorrectiveAction("");
      setCorrectiveRecheckEnabled(true);
      setCorrectiveRecheckTemp("");
      setOpen(false);
      setShowMenu(false);
      return;
    }

    setOpen(false);
  }

  /* --------- routines --------- */

  async function openRoutinePicker() {
    if (!requireOperator()) return;
    if (!requireOpenDay("Routine logging")) return;

    const { orgId, locationId } = await getActiveContext();
    if (orgId) {
      const latestStatus = await getLocationDayStatus(orgId, locationId, isoToday());
      setTodayStatus(latestStatus);

      if (!latestStatus.isOpen) {
        addToast({
          title: "Location marked closed today",
          message:
            latestStatus.note ??
            "Routine logging is blocked because this site is marked closed today.",
          type: "error",
        });
        return;
      }
    }

    setShowPicker(true);
    setPickerLoading(true);
    setPickerErr(null);

    try {
      const orgId = await getActiveOrgIdClient();

      let rowsAny: any[] = [];
      if (orgId) {
        const q1 = await supabase
          .from("temp_routines")
          .select("id,name,active")
          .eq("org_id", orgId)
          .order("name", { ascending: true });
        rowsAny = q1.data ?? [];

        if (rowsAny.length === 0) {
          const q2 = await supabase
            .from("temp_routines")
            .select("id,name,active")
            .eq("organisation_id", orgId)
            .order("name", { ascending: true });
          rowsAny = q2.data ?? [];
        }
      }

      if (rowsAny.length === 0) {
        const q3 = await supabase
          .from("routines")
          .select("id,name,active")
          .order("name", { ascending: true });
        rowsAny = q3.data ?? [];
      }

      const list: RoutineRow[] =
        rowsAny.map((r: any) => ({
          id: String(r.id),
          name: r.name ?? "Untitled",
          active: !!(r.active ?? true),
          items: [],
        })) || [];

      setPickerList(list);
    } catch (e: any) {
      setPickerErr(e?.message || "Failed to load routines.");
      setPickerList([]);
    } finally {
      setPickerLoading(false);
    }
  }

  async function pickRoutine(r: RoutineRow) {
    try {
      let items: any[] = [];
      const t1 = await supabase
        .from("temp_routine_items")
        .select("id,routine_id,position,location,item,target_key")
        .eq("routine_id", r.id)
        .order("position", { ascending: true });
      items = t1.data ?? [];

      if (items.length === 0) {
        const t2 = await supabase
          .from("routine_items")
          .select("id,routine_id,position,location,item,target_key")
          .eq("routine_id", r.id)
          .order("position", { ascending: true });
        items = t2.data ?? [];
      }

      const filled: RoutineRow = {
        ...r,
        items: (items ?? []).map((it: any) => ({
          id: String(it.id),
          routine_id: String(it.routine_id),
          position: Number(it.position ?? 0),
          location: it.location ?? null,
          item: it.item ?? null,
          target_key: String(it.target_key ?? "chill"),
        })),
      };

      setShowPicker(false);
      setRunRoutine({
        ...filled,
        items: filled.items.sort(byPosition),
      });
    } catch (e: any) {
      addToast({
        title: "Failed to load routine",
        message: e?.message || "Please try again.",
        type: "error",
      });
    }
  }

  /* --------- derived --------- */

  const wrapperClass =
    entriesToday !== null && entriesToday === 0 ? "no-temps-today" : "";

  const showTempWarning = entriesToday !== null && entriesToday === 0;
  const showCleaningWarning = openCleaning !== null && openCleaning > 0;
  const selectedPresetIsFrozen = isFrozenPreset(selectedPreset);

  /* --------- render --------- */

  return (
    <>
      <div className={cls(wrapperClass, "fixed bottom-6 right-4 z-40")}>
        <button
          type="button"
          onClick={() => {
            setShowMenu((v) => !v);
            posthog.capture("fab_opened");
          }}
          className="fab relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 text-3xl font-bold leading-none text-white shadow-lg shadow-emerald-500/40 transition hover:brightness-110 active:scale-[0.98]"
        >
          <span>+</span>
        </button>

        {showTempWarning && (
          <button
            type="button"
            onClick={() => {
              if (dayClosed) {
                addToast({
                  title: "Location marked closed today",
                  message:
                    todayStatus.note ??
                    "Quick temp logging is blocked because this site is marked closed today.",
                  type: "error",
                });
                return;
              }

              setShowMenu(false);
              setOpen(true);
              posthog.capture("temp_warning_orb_clicked");
            }}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md shadow-red-500/60 transition active:scale-90"
            title="No temps logged today"
          >
            <Thermometer className="h-4 w-4" />
          </button>
        )}

        {showCleaningWarning && (
          <button
            type="button"
            onClick={() => {
              router.push("/cleaning-rota");
              posthog.capture("cleaning_warning_orb_clicked");
            }}
            className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/60 transition active:scale-90"
            title={`${openCleaning ?? 0} cleaning tasks outstanding`}
          >
            <Brush className="h-4 w-4" />
          </button>
        )}
      </div>

      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="mb-24 mr-4 flex flex-col items-end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-64 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-xl shadow-emerald-500/20">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                What would you like to do?
              </div>

              {!operatorInitials || locked ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Workstation locked. Select operator + PIN to log anything.
                </div>
              ) : (
                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Operator:{" "}
                  <span className="font-semibold">{operatorInitials}</span>
                </div>
              )}

              {dayClosed && (
                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700">
                  Location marked closed today
                  {todayStatus.note ? ` · ${todayStatus.note}` : ""}
                </div>
              )}

              <div className="space-y-2">
                {locked || !operatorInitials ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      openWorkstationLock();
                      posthog.capture("fab_choose_workstation_unlock");
                    }}
                    className="w-full rounded-xl bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Unlock className="h-4 w-4" />
                      Unlock workstation / Choose operator
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      lockWorkstationNow();
                      posthog.capture("fab_choose_workstation_lock");
                    }}
                    className="w-full rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Lock className="h-4 w-4" />
                      Lock workstation
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    if (!requireOperator()) return;
                    if (!requireOpenDay("Quick temp logging")) return;
                    setOpen(true);
                    posthog.capture("fab_choose_quick_temp");
                  }}
                  disabled={dayClosed}
                  className={cls(
                    "w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-sm",
                    dayClosed
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 shadow-emerald-500/40 hover:brightness-105"
                  )}
                >
                  Quick temp log
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setShowMenu(false);
                    if (!requireOperator()) return;
                    if (!requireOpenDay("Routine logging")) return;
                    await openRoutinePicker();
                    posthog.capture("fab_choose_routine");
                  }}
                  disabled={dayClosed}
                  className={cls(
                    "w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-sm",
                    dayClosed
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-black"
                  )}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Run a routine
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openDaySignoff}
                  className="w-full rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Day sign-off
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setShowMenu(false);
                    if (!requireOperator()) return;

                    const { orgId, locationId } = await getActiveContext();

                    if (!orgId || !locationId) {
                      addToast({
                        title: "Select a location first",
                        message:
                          "You need an active site/location to log an incident.",
                        type: "error",
                      });
                      return;
                    }

                    setActiveOrgId(orgId);
                    setActiveLocationId(locationId);

                    setIncidentArea(form.location ? String(form.location) : null);
                    setIncidentOpen(true);

                    posthog.capture("fab_choose_log_incident");
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Log incident
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/wall");
                    posthog.capture("fab_choose_wall");
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/40 hover:brightness-105"
                >
                  Open wall
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setFeedbackOpen(true);
                    posthog.capture("fab_choose_feedback");
                  }}
                  className="w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Send feedback
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        locationId={hookLocationId ?? activeLocationId}
        area={form.location ? String(form.location) : null}
      />

      <IncidentModal
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        orgId={hookOrgId ?? activeOrgId ?? ""}
        locationId={hookLocationId ?? activeLocationId ?? ""}
        defaultDate={isoToday()}
        defaultInitials={operatorInitials || ""}
        defaultArea={incidentArea || form.location || null}
        onSaved={() => {
          try {
            window.dispatchEvent(new Event("tt-incidents-changed"));
          } catch {}
        }}
      />

      <SignoffModal
        open={signoffOpen}
        dateLabel={signoffDateLabel}
        initials={operatorInitials || signoffInitials}
        notes={signoffNotes}
        saving={signoffSaving}
        signedAlready={!!signoffExisting}
        onClose={() => setSignoffOpen(false)}
        onSave={saveDaySignoff}
        setInitials={setSignoffInitials}
        setNotes={setSignoffNotes}
        operatorLocked={!operatorInitials || locked}
      />

      <CorrectiveModal
        open={corrective.open}
        saving={correctiveSaving}
        draft={corrective}
        action={correctiveAction}
        recheckEnabled={correctiveRecheckEnabled}
        recheckTemp={correctiveRecheckTemp}
        onClose={closeCorrective}
        onSave={saveCorrective}
        setAction={setCorrectiveAction}
        setRecheckEnabled={setCorrectiveRecheckEnabled}
        setRecheckTemp={setCorrectiveRecheckTemp}
      />

      {showPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-xl shadow-slate-900/25"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">
                Choose a routine
              </div>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                onClick={() => setShowPicker(false)}
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {pickerLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading…
                </div>
              ) : pickerErr ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {pickerErr}
                </div>
              ) : pickerList.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No routines found.
                </div>
              ) : (
                <div className="space-y-2">
                  {pickerList.map((r) => (
                    <button
                      key={r.id ?? r.name}
                      type="button"
                      onClick={() => pickRoutine(r)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-slate-50"
                    >
                      <div className="font-semibold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.active ? "Active" : "Inactive"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-6 flex h-[72vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/30 bg-white/95 shadow-xl shadow-slate-900/25 sm:mt-24 sm:h-auto sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Quick temp log
                </div>
                <div className="text-base font-semibold text-slate-900">
                  Add a temperature
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">
                      Voice entry
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Say: “Walk-in fridge 3.4 degrees”
                    </div>
                  </div>

                  {voiceSupported ? (
                    <button
                      type="button"
                      onClick={() => (listening ? stop() : start())}
                      className={cls(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm transition",
                        listening
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-slate-900 hover:bg-black"
                      )}
                    >
                      {listening ? (
                        <>
                          <MicOff className="h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          Start
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-[11px] font-semibold text-slate-500">
                      Not supported
                    </div>
                  )}
                </div>
              </div>

              {!operatorInitials || locked ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Workstation locked. Select operator + PIN to log temperatures.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Operator:{" "}
                  <span className="font-semibold">{operatorInitials}</span>
                </div>
              )}

              {dayClosed && (
                <div className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700">
                  Location marked closed today
                  {todayStatus.note ? ` · ${todayStatus.note}` : ""}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Initials (operator)
                  </label>
                  <input
                    value={operatorInitials}
                    readOnly
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 uppercase shadow-sm"
                    placeholder="Locked"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Location / Area
                </label>
                <select
                  value={customLocationEnabled ? "__custom__" : form.location}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__custom__") {
                      setCustomLocationEnabled(true);
                      setForm((f) => ({ ...f, location: "" }));
                      return;
                    }
                    setCustomLocationEnabled(false);
                    setForm((f) => ({ ...f, location: value }));
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                >
                  {locations.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                  <option value="__custom__">Other…</option>
                </select>

                {customLocationEnabled && (
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                    placeholder="Enter custom location"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Item
                </label>
                <input
                  value={form.item}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, item: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  placeholder="e.g. Chicken curry hot hold"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Target preset
                  </label>
                  <select
                    value={form.target_key}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        target_key: e.target.value,
                        temp_c: normalizeTempStringForPreset(
                          f.temp_c,
                          (TARGET_BY_KEY as Record<
                            string,
                            TargetPreset | undefined
                          >)[e.target.value]
                        ),
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                  >
                    {TARGET_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Temperature (°C)
                  </label>
                  <input
                    value={form.temp_c}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, temp_c: e.target.value }))
                    }
                    onBlur={() =>
                      setForm((f) => ({
                        ...f,
                        temp_c: normalizeTempStringForPreset(
                          f.temp_c,
                          (TARGET_BY_KEY as Record<
                            string,
                            TargetPreset | undefined
                          >)[f.target_key]
                        ),
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
                    inputMode="decimal"
                    placeholder={tempPlaceholderForPreset(selectedPreset)}
                  />
                  {selectedPresetIsFrozen && (
                    <div className="mt-1 text-[11px] text-emerald-700">
                      Frozen preset: type 18 and it will save as -18°C
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white/90 p-4">
              <button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                className={cls(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition",
                  canSave
                    ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 hover:brightness-105"
                    : "cursor-not-allowed bg-slate-300"
                )}
              >
                {dayClosed ? "Location closed today" : "Save temperature"}
              </button>
            </div>
          </div>
        </div>
      )}

      <RoutineRunModal
        open={!!runRoutine}
        routine={runRoutine as any}
        defaultDate={isoToday()}
        defaultInitials={operatorInitials || ""}
        onClose={() => setRunRoutine(null)}
        onSaved={async () => {
          setRunRoutine(null);
          await refreshEntriesToday();
          await refreshCleaningOpen(true);
          await refreshAreaSuggestions(hookOrgId ?? activeOrgId, hookLocationId ?? activeLocationId);
          try {
            window.dispatchEvent(new Event("tt-temps-changed"));
          } catch {}
        }}
      />
    </>
  );
}