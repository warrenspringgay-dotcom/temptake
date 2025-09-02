// src/app/reports/ReportsPageInner.tsx
"use client";

import React, { useMemo, useState } from "react";

// --- Types for jsPDF + autotable (no ts-ignore)
import type { jsPDF as JsPDFClass } from "jspdf";
type JsPDFWithAutoTable = InstanceType<typeof JsPDFClass> & {
  autoTable: (opts: AutoTableOptions) => void;
  lastAutoTable?: { finalY: number };
};
type AutoTableOptions = {
  startY?: number;
  head?: string[][];
  body?: (string | number)[][];
  styles?: { fontSize?: number };
  headStyles?: { fillColor?: [number, number, number] };
};

// ---- Local demo store (replace with your data sources if needed)
type AllergenRow = {
  id: string;
  item: string;
  category?: string | null;
  notes?: string | null;
  flags: Record<string, boolean>;
};
type StaffRow = {
  id: string;
  fullName: string;
  initials: string;
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

const LS_ALLERGENS = "tt_allergens";
const LS_TEAM = "tt_team";
const LS_TRAINING = "tt_training";

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function lastMonthsRange(n: number) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - n);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export default function ReportsPageInner() {
  const brandName = "TempTake";

  const allergens = useMemo(() => load<AllergenRow>(LS_ALLERGENS), []);
  const team = useMemo(() => load<StaffRow>(LS_TEAM), []);
  const training = useMemo(() => load<TrainingRow>(LS_TRAINING), []);

  // date range
  const def = lastMonthsRange(3);
  const [from, setFrom] = useState(def.start);
  const [to, setTo] = useState(def.end);

  function within(date?: string | null) {
    if (!date) return false;
    return date >= from && date <= to;
  }

  async function exportPdf(rangeLabel: string) {
    const { jsPDF } = await import("jspdf");
    const autoTable: (doc: JsPDFWithAutoTable, opts: AutoTableOptions) => void =
      (await import("jspdf-autotable")).default as any;

    const doc = new jsPDF({ unit: "pt", compress: true }) as unknown as JsPDFWithAutoTable;

    // Header
    doc.setFontSize(16);
    doc.text(`${brandName} – Audit Report`, 40, 40);
    doc.setFontSize(11);
    doc.text(`Range: ${from} to ${to} ${rangeLabel ? `(${rangeLabel})` : ""}`, 40, 60);

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

    const teamBody = team.map((m) => [m.fullName, m.initials, m.level ?? "", m.expiresOn ?? ""]);
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
        return [who?.fullName ?? "Unknown", t.type, t.awardedOn ?? "", t.expiresOn ?? "", t.note ?? ""];
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
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reports</h1>
      </header>

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
                    (t.awardedOn && t.awardedOn >= from && t.awardedOn <= to) ||
                    (t.expiresOn && t.expiresOn >= from && t.expiresOn <= to),
                ).length
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
