"use client";

import React, { useRef, useState } from "react";

export type CSVImportResult = { headers: string[]; rows: string[][] };

export default function CSVImport({
  label = "Import CSV",
  onParsed,
  accept = ".csv,text/csv",
  sampleHeaders,
  className = "",
}: {
  label?: string;
  onParsed: (result: CSVImportResult) => void;
  accept?: string;
  sampleHeaders?: string[];
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  function parseCSV(text: string): CSVImportResult {
    const rows: string[][] = [];
    let i = 0, cur = "", inQuotes = false, row: string[] = [];
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        } else { cur += c; i++; continue; }
      } else {
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ",") { row.push(cur); cur = ""; i++; continue; }
        if (c === "\r") { i++; continue; }
        if (c === "\n") { row.push(cur); rows.push(row); cur = ""; row = []; i++; continue; }
        cur += c; i++;
      }
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    if (!rows.length) return { headers: [], rows: [] };
    const headers = rows[0].map(h => h.trim());
    return { headers, rows: rows.slice(1) };
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const text = await f.text();
      const parsed = parseCSV(text);
      onParsed(parsed);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <input ref={fileRef} type="file" accept={accept} onChange={onPick} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        disabled={busy}
        title={sampleHeaders ? `CSV headers: ${sampleHeaders.join(", ")}` : undefined}
      >
        {busy ? "Parsing…" : label}
      </button>
    </div>
  );
}
