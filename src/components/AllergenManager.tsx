"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import NavTabs from "./NavTabs";
import { upsertAllergenItem } from "@/app/actions/db";
import { exportAllergensPDF } from "@/lib/pdf";

/* Tiny UI */
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border bg-white ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>{children}</div>
);
const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  const { variant = "primary", className = "", ...rest } = props;
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const styles =
    variant === "primary" ? "bg-slate-900 text-white hover:bg-slate-800"
    : variant === "outline" ? "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50"
    : "text-slate-700 hover:bg-gray-100";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

/* Caret CSS */
const CaretCSS = () => (
  <style>{`
    details > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:.5rem; padding:1rem 1.5rem; border-bottom:1px solid #e5e7eb; font-weight:500; user-select:none; }
    details > summary::marker { display:none; }
    .caret { display:inline-block; transition: transform .2s ease; }
    details[open] .caret { transform: rotate(90deg); }
  `}</style>
);

/* Allergen list */
const ALLERGENS = [
  { key: "gluten", id3: "GLU", label: "Gluten", icon: "🌾" },
  { key: "crustaceans", id3: "CRU", label: "Crustaceans", icon: "🦐" },
  { key: "eggs", id3: "EGG", label: "Eggs", icon: "🥚" },
  { key: "fish", id3: "FIS", label: "Fish", icon: "🐟" },
  { key: "peanuts", id3: "PEA", label: "Peanuts", icon: "🥜" },
  { key: "soybeans", id3: "SOY", label: "Soy", icon: "🌱" },
  { key: "milk", id3: "MIL", label: "Milk", icon: "🥛" },
  { key: "nuts", id3: "NUT", label: "Tree nuts", icon: "🌰" },
  { key: "celery", id3: "CEL", label: "Celery", icon: "🥬" },
  { key: "mustard", id3: "MUS", label: "Mustard", icon: "🌿" },
  { key: "sesame", id3: "SES", label: "Sesame", icon: "🟤" },
  { key: "sulphites", id3: "SUL", label: "Sulphites", icon: "🧪" },
  { key: "lupin", id3: "LUP", label: "Lupin", icon: "🌼" },
  { key: "molluscs", id3: "MOL", label: "Molluscs", icon: "🐚" },
] as const;

type AllergenKey = typeof ALLERGENS[number]["key"];
type Flags = Record<AllergenKey, boolean>;
type Row = { id: string; name: string; category?: string; flags: Flags; notes?: string; locked?: boolean; };
type ReviewMeta = { days: number; last: string | null; by?: string | null };

/* Utils */
function uid() { return Math.random().toString(36).slice(2); }
function todayISO() { return new Date().toISOString().slice(0,10); }
function formatDDMMYYYY(iso?: string | null) { if(!iso) return ""; const d=new Date(iso); return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`; }
function csvDownload(filename: string, rows: (string|number)[][]) {
  const csv = rows.map(r => r.map(c => { const s=String(c??""); return s.includes(",")||s.includes("\n")||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s; }).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"}); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
function safeGet<T>(k:string,f:T){ try{const r=localStorage.getItem(k); return r? JSON.parse(r) as T : f;}catch{return f;} }
function useLocalState<T>(k:string,i:T){ const [s,ss]=useState<T>(()=>safeGet(k,i)); useEffect(()=>localStorage.setItem(k,JSON.stringify(s)),[k,s]); return [s,ss] as const; }
function daysBetween(aISO: string, bISO: string){ const a=new Date(aISO).setHours(0,0,0,0); const b=new Date(bISO).setHours(0,0,0,0); return Math.round((b-a)/86400000); }

/* Flags helpers */
function emptyFlags(): Flags { return ALLERGENS.reduce<Flags>((acc, a) => ({ ...acc, [a.key]: false }), {} as Flags); }
function ensureFlags(f?: Partial<Flags> | null): Flags { return { ...emptyFlags(), ...(f ?? {}) }; }

/* Small dropdown */
function useClickAway<T extends HTMLElement>(onAway: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onAway(); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onAway]);
  return ref;
}
function ActionsDropdown({ items, label = "More ▾" }: { items: { label: string; onClick: () => void }[]; label?: string; }) {
  const [open, setOpen] = useState(false);
  const ref = useClickAway<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>{label}</Button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow">
          {items.map((it, i) => (
            <button key={i} role="menuitem" className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setOpen(false); it.onClick(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AllergenManager() {
  const [rows, setRows] = useLocalState<Row[]>("tt_allergen_rows", []);
  const [review, setReview] = useLocalState<ReviewMeta>("tt_allergen_review", { days: 30, last: null, by: null });

  const reviewStatus = useMemo(() => {
    if (!review.last) return { ok:false, overdueBy:null as number|null };
    const diff = daysBetween(review.last, todayISO());
    return { ok: diff <= review.days, overdueBy: Math.max(0, diff - review.days) };
  }, [review.days, review.last]);

  // Query state
  const [queryNotAllowedRaw, setQueryNotAllowedRaw] = useLocalState<unknown>("tt_allergen_query_exclude", []);
  const queryNotAllowed = useMemo<AllergenKey[]>(() => (Array.isArray(queryNotAllowedRaw) ? (queryNotAllowedRaw as AllergenKey[]) : []), [queryNotAllowedRaw]);
  const setQueryNotAllowed = (next: AllergenKey[] | ((prev: AllergenKey[]) => AllergenKey[])) => {
    const value = typeof next === "function" ? (next as (p: AllergenKey[]) => AllergenKey[])(queryNotAllowed) : next;
    setQueryNotAllowedRaw(value);
  };
  const [queryCategory, setQueryCategory] = useLocalState<string | "All">("tt_allergen_query_cat", "All");

  const safeItems = useMemo(() => {
    const base = queryCategory === "All" ? rows : rows.filter(r => (r.category ?? "Other") === queryCategory);
    if (!queryNotAllowed.length) return [];
    return base.filter(r => queryNotAllowed.every(a => !r.flags[a]));
  }, [rows, queryNotAllowed, queryCategory]);

  // Matrix filters
  const [filterCategory, setFilterCategory] = useLocalState<string | "All">("tt_allergen_filter_category", "All");
  const [search, setSearch] = useLocalState<string>("tt_allergen_search", "");

  const visible = useMemo(() => rows.filter(r => (filterCategory==="All" || (r.category ?? "Other")===filterCategory) && (!search || r.name.toLowerCase().includes(search.toLowerCase()))), [rows, filterCategory, search]);

  function printMatrix(){ window.print(); }
  function printSafe(){
    const html = document.getElementById("safe-list")?.outerHTML ?? "";
    const w = window.open("","_blank"); if(!w) return;
    w.document.write(`<html><head><title>Safe items</title></head><body>${html}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  }
  function exportCSV(){
    const header = ["Item","Category",...ALLERGENS.map(a=>`${a.id3} ${a.label}`)];
    const out = rows.map(r => [r.name, r.category??"", ...ALLERGENS.map(a=> r.flags[a.key] ? "Yes":"No")]);
    csvDownload(`allergen-matrix_${todayISO()}.csv`, [header, ...out]);
  }
  function onDelete(id:string){ setRows(prev=>prev.filter(r=>r.id!==id)); }

  const [modal, setModal] = useState<{open:boolean; editing?: Row|null}>({open:false});

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <CaretCSS />
      <NavTabs />
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Review box */}
        <Card className={reviewStatus.ok ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Allergen register review</div>
              <p className="text-xs text-slate-700">Review your allergen matrix regularly (recommended every {review.days} days). Record who reviewed and when.</p>
              <p className="text-xs text-slate-700 mt-1">
                Last reviewed: <strong>{review.last ? formatDDMMYYYY(review.last) : "—"}</strong>
                {review.by ? <> by <strong>{review.by}</strong></> : null}
                {!reviewStatus.ok && <><span> • </span><span className="text-rose-700 font-medium">Overdue {reviewStatus.overdueBy ?? 0} days</span></>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Interval (days)</label>
              <input type="number" min={1} className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm" value={review.days} onChange={(e)=> setReview({...review, days:Number((e.target as HTMLInputElement).value||30)})}/>
              <Button variant="outline" onClick={()=>{
                const who = prompt("Your full name (signature)");
                if(!who) return;
                setReview({...review, last: todayISO(), by: who});
              }}>Mark reviewed today</Button>
            </div>
          </CardContent>
        </Card>

        {/* QUERY */}
        <details className="rounded-lg border border-gray-200 bg-white">
          <summary className="flex w-full items-center justify-between">
            <span className="inline-flex items-center gap-2"><span className="caret">▸</span>Allergen query</span>
            <Button variant="outline" onClick={(e)=>{ e.preventDefault(); printSafe(); }}>Print Safe Items</Button>
          </summary>
          <div className="px-6 py-4">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="rounded-md border border-gray-300 px-3 py-2 text-sm" value={queryCategory} onChange={(e)=>setQueryCategory((e.target as HTMLSelectElement).value as "All" | string)}>
                  <option value="All">All</option>
                  {["Starters","Mains","Sides","Desserts","Drinks","Other"].map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[240px]">
                <div className="text-sm mb-2">Exclude items containing:</div>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map(a=>{
                    const active = (queryNotAllowed).includes(a.key);
                    return (
                      <button key={a.key} onClick={()=> setQueryNotAllowed(prev => prev.includes(a.key) ? prev.filter(x=>x!==a.key) : [...prev,a.key])}
                        className={`rounded-md border px-2 py-1 text-sm ${active? "bg-slate-900 text-white border-slate-900":"bg-white text-slate-800 border-gray-300"}`} title={a.label}>
                        {a.icon} <span className="font-mono">{a.id3}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div id="safe-list" className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600"><tr><th className="py-2 px-3">Item</th><th className="py-2 px-3">Category</th></tr></thead>
                <tbody>
                  {safeItems.length ? safeItems.map(r=>(
                    <tr key={r.id} className="border-t border-gray-200">
                      <td className="py-2 px-3">{r.name}</td>
                      <td className="py-2 px-3">{r.category ?? "Other"}</td>
                    </tr>
                  )) : (
                    <tr><td className="py-4 px-3 text-sm text-neutral-500" colSpan={2}>
                      {queryNotAllowed.length ? "No matching safe items." : "Select allergens above to see safe items."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </details>

        {/* MATRIX */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="text-sm font-medium">Allergen matrix</div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setModal({ open: true, editing: null })}>+ Add item</Button>
              <ActionsDropdown
                items={[
                  { label: "Export CSV", onClick: exportCSV },
                  { label: "Export PDF", onClick: () => exportAllergensPDF(rows, "Allergen Matrix") },
                  { label: "Print matrix", onClick: printMatrix },
                ]}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="rounded-md border border-gray-300 px-3 py-2 text-sm" value={filterCategory} onChange={(e)=>setFilterCategory((e.target as HTMLSelectElement).value as "All" | string)}>
                  <option value="All">All</option>
                  {["Starters","Mains","Sides","Desserts","Drinks","Other"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[240px]">
                <label className="block text-sm mb-1">Search</label>
                <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Type item name…" value={search} onChange={(e)=>setSearch((e.target as HTMLInputElement).value)} />
              </div>
            </div>

            <div className="mb-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 mr-3"><span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">Yes</span> contains</span>
              <span className="inline-flex items-center gap-1 mr-3"><span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">No</span> does not contain</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Category</th>
                    {ALLERGENS.map(a => <th key={a.key} className="py-2 pr-2 text-center" title={a.label}>{a.icon} <span className="font-mono">{a.id3}</span></th>)}
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length ? visible.map(r=>(
                    <tr key={r.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{r.category ?? "Other"}</td>
                      {ALLERGENS.map(a=>{
                        const yes = !!r.flags[a.key];
                        return (
                          <td key={a.key} className="py-1 pr-2 text-center">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${yes? "bg-red-100 text-red-800":"bg-emerald-100 text-emerald-800"}`} title={yes? "Yes (contains)":"No (does not contain)"}>{yes? "Yes":"No"}</span>
                          </td>
                        );
                      })}
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" title="Edit" onClick={() => setModal({ open: true, editing: r })}>✎</Button>
                          <Button variant="ghost" title="Delete" onClick={() => onDelete(r.id)}>🗑</Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={ALLERGENS.length+3} className="py-8 text-center text-sm text-neutral-500">No items.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom legend */}
        <details className="rounded-lg border border-gray-200 bg-white">
          <summary className="flex w-full items-center gap-2"><span className="caret">▸</span>Allergen key (legend)</summary>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ALLERGENS.map(a => (
                <div key={a.key} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                  <div className="text-lg">{a.icon}</div>
                  <div><div className="text-sm font-medium"><span className="font-mono mr-2">{a.id3}</span>{a.label}</div>
                    <div className="text-xs text-slate-600">Mark “Yes” if present in the dish (including traces where relevant).</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      </main>

      {/* Modal */}
      {modal.open && (
        <ItemModal
          initial={modal.editing ?? null}
          onClose={() => setModal({ open: false })}
          onSave={(row) => {
            if (row.id) setRows(prev => prev.map(r => r.id === row.id ? (row as Row) : r));
            else {
              const newRow: Row = { id: uid(), name: row.name ?? "", category: row.category, flags: ensureFlags(row.flags as Partial<Flags> | undefined), notes: row.notes, locked: !!row.locked };
              setRows(prev => [...prev, newRow]);
              upsertAllergenItem({ name: newRow.name, category: newRow.category, notes: newRow.notes, flags: newRow.flags, locked: newRow.locked }).catch(() => {});
            }
            setModal({ open: false });
          }}
        />
      )}
    </div>
  );
}

/* Modal */
function ItemModal({ initial, onClose, onSave }: { initial: Row|null; onClose:()=>void; onSave:(row: Partial<Row> & {id?:string})=>void }) {
  const [form,setForm]=useState<Partial<Row>>(initial ?? { name:"", category:"Mains", flags: emptyFlags(), notes:"" });
  const flags = ensureFlags(form.flags);
  function updateFlag(key: AllergenKey, value: boolean) { const next: Flags = { ...flags, [key]: value }; setForm({ ...form, flags: next }); }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg" onClick={(e)=>e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial? "Edit item":"Add item"}</h2>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-sm mb-1">Item name</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.name??""} onChange={(e)=>setForm({...form, name:(e.target as HTMLInputElement).value})}/></div>
            <div><label className="block text-sm mb-1">Category</label>
              <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.category??"Mains"} onChange={(e)=>setForm({...form, category:(e.target as HTMLSelectElement).value})}>
                <option>Starters</option><option>Mains</option><option>Sides</option><option>Desserts</option><option>Drinks</option><option>Other</option>
              </select></div>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Allergens</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {ALLERGENS.map(a=>(
                <label key={a.key} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={flags[a.key]} onChange={(e)=>updateFlag(a.key, (e.target as HTMLInputElement).checked)} />
                  {a.icon} <span className="font-mono">{a.id3}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Notes (optional)</label>
            <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3} value={form.notes ?? ""} onChange={(e)=>setForm({...form, notes:(e.target as HTMLTextAreaElement).value})}/>
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={()=>onSave(form)} disabled={!form.name}>Save</Button>
        </div>
      </div>
    </div>
  );
}
