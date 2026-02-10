// src/components/TempFab.tsx
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
import RoutinePickerModal, {
  type RoutineRow,
} from "@/components/RoutinePickerModal";
import IncidentModal from "@/components/IncidentModal";

import {
  Thermometer,
  Brush,
  ClipboardList,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useVoiceTempEntry } from "@/lib/useVoiceTempEntry";

/* ------------------ constants ------------------ */

const LS_LAST_INITIALS = "tt_last_initials";
const LS_LAST_LOCATION = "tt_last_location";

const cls = (...p: Array<string | false | null | undefined>) =>
  p.filter(Boolean).join(" ");

const isoToday = () => new Date().toISOString().slice(0, 10);

/* ------------------ component ------------------ */

export default function TempFab() {
  const { addToast } = useToast();
  const router = useRouter();

  /* ---------- core state ---------- */

  const [showMenu, setShowMenu] = useState(false);
  const [openTemp, setOpenTemp] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [pickerList, setPickerList] = useState<RoutineRow[]>([]);
  const [runRoutine, setRunRoutine] = useState<RoutineRow | null>(null);

  const [incidentOpen, setIncidentOpen] = useState(false);

  /* ---------- derived helpers ---------- */

  function openTempSafely() {
    setShowMenu(false);
    setTimeout(() => setOpenTemp(true), 0);
  }

  function openRoutineSafely() {
    setShowMenu(false);
    setTimeout(() => openRoutinePicker(), 0);
  }

  function openIncidentSafely() {
    setShowMenu(false);
    setTimeout(() => setIncidentOpen(true), 0);
  }

  /* ---------- routine picker ---------- */

  async function openRoutinePicker() {
    setShowPicker(true);
    setPickerLoading(true);
    setPickerErr(null);

    try {
      const orgId = await getActiveOrgIdClient();
      let rows: any[] = [];

      if (orgId) {
        const r1 = await supabase
          .from("temp_routines")
          .select("id,name,active")
          .eq("org_id", orgId)
          .order("name");
        rows = r1.data ?? [];
      }

      if (!rows.length) {
        const r2 = await supabase
          .from("routines")
          .select("id,name,active")
          .order("name");
        rows = r2.data ?? [];
      }

      setPickerList(
        rows.map((r) => ({
          id: String(r.id),
          name: r.name ?? "Untitled",
          active: !!r.active,
          items: [],
        }))
      );
    } catch (e: any) {
      setPickerErr(e?.message ?? "Failed to load routines");
    } finally {
      setPickerLoading(false);
    }
  }

  async function pickRoutine(r: RoutineRow) {
    try {
      const { data } = await supabase
        .from("temp_routine_items")
        .select("id,routine_id,position,location,item,target_key")
        .eq("routine_id", r.id)
        .order("position");

      setShowPicker(false);
      setRunRoutine({
        ...r,
        items:
          data?.map((i: any) => ({
            id: String(i.id),
            routine_id: String(i.routine_id),
            position: Number(i.position),
            location: i.location ?? null,
            item: i.item ?? null,
            target_key: i.target_key ?? "chill",
          })) ?? [],
      });
    } catch (e: any) {
      addToast({
        title: "Failed to load routine",
        message: e?.message,
        type: "error",
      });
    }
  }

  /* ---------- render ---------- */

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-6 right-4 z-40">
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 text-3xl text-white shadow-lg"
        >
          +
        </button>
      </div>

      {/* FAB MENU */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="mb-24 mr-4 w-64 rounded-2xl bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <button
                onClick={openTempSafely}
                className="w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-white"
              >
                <Thermometer className="inline h-4 w-4 mr-2" />
                Quick temp log
              </button>

              <button
                onClick={openRoutineSafely}
                className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-white"
              >
                <ClipboardList className="inline h-4 w-4 mr-2" />
                Run routine
              </button>

              <button
                onClick={openIncidentSafely}
                className="w-full rounded-xl bg-amber-500 px-3 py-2.5 text-white"
              >
                <AlertTriangle className="inline h-4 w-4 mr-2" />
                Log incident
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  router.push("/wall");
                }}
                className="w-full rounded-xl bg-sky-500 px-3 py-2.5 text-white"
              >
                <MessageSquare className="inline h-4 w-4 mr-2" />
                Open wall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROUTINE PICKER */}
      <RoutinePickerModal
        open={showPicker}
        loading={pickerLoading}
        error={pickerErr}
        routines={pickerList}
        onPick={pickRoutine}
        onClose={() => setShowPicker(false)}
      />

      {/* ROUTINE RUN */}
      <RoutineRunModal
        open={!!runRoutine}
        routine={runRoutine as any}
        defaultDate={isoToday()}
        defaultInitials=""
        onClose={() => setRunRoutine(null)}
        onSaved={() => setRunRoutine(null)}
      />

      {/* INCIDENT */}
      <IncidentModal
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        orgId=""
        locationId=""
        defaultDate={isoToday()}
        defaultInitials=""
        defaultArea={null}
        onSaved={() => {}}
      />
    </>
  );
}
