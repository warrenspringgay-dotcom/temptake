// src/components/GlobalTempEntryFab.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { TARGET_PRESETS, TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import { useToast } from "@/components/ui/use-toast";
import RoutineRunModal from "@/components/RoutineRunModal";
import type { RoutineRow } from "@/components/RoutinePickerModal";

const LS_LAST_INITIALS = "tt_last_initials";
const LS_LAST_LOCATION = "tt_last_location";

type FormState = {
  date: string;
  staff_initials: string;
  location: string;
  item: string;
  target_key: string;
  temp_c: string;
};

export default function TempFab() {
  const toastCtx = useToast() as any;
  const toast =
    typeof toastCtx === "function"
      ? toastCtx
      : typeof toastCtx?.toast === "function"
      ? toastCtx.toast
      : null;

  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false); // quick modal
  const [entriesToday, setEntriesToday] = useState<number | null>(null);

  const [initials, setInitials] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().slice(0, 10),
    staff_initials: "",
    location: "",
    item: "",
    target_key: TARGET_PRESETS[0]?.key ?? "chill",
    temp_c: "",
  });

  const canSave =
    !!form.date &&
    !!form.location &&
    !!form.item &&
    !!form.target_key &&
    form.temp_c.trim().length > 0;

  // Routine stuff
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [pickerList, setPickerList] = useState<RoutineRow[]>([]);
  const [runRoutine, setRunRoutine] = useState<RoutineRow | null>(null);

  // COUNT TODAY'S TEMPS
  async function refreshEntriesToday() {
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) return setEntriesToday(0);

      const locationId = await getActiveLocationIdClient();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      let q = supabase
        .from("food_temp_logs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("at", start.toISOString())
        .lte("at", end.toISOString());

      if (locationId) q = q.eq("location_id", locationId);

      const { count } = await q;
      setEntriesToday(count ?? 0);
    } catch {
      setEntriesToday(0);
    }
  }

  useEffect(() => {
    refreshEntriesToday();
    const interval = setInterval(refreshEntriesToday, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load initials + locations
  useEffect(() => {
    let mounted = true;

    (async () => {
      const orgId = await getActiveOrgIdClient();
      if (!orgId || !mounted) return;

      // --- team initials -------------------------------------------------
      type TeamRow = { initials: string | null };

      const { data: team } = await supabase
        .from("team_members")
        .select("initials")
        .eq("org_id", orgId);

      const ini: string[] =
        (team ?? [])
          .map((t: TeamRow) => t.initials?.toUpperCase().trim() ?? null)
          .filter((v: string | null): v is string => !!v);

      setInitials(ini);

      // --- recent areas from logs ---------------------------------------
      type LogRow = { area: string | null };

      const { data: logs } = await supabase
        .from("food_temp_logs")
        .select("area")
        .eq("org_id", orgId)
        .order("at", { ascending: false });

      const areas: string[] =
        (logs ?? [])
          .map((l: LogRow) => l.area?.trim() ?? null)
          .filter((v: string | null): v is string => !!v);

      setLocations(areas.length ? areas : ["Kitchen"]);

      // --- restore last used values -------------------------------------
      try {
        const savedIni = localStorage.getItem(LS_LAST_INITIALS);
        const savedLoc = localStorage.getItem(LS_LAST_LOCATION);

        if (savedIni) {
          setForm((f) => ({ ...f, staff_initials: savedIni }));
        }

        if (savedLoc) {
          setForm((f) => ({ ...f, location: savedLoc }));
        }
      } catch {
        // swallow localStorage drama
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Save handler (your original logic — untouched in your real file)
  async function handleSave() {
    // plug your existing handleSave logic back in here
  }

  // Routine picker (placeholder)
  async function openRoutinePicker() {
    // your original routine picker logic
  }
  async function pickRoutine(_r: RoutineRow) {
    // your original pickRoutine logic
  }

  const hasTempsToday = entriesToday !== null && entriesToday > 0;
  const noTempsToday = entriesToday === 0;

  return (
    <>
      {/* FAB */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <div className="fixed bottom-6 right-6 pointer-events-auto">
          {menuOpen && (
            <div className="mb-5 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-2 duration-300">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setOpen(true);
                }}
                className="flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 px-7 py-4 text-white font-bold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <span className="text-2xl">Quick Temp</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/wall");
                }}
                className="flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-7 py-4 text-white font-bold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <span className="text-2xl">Kitchen Wall</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full 
              text-5xl font-black text-white shadow-2xl transition-all duration-300
              ${
                noTempsToday
                  ? "bg-gradient-to-br from-red-500 via-orange-500 to-red-600 animate-pulse-slow ring-8 ring-red-400/50"
                  : "bg-gradient-to-br from-emerald-500 via-lime-400 to-emerald-600 hover:scale-110 active:scale-95"
              }`}
          >
            <span className="drop-shadow-2xl">{menuOpen ? "×" : "+"}</span>

            {hasTempsToday && (
              <div className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-600 text-xl font-bold shadow-lg animate-in zoom-in duration-500">
                {entriesToday}
              </div>
            )}

            {noTempsToday && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-75" />
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping-slow delay-500 opacity-60" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick entry modal shell (your real content goes here) */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-10 max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
          >
            {/* your existing form + save button using handleSave */}
          </div>
        </div>
      )}

      <RoutineRunModal
        open={!!runRoutine}
        routine={runRoutine}
        onClose={() => setRunRoutine(null)}
        defaultDate={form.date}
        defaultInitials={form.staff_initials}
        onSaved={() => {
          toast?.({ title: "Done!" });
          refreshEntriesToday();
        }}
      />
    </>
  );
}
