"use client";

import React, { useMemo, useState } from "react";
import NavTabs from "@/components/NavTabs";

// ---- Local storage keys we read
const LS_ALLERGENS = "tt_allergens_rows_v3";
const LS_TEAM = "tt_team_v2";
const LS_TRAINING = "tt_training_v1";

// ---- Local data types
type AllergenRow = {
  id: string;
  item: string;
  category?: string;
  flags: Record<string, boolean>;
  notes?: string;
  locked: boolean;
};
type StaffRow = {
  id: string;
  fullName: string;
  initials: string;
  email?: string;
  phone?: string;
  level?: string;
  awardedOn?: string;
  expiresOn?: string;
};
type TrainingRow = {
  id: string;
  staffId: string;
  type: string;
  awardedOn?: string;
  expiresOn?: string;
  note?: string;
};

// ---- Helpers
function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]") as T[]; }
  catch { return []; }
}
function lastMonthsRange(months = 3) {
  const end = new Date();
  const start = new Date();
  start.setMonth(end.getMonth() - months);
  const toISO = (d: Date) => d.toISOString().slice(0,10);
  return { start: toISO(start), end: toISO(end) };
}

// ---- Minimal types for jsPDF + autotable so we avoid // @ts-expect-error
type AutoTableOptions = {
  startY?: number;
  head?: (string | number)[][];
  body?: (string | number)[][];
  styles?: Record<string, unknown>;
  headStyles?: Record<string, unknown>;
};
type JsPDFWithAutoTable = {
  // core
  setFontSize(n: number): void;
  text(txt: string, x: number, y: number): void;
  save(name: string): void;
  // plugin hooks (added at runtime by jspdf-autotable)
  autoTable: (opts: AutoTableOptions) => void;
  lastAutoTable?: { finalY: number };
};

export default function ReportsPage() {
  const [brandName] = useState("TempTake");

  const allergens = useMemo(() => load<AllergenRow>(LS_ALLERGENS), []);
  const team = useMemo(() => load<StaffRow>(LS_TEAM), []);
  const training = useMemo(() => load<TrainingRow>(LS_TRAINING), []);

  // date range
  const def = lastMonthsRange(3);
  const [from, setFrom] = useState(def.start);
  const [to, setTo] = useState(def.end);

  function within(date?: string) {
    if (!date) return false;
    return date >= from && date <= to;
  }

  async function exportPdf(rangeLabel: string) {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default as (doc: JsPDFWithAutoTable, opts: AutoTableOptions) => void;

    const doc = new jsPDF({ unit: "pt", compress: true }) as unknown as JsPDFWithAutoTable;

    // Header
    doc.setFontSize(16);
    doc.text(`${brandName} – Audit Report`, 40, 40);
    doc.setFontSize(11);
    doc.text(`Range: ${from} to ${to} ${rangeLabel ? `(${rangeLabel})` : ""}`, 40, 60);

    // Allergens
    doc.setFontSize(13);
    doc.text("Allergens – items & flags", 40, 90);
    const allergenBody = allergens.map(a => [
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
      headStyles: { fillColor: [240,240,240] },
    });

    // Team
    const afterAllergenY = doc.lastAutoTable?.finalY ?? 120;
    doc.setFontSize(13);
    doc.text("Team – members", 40, afterAllergenY + 24);
    const teamBody = team.map(m => [m.fullName, m.initials, m.level ?? "", m.expiresOn ?? ""]);
    autoTable(doc, {
      startY: afterAllergenY + 34,
      head: [["Name", "Initials", "Level", "Expires"]],
      body: teamBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240,240,240] },
    });

    // Training (in range)
    const afterTeamY = doc.lastAutoTable?.finalY ?? afterAllergenY + 60;
    doc.setFontSize(13);
    doc.text("Training – expiring/awarded in range", 40, afterTeamY + 24);
    const trainRows = training
      .filter(t => within(t.awardedOn) || within(t.expiresOn))
      .map(t => {
        const who = team.find(m => m.id === t.staffId);
        return [who?.fullName ?? "Unknown", t.type, t.awardedOn ?? "", t.expiresOn ?? "", t.note ?? ""];
      });
    autoTable(doc, {
      startY: afterTeamY + 34,
      head: [["Staff", "Type", "Awarded", "Expires", "Note"]],
      body: trainRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240,240,240] },
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
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />

      <main className="mx-auto max-w-6xl p-4 space-y-4">
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
                    t =>
                      (t.awardedOn && t.awardedOn >= from && t.awardedOn <= to) ||
                      (t.expiresOn && t.expiresOn >= from && t.expiresOn <= to)
                  ).length
                }
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
