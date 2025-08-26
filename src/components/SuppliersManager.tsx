"use client";

import React, { useEffect, useState, useRef } from "react";
import NavTabs from "./NavTabs";
import { exportSuppliersPDF } from "@/lib/pdf";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-gray-200 bg-white ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>{children}</div>
);
const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  const { variant = "primary", className = "", type = "button", ...rest } = props;
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "outline"
      ? "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50"
      : "text-slate-700 hover:bg-gray-100";
  return <button type={type} className={`${base} ${styles} ${className}`} {...rest} />;
}

function useClickAway<T extends HTMLElement>(onAway: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onAway();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onAway]);
  return ref;
}

type Supplier = {
  id: string;
  name: string;
  categories: string[];
  contact?: string;
  phone?: string;
  email?: string;
  docAllergen?: string | null;
  docHaccp?: string | null;
  docInsurance?: string | null;
  reviewEveryDays?: number;
  notes?: string;
};

function uid() { return Math.random().toString(36).slice(2); }
function todayISO() { return new Date().toISOString().slice(0,10); }
function csvDownload(filename: string, rows: (string|number)[][]) {
  const csv = rows.map(r => r.map(c => {
    const s = String(c ?? ""); return s.includes(",")||s.includes("\n")||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"}); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

/* CSV parser */
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []; let cur: string[] = []; let field = ""; let inQuotes = false;
  function pushField() { cur.push(field); field = ""; }
  function pushRow() { rows.push(cur); cur = []; }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") pushField();
      else if (ch === "\r") {}
      else if (ch === "\n") { pushField(); pushRow(); }
      else field += ch;
    }
  }
  pushField(); if (cur.length) pushRow();
  const headers = rows.shift() ?? [];
  return { headers, rows };
}

export default function SuppliersManager() {
  const [rows, setRows] = useState<Supplier[]>(() => {
    try { const raw = localStorage.getItem("tt_suppliers_rows"); return raw? JSON.parse(raw): []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("tt_suppliers_rows", JSON.stringify(rows)); }, [rows]);

  const [modal, setModal] = useState<{open:boolean; editing?: Supplier|null}>({open:false});

  function exportCSV() {
    const header = ["Supplier","Categories","Contact","Phone","Email","AllergenDoc","HACCP","Insurance","ReviewEveryDays","Notes"];
    const out = rows.map(r => [r.name, r.categories.join("; "), r.contact??"", r.phone??"", r.email??"", r.docAllergen??"", r.docHaccp??"", r.docInsurance??"", r.reviewEveryDays??"", r.notes??""]);
    csvDownload(`suppliers_${todayISO()}.csv`, [header, ...out]);
  }
  function printList() {
    const html = (document.getElementById("suppliers-table") as HTMLElement | null)?.outerHTML ?? "";
    const w = window.open("", "_blank"); if(!w) return;
    w.document.write(`<html><head><title>Suppliers</title></head><body>${html}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  }

  function importFromText(text: string) {
    const parsed = parseCSV(text);
    const H = parsed.headers.map(h => h.trim().toLowerCase());
    const idx = {
      name: H.findIndex(h => h === "supplier" || h === "name"),
      categories: H.findIndex(h => h === "categories"),
      contact: H.findIndex(h => h === "contact"),
      phone: H.findIndex(h => h === "phone"),
      email: H.findIndex(h => h === "email"),
      allergen: H.findIndex(h => h.includes("allergen")),
      haccp: H.findIndex(h => h.includes("haccp") || h.includes("food safety")),
      insurance: H.findIndex(h => h.includes("insurance") || h.includes("audit")),
      review: H.findIndex(h => h.includes("review")),
      notes: H.findIndex(h => h === "notes"),
    };

    const out: Supplier[] = [];
    for (const r of parsed.rows) {
      const name = (r[idx.name] ?? "").toString().trim();
      if (!name) continue;
      out.push({
        id: uid(),
        name,
        categories: (r[idx.categories] ?? "").toString().split(/[,;]\s*/).filter(Boolean),
        contact: (r[idx.contact] ?? "").toString() || undefined,
        phone: (r[idx.phone] ?? "").toString() || undefined,
        email: (r[idx.email] ?? "").toString() || undefined,
        docAllergen: ((r[idx.allergen] ?? "") as string) || null,
        docHaccp: ((r[idx.haccp] ?? "") as string) || null,
        docInsurance: ((r[idx.insurance] ?? "") as string) || null,
        reviewEveryDays: Number(r[idx.review] ?? "") || undefined,
        notes: ((r[idx.notes] ?? "") as string) || undefined,
      });
    }
    if (!out.length) { alert("No valid rows found."); return; }
    setRows(prev => [...prev, ...out]);
    alert(`Imported ${out.length} suppliers`);
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">Suppliers</div>
            <div className="flex items-center gap-2">
              <Button onClick={()=>setModal({open:true, editing:null})}>+ Add supplier</Button>
              <ActionsDropdown onExport={exportCSV} onExportPdf={()=>exportSuppliersPDF(rows, "Suppliers")} onPrint={printList} onImportText={importFromText} />
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto" id="suppliers-table">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-2 pr-3">Supplier</th>
                    <th className="py-2 pr-3">Categories</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map(r => (
                    <tr key={r.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{r.categories.join(", ")}</td>
                      <td className="py-2 pr-3">{r.contact ?? "—"}</td>
                      <td className="py-2 pr-3">{r.phone ?? "—"}</td>
                      <td className="py-2 pr-3">{r.email ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" title="Edit" onClick={()=>setModal({open:true, editing:r})}>✎</Button>
                          <Button variant="ghost" title="Delete" onClick={()=>{
                            const name = r.name || "this supplier";
                            if(!confirm(`Delete ${name}?`)) return;
                            setRows(prev=>prev.filter(x=>x.id!==r.id));
                          }}>🗑</Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-neutral-500">No suppliers.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {modal.open && (
        <SupplierModal
          initial={modal.editing ?? null}
          onClose={()=>setModal({open:false})}
          onSave={(s)=>{
            if(s.id){
              setRows(prev=>prev.map(r=>r.id===s.id? s: r));
            } else {
              const withId = { ...s, id: uid() } as Supplier;
              setRows(prev=>[...prev, withId]);

              // cloud insert for NEW suppliers (fixed promise chain)
              import("@/app/actions/db")
                .then(({ upsertSupplier }) =>
                  upsertSupplier({
                    name: withId.name,
                    categories: withId.categories,
                    contact: withId.contact,
                    phone: withId.phone,
                    email: withId.email,
                    docAllergen: withId.docAllergen ?? null,
                    docHaccp: withId.docHaccp ?? null,
                    docInsurance: withId.docInsurance ?? null,
                    reviewEveryDays: withId.reviewEveryDays,
                    notes: withId.notes,
                  })
                )
                .catch(() => {});
            }
            setModal({open:false});
          }}
        />
      )}
    </div>
  );
}

function ActionsDropdown({
  onExport, onExportPdf, onPrint, onImportText,
}: { onExport: () => void; onExportPdf: () => void; onPrint: () => void; onImportText: (csvText: string) => void; }) {
  const [open, setOpen] = useState(false);
  const ref = useClickAway<HTMLDivElement>(() => setOpen(false));
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { onImportText(String(reader.result ?? "")); };
    reader.readAsText(f);
    e.target.value = "";
  }

  return (
    <div className="relative" ref={ref}>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
      <Button variant="outline" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>More ▾</Button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-52 rounded-md border border-gray-200 bg-white shadow">
          <button role="menuitem" className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onExport(); }}>Export CSV</button>
          <button role="menuitem" className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onExportPdf(); }}>Export PDF</button>
          <button role="menuitem" className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setOpen(false); fileRef.current?.click(); }}>Import CSV</button>
          <button role="menuitem" className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onPrint(); }}>Print list</button>
        </div>
      )}
    </div>
  );
}

function SupplierModal({
  initial, onClose, onSave,
}: { initial: Supplier|null, onClose:()=>void, onSave:(s:Supplier)=>void }) {
  const [form, setForm] = useState<Supplier>(initial ?? {
    id: "", name: "", categories: [], reviewEveryDays: 180,
    contact:"", phone:"", email:"", docAllergen:null, docHaccp:null, docInsurance:null, notes:""
  });

  function submit(e?: React.FormEvent) { e?.preventDefault(); if(!form.name) return; onSave(form); }
  function toggleCategory(c: string) {
    setForm(f => f.categories.includes(c) ? {...f, categories: f.categories.filter(x=>x!==c)} : {...f, categories:[...f.categories, c]});
  }
  const CAT = ["Dairy","Meat","Bakery","Produce","Dry Goods","Beverages","Other"];

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form className="w-full max-w-2xl rounded-xl bg-white shadow-lg" onClick={(e)=>e.stopPropagation()} onSubmit={submit}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial? "Edit supplier":"Add supplier"}</h2>
          <Button variant="outline" onClick={onClose} type="button">Close</Button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-sm mb-1">Supplier name</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required />
            </div>
            <div><label className="block text-sm mb-1">Contact person</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contact??""} onChange={(e)=>setForm({...form, contact:e.target.value})}/>
            </div>
            <div><label className="block text-sm mb-1">Phone</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.phone??""} onChange={(e)=>setForm({...form, phone:e.target.value})}/>
            </div>
            <div><label className="block text-sm mb-1">Email</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.email??""} onChange={(e)=>setForm({...form, email:e.target.value})}/>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Categories</div>
            <div className="flex flex-wrap gap-2">
              {CAT.map(c => (
                <button key={c} onClick={(e)=>{e.preventDefault(); toggleCategory(c);}}
                  className={`rounded-md border px-2 py-1 text-sm ${form.categories.includes(c)? "bg-slate-900 text-white border-slate-900":"bg-white text-slate-800 border-gray-300"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-sm mb-1">Review every (days)</label>
              <input type="number" min={1} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.reviewEveryDays ?? 180} onChange={(e)=>setForm({...form, reviewEveryDays:Number(e.target.value||180)})}/>
            </div>
            <div><label className="block text-sm mb-1">Notes</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.notes ?? ""} onChange={(e)=>setForm({...form, notes:e.target.value})}/>
            </div>
          </div>

          <details className="rounded-md border border-gray-200 bg-white">
            <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium">▸ Additional information</summary>
            <div className="border-top border-gray-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="block text-sm mb-1">Allergen statement date</label>
                  <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.docAllergen ?? ""} onChange={(e)=>setForm({...form, docAllergen:e.target.value || null})}/>
                </div>
                <div><label className="block text-sm mb-1">HACCP/food safety cert date</label>
                  <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.docHaccp ?? ""} onChange={(e)=>setForm({...form, docHaccp:e.target.value || null})}/>
                </div>
                <div><label className="block text-sm mb-1">Insurance/3rd-party audit date</label>
                  <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.docInsurance ?? ""} onChange={(e)=>setForm({...form, docInsurance:e.target.value || null})}/>
                </div>
              </div>
            </div>
          </details>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!form.name}>Save</Button>
        </div>
      </form>
    </div>
  );
}
