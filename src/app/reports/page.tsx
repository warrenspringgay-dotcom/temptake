// src/app/reports/page.tsx
"use client";

import Link from "next/link";
import React from "react";

export default function ReportsPage() {
  function onPrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="text-sm text-gray-600">Quick access to audit and custom reports.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/reports/instant" className="rounded-xl border bg-white p-3 shadow-sm hover:bg-gray-50">
          <div className="text-sm font-medium">Instant Audit</div>
          <div className="text-xs text-gray-600">Run an instant audit with latest logs</div>
        </Link>

        <Link href="/reports/custom" className="rounded-xl border bg-white p-3 shadow-sm hover:bg-gray-50">
          <div className="text-sm font-medium">Custom Report</div>
          <div className="text-xs text-gray-600">Pick dates and filters</div>
        </Link>

        <button onClick={onPrint} className="rounded-xl border bg-white p-3 text-left shadow-sm hover:bg-gray-50">
          <div className="text-sm font-medium">Print</div>
          <div className="text-xs text-gray-600">Print this page</div>
        </button>
      </div>
    </div>
  );
}
