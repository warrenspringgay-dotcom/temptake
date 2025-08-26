// src/app/reports/page.tsx
"use client";

import React, { useState } from "react";
import NavTabs from "@/components/NavTabs";
import jsPDF from "jspdf";
// IMPORTANT: this registers the plugin onto the jsPDF instance
import "jspdf-autotable";

// ---- Minimal types so we avoid 'any' and version-specific typings ----
type AutoTableOptions = {
  startY?: number;
  head?: (string | string[])[];
  body?: (string | number | null)[][];
  styles?: Record<string, unknown>;
  headStyles?: Record<string, unknown>;
};
type JsPDFWithAutoTable = jsPDF & {
  autoTable: (opts: AutoTableOptions) => void;
  lastAutoTable?: { finalY?: number };
};

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  function generateReport() {
    const doc = new jsPDF() as JsPDFWithAutoTable;

    // Title
    doc.setFontSize(16);
    doc.text("TempTake – Inspection Report", 14, 16);
    doc.setFontSize(10);
    const rangeLabel =
      dateFrom && dateTo ? `Period: ${dateFrom} to ${dateTo}` : "Period: last 3 months";
    doc.text(rangeLabel, 14, 22);

    // Allergen review (dummy for now)
    doc.autoTable({
      startY: 32,
      head: [["Allergen Review", "Last Reviewed", "By"]],
      body: [["Matrix", "2025-08-01", "Manager"]],
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9, cellPadding: 2 },
    });

    // Temp logs (dummy for now)
    const startY =
      (doc.lastAutoTable && typeof doc.lastAutoTable.finalY === "number")
        ? doc.lastAutoTable.finalY + 8
        : 40;

    doc.autoTable({
      startY,
      head: [["Date", "Item", "Location", "Temp (°C)", "Pass"]],
      body: [
        ["2025-08-21", "Fridge 1", "Kitchen", "3.2", "Pass"],
        ["2025-08-21", "Freezer 2", "Stores", "-16.0", "Fail"],
      ],
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9, cellPadding: 2 },
    });

    doc.save("inspection-report.pdf");
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h1 className="text-lg font-semibold mb-2">Reports</h1>
          <p className="text-sm text-slate-600 mb-4">
            Generate compiled inspection reports for auditing. By default, last 3 months are included.
          </p>

          <div className="flex flex-wrap items-end gap-3 mb-2">
            <div>
              <label className="block text-sm mb-1">From</label>
              <input
                type="date"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">To</label>
              <input
                type="date"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button
              onClick={generateReport}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800"
              aria-label="Create Inspection Report"
              title="Create Inspection Report"
            >
              📄 Create Inspection Report
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Button above generates a PDF for the selected range; if left empty it uses the last 3 months.
          </p>
        </div>
      </main>
    </div>
  );
}
