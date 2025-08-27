"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import NavTabs from "@/components/NavTabs";

/* ---------------- Types ---------------- */

type TempCategory =
  | "Fridge"
  | "Freezer"
  | "Cook"
  | "Hot hold"
  | "Chill"
  | "Probe"
  | "Ambient";

type TargetRange = {
  min?: number | null; // °C
  max?: number | null; // °C
  label?: string;
};

type TempLog = {
  id: string;
  timeISO: string; // ISO datetime string
  category: TempCategory;
  item: string;
  location: string;
  tempC: number;
  pass: boolean;
  initials?: string | null;
  notes?: string | null;
};

type TeamMember = {
  id: string;
  full_name: string;
  initials: string;
  role?: string | null;
};

type Catalogs = {
  items: string[];
  locations: string[];
  staffInitials: string[]; // populated from Team
};

type Props = {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
};

/* ---------------- Defaults ---------------- */

const DEFAULT_TARGETS: Record<TempCategory, TargetRange> = {
  Fridge: { min: null, max: 5, label: "≤ 5°C" },
  Freezer: { min: null, max: -18, label: "≤ -18°C" },
  Cook: { min: 75, max: null, label: "≥ 75°C" },
  "Hot hold": { min: 63, max: null, label: "≥ 63°C" },
  Chill: { min: null, max: 8, label: "≤ 8°C" },
  Probe: { min: null, max: 5, label: "≤ 5°C" },
  Ambient: { min: null, max: null, label: "N/A" },
};

/* ---------------- Utilities ---------------- */

const uid = () => Math.random().toString(36).slice(2);
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

// localStorage state
function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState] as const;
}

function evaluatePass(category: TempCategory, tempC: number, targets: Record<TempCategory, TargetRange>) {
  const t = targets[category] ?? {};
  const hasMin = typeof t.min === "number";
  const hasMax = typeof t.max === "number";
  if (!hasMin && !hasMax) return true;
  if (hasMin && tempC < (t.min as number)) return false;
  if (hasMax && tempC > (t.max as number)) return false;
  return true;
}

function safeISOFrom(date?: string, time?: string): string | null {
  try {
    if (date && time) return new Date(`${date}T${time}:00`).toISOString();
    if (date) return new Date(`${date}T00:00:00`).toISOString();
  } catch {}
  return null;
}

/* ---------------- SVG Bar Chart ---------------- */

function EntriesBarChart({
  data,
  width = 680,
  height = 160,
}: {
  data: Array<{ date: string; count: number }>;
  width?: number;
  height?: number;
}) {
  const padding = { top: 20, right: 12, bottom: 24, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const barW = innerW / Math.max(1, data.length);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Entries per day bar chart">
      <rect x="0" y="0" width={width} height={height} fill="white" rx="12" />
      <g transform={`translate(${padding.left - 6}, ${padding.top})`} fontSize="10" fill="#475569">
        <text x="-6" y={innerH} textAnchor="end">0</text>
        <text x="-6" y={innerH * 0.5} textAnchor="end">{Math.ceil(maxCount / 2)}</text>
        <text x="-6" y={0} textAnchor="end">{maxCount}</text>
      </g>
      <g transform={`translate(${padding.left}, ${padding.top})`} stroke="#e5e7eb">
        <line x1="0" y1={innerH} x2={innerW} y2={innerH} />
        <line x1="0" y1={innerH * 0.5} x2={innerW} y2={innerH * 0.5} />
        <line x1="0" y1={0} x2={innerW} y2={0} />
      </g>
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {data.map((d, i) => {
          const h = (d.count / maxCount) * innerH;
          const x = i * barW + 2;
          const y = innerH - h;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={Math.max(1, barW - 4)} height={h} fill="#0ea5e9" rx="3" />
              {data.length <= 14 || i % 2 === 0 ? (
                <text
                  x={x + Math.max(1, barW - 4) / 2}
                  y={innerH + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {d.date.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ---------------- Main Component ---------------- */

export default function FoodTempLogger({
  brandName = "TempTake",
  brandAccent = "#2563EB",
  logoUrl = "/temptake-192.png",
}: Props) {
  // UI
  const [quickOpen, setQuickOpen] = useState<boolean>(false);
  const [fullOpen, setFullOpen] = useState<boolean>(false);

  // Data & settings
  const [catalogs, setCatalogs] = useLocalState<Catalogs>("tt_catalogs", {
    items: ["Fridge 1", "Fridge 2", "Freezer 1", "Bain Marie", "Probe 1"],
    locations: ["Kitchen", "Stores", "Back Room"],
    staffInitials: ["AB", "CD", "EF"],
  });
  const [_targets] = useLocalState<Record<TempCategory, TargetRange>>("tt_targets", DEFAULT_TARGETS);
  const [guestsAllowed, setGuestsAllowed] = useLocalState<boolean>("tt_guests_allowed", true);
  const [logs, setLogs] = useLocalState<TempLog[]>("tt_logs", []);

  // One-time migration for legacy logs (ensure timeISO exists)
  useEffect(() => {
    setLogs((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      let changed = false;
      const migrated: TempLog[] = prev.map((raw: unknown) => {
        const old = (raw ?? {}) as Record<string, unknown>;
        let timeISO =
          typeof old["timeISO"] === "string" && old["timeISO"] ? (old["timeISO"] as string) : null;
        if (!timeISO) {
          const legacy =
            (typeof old["time"] === "string" && (old["time"] as string)) ||
            (typeof old["time_iso"] === "string" && (old["time_iso"] as string)) ||
            null;
          if (legacy) timeISO = legacy;
        }
        if (!timeISO) {
          const guess = safeISOFrom(
            old["date"] as string | undefined,
            old["timeStr"] as string | undefined
          );
          if (guess) timeISO = guess;
        }
        if (!timeISO && typeof old["date"] === "string") {
          const guess = safeISOFrom(old["date"] as string, undefined);
          if (guess) timeISO = guess;
        }
        if (!timeISO) timeISO = new Date().toISOString();

        let category: TempCategory = "Fridge";
        if (typeof old["category"] === "string" && old["category"]) {
          const c = (old["category"] as string).trim();
          if (["Fridge","Freezer","Cook","Hot hold","Chill","Probe","Ambient"].includes(c)) {
            category = c as TempCategory;
          } else {
            const lower = c.toLowerCase();
            if (lower.includes("freez")) category = "Freezer";
            else if (lower.includes("cook")) category = "Cook";
            else if (lower.includes("chill")) category = "Chill";
            else if (lower.includes("probe")) category = "Probe";
            else if (lower.includes("ambient")) category = "Ambient";
          }
        }

        const tempC =
          typeof old["tempC"] === "number" ? (old["tempC"] as number) :
          typeof old["temp_c"] === "number" ? (old["temp_c"] as number) :
          typeof old["temperature"] === "number" ? (old["temperature"] as number) :
          typeof old["temp"] === "string" && (old["temp"] as string).trim()
            ? parseFloat(old["temp"] as string)
            : 0;

        const pass =
          typeof old["pass"] === "boolean" ? (old["pass"] as boolean) :
          evaluatePass(category, tempC, DEFAULT_TARGETS);

        const item = (old["item"] ?? old["name"] ?? "").toString();
        const location = (old["location"] ?? old["place"] ?? "").toString();
        const initials = typeof old["initials"] === "string" ? (old["initials"] as string) : null;
        const notes = typeof old["notes"] === "string" ? (old["notes"] as string) : null;

        const normalized: TempLog = {
          id: typeof old["id"] === "string" && old["id"] ? (old["id"] as string) : uid(),
          timeISO,
          category,
          item,
          location,
          tempC: Number.isFinite(tempC) ? tempC : 0,
          pass,
          initials,
          notes,
        };

        if (
          !old["timeISO"] ||
          old["tempC"] !== normalized.tempC ||
          old["pass"] !== normalized.pass ||
          old["category"] !== normalized.category
        ) {
          changed = true;
        }

        return normalized;
      });

      return changed ? migrated : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Sync staff initials from Team ---------------- */

  // Pull initials from localStorage.tt_team and merge into catalogs.staffInitials
  function readTeamInitials(): string[] {
    try {
      const raw = localStorage.getItem("tt_team");
      if (!raw) return [];
      const arr = JSON.parse(raw) as TeamMember[];
      const initials = arr
        .map((m) => (m?.initials ?? "").trim().toUpperCase())
        .filter((s) => s.length > 0);
      return Array.from(new Set(initials));
    } catch {
      return [];
    }
  }

  useEffect(() => {
    // initial merge on mount
    setCatalogs((prev) => {
      const fromTeam = readTeamInitials();
      const merged = Array.from(new Set([...prev.staffInitials, ...fromTeam]));
      return { ...prev, staffInitials: merged };
    });

    // listen to cross-tab/team changes
    function onStorage(e: StorageEvent) {
      if (e.key === "tt_team") {
        setCatalogs((prev) => {
          const fromTeam = readTeamInitials();
          const merged = Array.from(new Set([...prev.staffInitials, ...fromTeam]));
          return { ...prev, staffInitials: merged };
        });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Filters (now in Entries card UI) ---------------- */

  const [from, setFrom] = useState<string>(() => toISODate(new Date(new Date().getTime() - 13 * 86400000)));
  const [to, setTo] = useState<string>(() => toISODate(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<TempCategory | "All">("All");
  const [search, setSearch] = useState("");

  // Derived: filtered logs
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const start = from ? `${from}T00:00:00` : "";
    const end = to ? `${to}T23:59:59` : "";
    return logs.filter((l) => {
      const tiso = typeof l.timeISO === "string" ? l.timeISO : "";
      if (from && tiso < start) return false;
      if (to && tiso > end) return false;
      if (categoryFilter !== "All" && l.category !== categoryFilter) return false;
      if (!s) return true;
      return (
        l.item.toLowerCase().includes(s) ||
        l.location.toLowerCase().includes(s) ||
        (l.initials ?? "").toLowerCase().includes(s)
      );
    });
  }, [logs, search, from, to, categoryFilter]);

  // KPI numbers (Top logger, Needs attention, Days missed)
  const kpis = useMemo(() => {
    // Top logger by initials
    const counts = new Map<string, number>();
    for (const l of filtered) {
      const ini = (l.initials ?? "").trim();
      if (!ini) continue;
      counts.set(ini, (counts.get(ini) ?? 0) + 1);
    }
    let topInitials = "—";
    let topCount = 0;
    for (const [ini, c] of counts.entries()) {
      if (c > topCount) { topCount = c; topInitials = ini; }
    }

    // Needs attention = fails in filtered range
    const failCount = filtered.reduce((acc, l) => acc + (l.pass ? 0 : 1), 0);

    // Days missed = days between from..to with zero entries
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    let daysTotal = 0;
    let daysWithEntries = 0;
    const dayCounts = new Map<string, number>();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = toISODate(d);
      daysTotal += 1;
      dayCounts.set(k, 0);
    }
    for (const l of filtered) {
      const d = l.timeISO.slice(0, 10);
      if (dayCounts.has(d)) dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
    }
    for (const v of dayCounts.values()) {
      if (v > 0) daysWithEntries += 1;
    }
    const daysMissed = Math.max(0, daysTotal - daysWithEntries);

    return { topInitials, topCount, failCount, daysMissed };
  }, [filtered, from, to]);

  // Chart data
  const chartData = useMemo(() => {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(toISODate(d));
    }
    const counts = new Map<string, number>();
    for (const day of days) counts.set(day, 0);
    for (const l of filtered) {
      const tiso = typeof l.timeISO === "string" ? l.timeISO : "";
      const d = tiso ? tiso.slice(0, 10) : "";
      if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return days.map((d) => ({ date: d, count: counts.get(d) ?? 0 }));
  }, [filtered, from, to]);

  /* ---------------- Helpers ---------------- */

  function addToCatalogs(item: string, location: string, initials?: string) {
    setCatalogs((prev) => {
      const items = prev.items.includes(item) || !item.trim() ? prev.items : [item, ...prev.items].slice(0, 50);
      const locations = prev.locations.includes(location) || !location.trim() ? prev.locations : [location, ...prev.locations].slice(0, 50);
      const staffInitials =
        initials && initials.trim()
          ? prev.staffInitials.includes(initials.toUpperCase())
            ? prev.staffInitials
            : [initials.toUpperCase(), ...prev.staffInitials].slice(0, 50)
          : prev.staffInitials;
      return { items, locations, staffInitials };
    });
  }

  function makeTimeISO(date: string, time: string) {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  function enforceTeam(initialsRaw: string): { ok: boolean; msg?: string } {
    const ini = initialsRaw.trim().toUpperCase();
    if (guestsAllowed) return { ok: true };
    if (!ini) return { ok: false, msg: "Enter your initials (guests not allowed)." };
    if (!catalogs.staffInitials.includes(ini)) {
      return { ok: false, msg: `“${ini}” is not in the team list (guests not allowed).` };
    }
    return { ok: true };
  }

  function handleQuickSave() {
    const t = parseFloat(qForm.temp);
    if (!qForm.item.trim() || !qForm.location.trim() || !Number.isFinite(t)) {
      alert("Please complete item, location and a valid temperature.");
      return;
    }
    const teamCheck = enforceTeam(qForm.initials);
    if (!teamCheck.ok) { alert(teamCheck.msg); return; }

    const pass = evaluatePass(qForm.category, t, DEFAULT_TARGETS);
    const log: TempLog = {
      id: uid(),
      timeISO: makeTimeISO(qForm.date, qForm.time),
      category: qForm.category,
      item: qForm.item.trim(),
      location: qForm.location.trim(),
      tempC: t,
      pass,
      initials: qForm.initials.trim() ? qForm.initials.trim().toUpperCase() : null,
      notes: qForm.notes.trim() || null,
    };
    setLogs((prev) => [log, ...prev]);
    addToCatalogs(log.item, log.location, log.initials ?? undefined);
    setQForm((f) => ({ ...f, item: "", temp: "" }));
  }

  function handleFullSave() {
    const t = parseFloat(fForm.temp);
    if (!fForm.item.trim() || !fForm.location.trim() || !Number.isFinite(t)) {
      alert("Please complete item, location and a valid temperature.");
      return;
    }
    const teamCheck = enforceTeam(fForm.initials);
    if (!teamCheck.ok) { alert(teamCheck.msg); return; }

    const pass = evaluatePass(fForm.category, t, DEFAULT_TARGETS);
    const log: TempLog = {
      id: uid(),
      timeISO: makeTimeISO(fForm.date, fForm.time),
      category: fForm.category,
      item: fForm.item.trim(),
      location: fForm.location.trim(),
      tempC: t,
      pass,
      initials: fForm.initials.trim() ? fForm.initials.trim().toUpperCase() : null,
      notes: fForm.notes.trim() || null,
    };
    setLogs((prev) => [log, ...prev]);
    addToCatalogs(log.item, log.location, log.initials ?? undefined);
    setFullOpen(false);
  }

  /* ---------------- Forms ---------------- */

  const [qForm, setQForm] = useState({
    date: toISODate(new Date()),
    time: new Date().toTimeString().slice(0, 5),
    category: "Fridge" as TempCategory,
    item: "",
    location: "",
    temp: "",
    initials: "",
    notes: "",
  });

  const [fForm, setFForm] = useState({
    date: toISODate(new Date()),
    time: new Date().toTimeString().slice(0, 5),
    category: "Fridge" as TempCategory,
    item: "",
    location: "",
    temp: "",
    initials: "",
    notes: "",
  });

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs brandName={brandName} brandAccent={brandAccent} logoUrl={logoUrl} />

      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Top row: actions only (quick directly above fold-down) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setQuickOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            aria-expanded={quickOpen}
            aria-controls="quick-entry"
          >
            <span className="inline-block w-3 text-center">{quickOpen ? "▾" : "▸"}</span>
            <span>Quick entry</span>
          </button>

          <button
            onClick={() => setFullOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
          >
            + Full entry
          </button>

          <label className="ml-auto inline-flex items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={guestsAllowed}
              onChange={(e) => setGuestsAllowed(e.target.checked)}
            />
            Guests allowed
          </label>
        </div>

        {/* Quick entry appears DIRECTLY below the button row */}
        {quickOpen && (
          <div id="quick-entry" className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-sm mb-1">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={qForm.date}
                  onChange={(e) => setQForm({ ...qForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={qForm.time}
                  onChange={(e) => setQForm({ ...qForm, time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={qForm.category}
                  onChange={(e) => setQForm({ ...qForm, category: e.target.value as TempCategory })}
                >
                  {Object.keys(DEFAULT_TARGETS).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">{DEFAULT_TARGETS[qForm.category]?.label ?? ""}</p>
              </div>
              <div>
                <label className="block text-sm mb-1">Item</label>
                <input
                  list="items-datalist"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={qForm.item}
                  onChange={(e) => setQForm({ ...qForm, item: e.target.value })}
                />
                <datalist id="items-datalist">
                  {catalogs.items.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm mb-1">Location</label>
                <input
                  list="locations-datalist"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={qForm.location}
                  onChange={(e) => setQForm({ ...qForm, location: e.target.value })}
                />
                <datalist id="locations-datalist">
                  {catalogs.locations.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm mb-1">Temperature (°C)</label>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. 3.5"
                  value={qForm.temp}
                  onChange={(e) => setQForm({ ...qForm, temp: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Initials</label>
                <input
                  list="staff-initials"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={qForm.initials}
                  onChange={(e) => setQForm({ ...qForm, initials: e.target.value.toUpperCase() })}
                />
                <datalist id="staff-initials">
                  {catalogs.staffInitials.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Notes (optional)</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={qForm.notes}
                  onChange={(e) => setQForm({ ...qForm, notes: e.target.value })}
                />
              </div>
              <div className="md:col-span-3 flex items-end justify-end gap-2">
                <button
                  onClick={handleQuickSave}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                >
                  Save entry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KPI row (Top logger / Needs attention / Days missed) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Top logger</div>
            <div className="text-2xl font-semibold">
              {kpis.topInitials} <span className="text-slate-400 text-base">({kpis.topCount})</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">in current range</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Needs attention</div>
            <div className="text-2xl font-semibold text-red-600">{kpis.failCount}</div>
            <div className="text-xs text-slate-500 mt-1">failed checks</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Days missed</div>
            <div className="text-2xl font-semibold">{kpis.daysMissed}</div>
            <div className="text-xs text-slate-500 mt-1">no entries on those days</div>
          </div>
        </div>

        {/* Entries card with filters/search (chart is now BELOW this) */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 flex flex-wrap items-end gap-3">
            <div className="text-sm font-medium mr-auto">Entries</div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as TempCategory | "All")}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option>All</option>
                {Object.keys(DEFAULT_TARGETS).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-xs text-slate-600 mb-1">Search</label>
              <input
                placeholder="item / location / initials"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No entries in this view.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3">Temp (°C)</th>
                    <th className="py-2 px-3">Result</th>
                    <th className="py-2 px-3">Initials</th>
                    <th className="py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const tiso = typeof l.timeISO === "string" ? l.timeISO : "";
                    const date = tiso ? tiso.slice(0, 10) : "";
                    const dt = tiso ? new Date(tiso) : new Date();
                    const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
                    return (
                      <tr key={l.id} className="border-t border-gray-200">
                        <td className="py-2 px-3">{date || "—"}</td>
                        <td className="py-2 px-3">{time}</td>
                        <td className="py-2 px-3">{l.category}</td>
                        <td className="py-2 px-3">{l.item}</td>
                        <td className="py-2 px-3">{l.location}</td>
                        <td className="py-2 px-3">{Number.isFinite(l.tempC) ? l.tempC.toFixed(1) : "—"}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              l.pass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {l.pass ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className="py-2 px-3">{l.initials ?? "—"}</td>
                        <td className="py-2 px-3">{l.notes ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chart moved to very bottom */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium">Entries per day (filtered)</div>
          <EntriesBarChart data={chartData} />
        </div>
      </main>

      {/* Full entry modal */}
      {fullOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="text-sm font-medium">New temperature entry</div>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => setFullOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Date</label>
                <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.date} onChange={(e)=>setFForm({...fForm, date: e.target.value})}/>
              </div>
              <div>
                <label className="block text-sm mb-1">Time</label>
                <input type="time" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.time} onChange={(e)=>setFForm({...fForm, time: e.target.value})}/>
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.category} onChange={(e)=>setFForm({...fForm, category: e.target.value as TempCategory})}>
                  {Object.keys(DEFAULT_TARGETS).map((c)=> <option key={c}>{c}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">{DEFAULT_TARGETS[fForm.category]?.label ?? ""}</p>
              </div>
              <div>
                <label className="block text-sm mb-1">Item</label>
                <input list="items-datalist" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.item} onChange={(e)=>setFForm({...fForm, item: e.target.value})}/>
              </div>
              <div>
                <label className="block text-sm mb-1">Location</label>
                <input list="locations-datalist" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.location} onChange={(e)=>setFForm({...fForm, location: e.target.value})}/>
              </div>
              <div>
                <label className="block text-sm mb-1">Temperature (°C)</label>
                <input inputMode="decimal" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.temp} onChange={(e)=>setFForm({...fForm, temp: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Initials</label>
                <input list="staff-initials" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.initials} onChange={(e)=>setFForm({...fForm, initials: e.target.value.toUpperCase()})}/>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Notes</label>
                <textarea rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={fForm.notes} onChange={(e)=>setFForm({...fForm, notes: e.target.value})}/>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={()=>setFullOpen(false)}>Cancel</button>
              <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800" onClick={handleFullSave}>Save entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
