// src/app/reports/ReportsPageClient.tsx
"use client";

import React, { useMemo, useState } from "react";

/** ===== Minimal client-side types (match your local-storage shapes) ===== */
type AllergenRow = {
  item: string;
  category?: string | null;
  flags: Record<string, boolean>;
  notes?: string | null;
};

type StaffRow = {
  id: string;
  fullName: string;
  initials?: string | null;
  level?: string | null;
  expiresOn?: string | null;
};

type TrainingRow = {
  id: string;
  staffId: string;
  type: string;
  awardedOn?: string | null;
  expiresOn?: string | null;
  note?: string | null;
};

type Props = {
  brandName?: string;
  // If you already pass these in from a Server Component, great.
  // If not, the component will fall back to localStorage.
  allergens?: AllergenRow[];
  team?: StaffRow[];
  training?: TrainingRow[];
};

/** Small helpers */
function lastMonthsRange(n: number) {
  const end = new Date();
  const start = new Date();
  start.setMonth(end.getMonth() - (n - 1));
  const to = end.toISOString().slice(0, 10);
  const from = new Date(start.getFullYear(), start.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  return { start: from, end: to };
}

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Types for jspdf + autotable (light, local definition to avoid 'unknown') */
type JsPDFWithAutoTable = import("jspdf").jsPDF & {
  lastAutoTable?: { finalY: number };
};

type AutoTableOptions = {
  startY?: number;
  head?: (string | number)[][];
  body?: (string | number)[][];
  styles?: Record<string, unknown>;
  headStyles?: Record<string, unknown>;
};

export default function ReportsPageClient({
  brandName = "TempTake",
  allergens: allergensProp,
  team: teamProp,
  training: trainingProp,
}: Props) {
  // Fallback to LS if props aren’t provided
  const allergens = useMemo<AllergenRow[]>(
    () => allergensProp ?? loadLS<AllergenRow[]>("tt_allergens", []),
    [allergensProp]
  );
  const team = useMemo<StaffRow[]>(
    () => teamProp ?? loadLS<StaffRow[]>("tt_team", []),
    [teamProp]
  );
  const training = useMemo<TrainingRow[]>(
    () => trainingProp ?? loadLS<TrainingRow[]>("tt_training", []),
    [trainingProp]
  );

  // date range (defaults to last 3 months)
  const def = lastMonthsRange(3);
  const [from, setFrom] = useState(def.start);
  const [to, setTo] = useState(def.end);

  function within(date?: string | null) {
    if (!date) return false;
    return date >= from && date <= to;
  }

  async function exportPdf(rangeLabel: string) {
    // Typed imports so autoTable isn't 'unknown'
    const { jsPDF } = await import("jspdf");
    const autoTableMod = await import("jspdf-autotable");
    const autoTable =
      (autoTableMod.default as unknown) as (
        doc: JsPDFWithAutoTable,
        opts: AutoTableOptions
      ) => void;

    const doc = new jsPDF({ unit: "pt", compress: true }) as JsPDFWithAutoTable;

    // Header
    doc.setFontSize(16);
    doc.text(`${brandName} – Audit Report`, 40, 40);
    doc.setFontSize(11);
    doc.text(
      `Range: ${from} to ${to}${rangeLabel ? ` (${rangeLabel})` : ""}`,
      40,
      60
    );

    // Allergens
    doc.setFontSize(13);
    doc.text("Allergens – items & flags", 40, 90);
    const allergenBody = allergens.map((a) => [
      a.item,
      a.category ?? "",
      // simple count of YES flags:
      Object.values(a.flags).filter(Boolean).length.toString(),
      a.notes ?? "",
    ]);
    autoTable(doc, {
      startY: 100,
      head: [["Item", "Category", "YES flags", "Notes"]],
      body: allergenBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] },
    });

    // Team
    const afterAllergenY = doc.lastAutoTable?.finalY ?? 120;
    doc.setFontSize(13);
    doc.text("Team – members", 40, afterAllergenY + 24);
    const teamBody = team.map((m) => [
      m.fullName,
      m.initials ?? "",
      m.level ?? "",
      m.expiresOn ?? "",
    ]);
    autoTable(doc, {
      startY: afterAllergenY + 34,
      head: [["Name", "Initials", "Level", "Expires"]],
      body: teamBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] },
    });

    // Training (in range)
    const afterTeamY = doc.lastAutoTable?.finalY ?? afterAllergenY + 60;
    doc.setFontSize(13);
    doc.text("Training – expiring/awarded in range", 40, afterTeamY + 24);
    const trainRows = training
      .filter((t) => within(t.awardedOn) || within(t.expiresOn))
      .map((t) => {
        const who = team.find((m) => m.id === t.staffId);
        return [
          who?.fullName ?? "Unknown",
          t.type,
          t.awardedOn ?? "",
          t.expiresOn ?? "",
          t.note ?? "",
        ];
      });
    autoTable(doc, {
      startY: afterTeamY + 34,
      head: [["Staff", "Type", "Awarded", "Expires", "Note"]],
      body: trainRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] },
    });

    doc.save(`temptake-report_${from}_to_${to}.pdf`);
  }

  function quickReport() {
    const r = lastMonthsRange(3);
    setFrom(r.start);
    setTo(r.end);
    exportPdf("Quick report (last 3 months)");
  }

  function customReport() {
    exportPdf("");
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
      {/* Quick & Custom */}
      <div className="flex flex-wrap items-end gap-2">
        <button
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          onClick={quickReport}
        >
          Create inspection report (Quick – 3 months)
        </button>

        <div className="ml-auto flex items-end gap-2">
          <label className="text-sm">
            <div className="mb-1 text-gray-600">From</div>
            <input
              type="date"
              className="rounded-md border border-gray-300 px-2 py-1.5"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-gray-600">To</div>
            <input
              type="date"
              className="rounded-md border border-gray-300 px-2 py-1.5"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={customReport}
          >
            Export custom report
          </button>
        </div>
      </div>

      {/* Mini preview counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="rounded-md border p-3">
          <div className="text-xs text-gray-500">Allergen items</div>
          <div className="text-xl font-semibold">{allergens.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-gray-500">Team members</div>
          <div className="text-xl font-semibold">{team.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-gray-500">Training in range</div>
          <div className="text-xl font-semibold">
            {
              training.filter(
                (t) =>
                  (t.awardedOn && within(t.awardedOn)) ||
                  (t.expiresOn && within(t.expiresOn))
              ).length
            }
          </div>
        </div>
      </div>
    </div>
  );
}
