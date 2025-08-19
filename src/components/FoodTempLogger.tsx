"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Switch } from "./ui/switch";

import {
  Calendar as CalendarIcon,
  Download as DownloadIcon,
  Plus as PlusIcon,
  Thermometer as ThermometerIcon,
  Trash2 as Trash2Icon,
  Pencil as Edit3Icon,
  Settings2 as Settings2Icon,
  CheckCheck as CheckCheckIcon,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { format, startOfWeek, parseISO } from "date-fns";

/* ===================== Types ===================== */
export type TempCategory =
  | "Fridge"
  | "Freezer"
  | "Hot Hold"
  | "Cold Hold"
  | "Delivery"
  | "Probe Calibration";

export type TempLog = {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  item: string;
  category: TempCategory;
  location: string;
  temperature: number; // °C
  initials: string;
  correctiveAction?: string;
  notes?: string;
  pass: boolean;
  signedBy?: string;
};

export type TargetRange = { min?: number | null; max?: number | null };

/* ===================== Defaults ===================== */
const defaultTargets: Record<TempCategory, TargetRange> = {
  Fridge: { min: null, max: 5 },
  Freezer: { min: null, max: -18 },
  "Hot Hold": { min: 63, max: null },
  "Cold Hold": { min: null, max: 8 },
  Delivery: { min: null, max: 8 },
  "Probe Calibration": { min: 0, max: 1 },
};

const tempUnit = "°C";

/* ===================== Utils ===================== */
function uid() {
  return Math.random().toString(36).slice(2);
}

function withinRange(value: number, range: TargetRange, category: TempCategory) {
  if (category === "Freezer") {
    const max = typeof range.max === "number" ? range.max : -18;
    return value <= max;
  }
  const aboveMin = range.min == null || value >= range.min;
  const belowMax = range.max == null || value <= range.max;
  return aboveMin && belowMax;
}

function csvDownload(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          return s.includes(",") || s.includes("\n") || s.includes('"')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== Simple UI bits ===================== */
const CategoryBadge: React.FC<{ category: TempCategory }> = ({ category }) => (
  <Badge variant="secondary" className="rounded-2xl px-3 text-xs">
    {category}
  </Badge>
);

const PassPill: React.FC<{ pass: boolean }> = ({ pass }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-2xl px-2.5 py-1 text-xs font-medium ${
      pass ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
    }`}
  >
    <ThermometerIcon className="h-3 w-3" />
    {pass ? "Pass" : "Fail"}
  </span>
);

/* ===================== Seed (deterministic) ===================== */
const seed: TempLog[] = [
  {
    id: uid(),
    date: "2024-01-01",
    time: "08:00",
    item: "Fridge 1",
    category: "Fridge",
    location: "Kitchen",
    temperature: 3.2,
    initials: "AB",
    pass: true,
    notes: "",
  },
  {
    id: uid(),
    date: "2024-01-01",
    time: "09:00",
    item: "Hot Hold Bain Marie",
    category: "Hot Hold",
    location: "Servery",
    temperature: 64.5,
    initials: "CD",
    pass: true,
  },
  {
    id: uid(),
    date: "2024-01-01",
    time: "07:30",
    item: "Freezer 2",
    category: "Freezer",
    location: "Stores",
    temperature: -16.0,
    initials: "EF",
    pass: false,
    correctiveAction: "Adjusted thermostat and kept door closed. Recheck in 1h.",
  },
];

/* ===================== SSR-safe localStorage hook ===================== */
function useLocalState<T>(key: string, init: T) {
  const [state, setState] = useState<T>(init);

  // Load after mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (raw) setState(JSON.parse(raw) as T);
    } catch {
      // ignore
    }
  }, [key]);

  // Persist on change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {
      // ignore
    }
  }, [key, state]);

  return [state, setState] as const;
}

/* ===================== Main Component ===================== */
export default function FoodHygieneTempLogger({
  brandName = "TempTake",
  brandAccent = "",
  logoUrl,
}: {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
}) {
  // hydration guards
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // persisted state
  const [targets, setTargets] = useLocalState<Record<TempCategory, TargetRange>>("fh_targets", defaultTargets);
  const [logs, setLogs] = useLocalState<TempLog[]>("fh_logs", seed);
  const [signatureRequired, setSignatureRequired] = useLocalState<boolean>("fh_signature_required", true);

  // filters
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TempCategory | "All">("All");
  const [locationFilter, setLocationFilter] = useState<string | "All">("All");

  const locations = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => s.add(l.location));
    return Array.from(s);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (query && !`${l.item} ${l.location} ${l.initials}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (categoryFilter !== "All" && l.category !== categoryFilter) return false;
      if (locationFilter !== "All" && l.location !== locationFilter) return false;
      if (dateFrom && l.date < dateFrom) return false;
      if (dateTo && l.date > dateTo) return false;
      return true;
    });
  }, [logs, query, categoryFilter, locationFilter, dateFrom, dateTo]);

  const chartData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .map((l) => ({ ...l, label: `${l.date} ${l.time}` }));
  }, [filtered]);

  // KPIs
  const lastEntry = useMemo(() => {
    if (!logs.length) return null;
    const sortedDesc = [...logs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return sortedDesc[0];
  }, [logs]);

  const weeklyCount = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return logs.filter((l) => parseISO(l.date) >= start).length;
  }, [logs]);

  const missingDaysLast7 = useMemo(() => {
    const have = new Set(logs.map((l) => l.date));
    const out: string[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (!have.has(iso)) out.push(iso);
    }
    return out;
  }, [logs]);

  const onDelete = (id: string) => setLogs((prev) => prev.filter((l) => l.id !== id));

  const exportCSV = () => {
    const header = [
      "Date",
      "Time",
      "Category",
      "Item",
      "Location",
      `Temperature (${tempUnit})`,
      "Pass",
      "Initials",
      "Corrective Action",
      "Notes",
      "Signature",
    ];
    const rows = filtered.map((l) => [
      l.date,
      l.time,
      l.category,
      l.item,
      l.location,
      l.temperature,
      l.pass ? "Pass" : "Fail",
      l.initials,
      l.correctiveAction ?? "",
      l.notes ?? "",
      l.signedBy ?? "",
    ]);
    csvDownload(`temperature-logs_${dateFrom ?? ""}-${dateTo ?? ""}.csv`, [header, ...rows]);
  };

  // Deterministic first paint
  if (!hydrated) {
    return (
      <div className="min-h-screen w-full bg-neutral-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt={brandName} className="h-16 w-auto" style={{ objectFit: "contain" }} />}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{brandName}</h1>
              <p className="text-sm text-neutral-600">Food hygiene temperature logs (UK HACCP-friendly)</p>
            </div>
          </header>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Loading…</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 p-6">
      <style>{`:root { --brand-accent: ${brandAccent}; }`}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="h-16 sm:h-20 md:h-24 w-auto" style={{ objectFit: "contain" }} />
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{brandName}</h1>
              <p className="text-sm text-neutral-600">Food hygiene temperature logs (UK HACCP-friendly)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SettingsPopover targets={targets} setTargets={setTargets} />
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <DownloadIcon className="h-4 w-4" /> Export CSV
            </Button>
            <AddLogDialog onAdd={(log) => setLogs((prev) => [log, ...prev])} targets={targets} signatureRequired={signatureRequired} />
          </div>
        </header>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Entries" value={String(filtered.length)} subtitle="in current view" />
          <StatCard
            title="Last entry"
            value={lastEntry ? lastEntry.date : "No entries"}
            subtitle={lastEntry ? `${lastEntry.item} • ${lastEntry.location}` : undefined}
          />
          <StatCard title="This week" value={String(weeklyCount)} subtitle="entries since Monday" />
          <MissingDaysCard dates={missingDaysLast7} />
        </div>

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-end md:gap-6">
            <div className="flex-1 space-y-1">
              <Label>Search</Label>
              <Input placeholder="Search item, location, initials…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TempCategory | "All")}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {(Object.keys(defaultTargets) as TempCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v as string | "All")}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {locations.map((loc) => (<SelectItem key={loc} value={loc}>{loc}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <DateField label="From" value={dateFrom} onChange={setDateFrom} />
            <DateField label="To" value={dateTo} onChange={setDateTo} />
          </CardContent>
        </Card>

        {/* Signature required (persisted) */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Signature required</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">Ask staff to sign each entry</p>
            <Switch checked={signatureRequired} onCheckedChange={setSignatureRequired} />
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Temperature trend (filtered)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {mounted ? (
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis unit="°C" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="temperature" strokeWidth={2} dot={false} />
                    {categoryFilter !== "All" && (
                      <SafeBand range={targets[categoryFilter as TempCategory]} category={categoryFilter as TempCategory} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Log entries</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Temperature</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Initials</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id} className="hover:bg-neutral-50/60">
                    <TableCell>{l.date}</TableCell>
                    <TableCell>{l.time}</TableCell>
                    <TableCell><CategoryBadge category={l.category} /></TableCell>
                    <TableCell className="max-w-[240px] truncate" title={l.item}>{l.item}</TableCell>
                    <TableCell>{l.location}</TableCell>
                    <TableCell className="text-right font-medium">{l.temperature.toFixed(1)} {tempUnit}</TableCell>
                    <TableCell><PassPill pass={l.pass} /></TableCell>
                    <TableCell>{l.initials}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditLog logs={logs} setLogs={setLogs} targets={targets} log={l} />
                        <Button variant="ghost" size="icon" onClick={() => onDelete(l.id)} className="hover:bg-red-50 hover:text-red-600">
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-neutral-500">
                      No entries match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ===================== Subcomponents ===================== */
function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold leading-none">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-neutral-600">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function MissingDaysCard({ dates }: { dates: string[] }) {
  const count = dates.length;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a)); // newest first
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2"><CardTitle className="text-base">Missing days</CardTitle></CardHeader>
      <CardContent className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl font-semibold leading-none">{count}</div>
          <p className="mt-1 text-xs text-neutral-600">in last 7 days</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto">View dates</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            {count === 0 ? (
              <p className="text-sm text-neutral-600">All days logged ✅</p>
            ) : (
              <ul className="max-h-56 overflow-auto text-sm">
                {sorted.map((iso) => {
                  const d = new Date(`${iso}T00:00:00`);
                  const dd = String(d.getDate()).padStart(2, "0");
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const yyyy = d.getFullYear();
                  return <li key={iso} className="py-1 border-b last:border-0">{`${dd}/${mm}/${yyyy}`}</li>;
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-44 justify-between">
            <span>{value || "Select date"}</span>
            <CalendarIcon className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3" align="start">
          <Input ref={ref} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onChange(null)}>Clear</Button>
            <Button onClick={() => setOpen(false)}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SafeBand({ range, category }: { range: TargetRange; category: TempCategory }) {
  let y1: number | undefined = range.min ?? undefined;
  let y2: number | undefined = range.max ?? undefined;
  if (category === "Freezer") {
    y1 = -100;
    y2 = typeof range.max === "number" ? range.max : -18;
  }
  if (y1 == null && y2 == null) return null;
  return <ReferenceArea y1={y1} y2={y2} opacity={0.08} />;
}

function SettingsPopover({
  targets,
  setTargets,
}: {
  targets: Record<TempCategory, TargetRange>;
  setTargets: React.Dispatch<React.SetStateAction<Record<TempCategory, TargetRange>>>;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings2Icon className="h-4 w-4" /> Targets
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-4" align="end">
        <Tabs defaultValue="ranges">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ranges">Target ranges</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="ranges" className="mt-3">
            <div className="space-y-3">
              {(Object.keys(targets) as TempCategory[]).map((c) => {
                const r = targets[c];
                return (
                  <div key={c} className="grid grid-cols-3 items-end gap-3 rounded-xl bg-neutral-50 p-3">
                    <div>
                      <Label className="text-xs text-neutral-600">Category</Label>
                      <div className="font-medium">{c}</div>
                    </div>
                    <div>
                      <Label>Min (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.min ?? ""}
                        onChange={(e) =>
                          setTargets((prev) => ({
                            ...prev,
                            [c]: {
                              ...prev[c],
                              min: e.target.value === "" ? null : Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Max (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.max ?? ""}
                        onChange={(e) =>
                          setTargets((prev) => ({
                            ...prev,
                            [c]: {
                              ...prev[c],
                              max: e.target.value === "" ? null : Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-neutral-600">
                Typical UK targets: Fridge ≤5°C; Freezer ≤-18°C; Hot hold ≥63°C; Cold hold ≤8°C.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="about" className="mt-3 space-y-2 text-sm text-neutral-700">
            <p>This UI captures temperatures for HACCP records and highlights out-of-range results. Export filtered data as CSV for EHO inspections.</p>
            <p>Data is stored in your browser (localStorage) for demo purposes.</p>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function AddLogDialog({
  onAdd,
  targets,
  signatureRequired,
}: {
  onAdd: (l: TempLog) => void;
  targets: Record<TempCategory, TargetRange>;
  signatureRequired: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<TempLog>>({
    date: undefined,
    time: undefined,
    category: "Fridge",
  });
  const [signature, setSignature] = useState("");

  // default date/time only when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      setForm((f) => ({
        ...f,
        date: f.date ?? now.toISOString().slice(0, 10),
        time: f.time ?? format(now, "HH:mm"),
      }));
    }
  }, [open]);

  const canSubmit =
    !!form.date && !!form.time && !!form.item && !!form.location &&
    typeof form.temperature === "number" && !!form.initials &&
    (!signatureRequired || signature.trim().length > 0);

  function submit() {
    const range = targets[form.category as TempCategory];
    const pass = withinRange(form.temperature as number, range, form.category as TempCategory);
    const newLog: TempLog = {
      id: uid(),
      date: form.date!, time: form.time!,
      item: form.item!, category: form.category as TempCategory,
      location: form.location!, temperature: Number(form.temperature),
      initials: form.initials!,
      correctiveAction: form.correctiveAction, notes: form.notes,
      pass,
      signedBy: signatureRequired ? signature.trim() : undefined,
    };
    onAdd(newLog);
    setOpen(false);
    setForm({ date: newLog.date, time: newLog.time, category: newLog.category });
    setSignature("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="h-4 w-4" /> Add entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader><DialogTitle>New temperature entry</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.date ?? ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Time</Label>
            <Input type="time" value={form.time ?? ""} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={(form.category ?? "Fridge") as TempCategory} onValueChange={(v) => setForm({ ...form, category: v as TempCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(defaultTargets) as TempCategory[]).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Item (e.g., Fridge 1)</Label>
            <Input placeholder="Fridge 1" value={form.item ?? ""} onChange={(e) => setForm({ ...form, item: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input placeholder="Kitchen" value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Temperature (°C)</Label>
            <Input
              type="number" step="0.1" inputMode="decimal" placeholder="e.g., 3.5"
              value={(form.temperature as number | undefined) ?? ""}
              onChange={(e) => setForm({ ...form, temperature: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label>Initials</Label>
            <Input placeholder="AB" value={form.initials ?? ""} onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Corrective action (if out of range)</Label>
            <Input placeholder="What did you do?" value={form.correctiveAction ?? ""} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Notes</Label>
            <Input placeholder="Optional" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {signatureRequired && (
            <div className="sm:col-span-2">
              <Label>Digital signature (type full name)</Label>
              <Input placeholder="e.g., Alex Brown" value={signature} onChange={(e) => setSignature(e.target.value)} />
              <p className="mt-1 text-xs text-neutral-600">Your name will be stored alongside this entry.</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={submit} className="gap-2">
            <CheckCheckIcon className="h-4 w-4" /> Save entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditLog({
  log,
  setLogs,
  targets,
}: {
  log: TempLog;
  setLogs: React.Dispatch<React.SetStateAction<TempLog[]>>;
  targets: Record<TempCategory, TargetRange>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TempLog>(log);

  function submit() {
    const range = targets[form.category];
    const updated: TempLog = { ...form, pass: withinRange(form.temperature, range, form.category) };
    setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Edit3Icon className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader><DialogTitle>Edit entry</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-1"><Label>Time</Label>
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div className="space-y-1"><Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TempCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(defaultTargets) as TempCategory[]).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Item</Label>
            <Input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
          </div>
          <div className="space-y-1"><Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="space-y-1"><Label>Temperature (°C)</Label>
            <Input type="number" step="0.1" inputMode="decimal" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} />
          </div>
          <div className="space-y-1"><Label>Initials</Label>
            <Input value={form.initials} onChange={(e) => setForm({ ...form, initials: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2"><Label>Corrective action</Label>
            <Input value={form.correctiveAction ?? ""} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2"><Label>Notes</Label>
            <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="gap-2"><CheckCheckIcon className="h-4 w-4" /> Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
