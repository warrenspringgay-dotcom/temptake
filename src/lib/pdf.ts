// src/lib/pdf.ts
import jsPDF from "jspdf";
import "jspdf-autotable";

export type TempLog = {
  timeISO: string;
  item: string;
  tempC: number;
  device?: string | null;
  notes?: string | null;
};
export type Supplier = {
  name: string;
  categories: string[];
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  docAllergen?: string | null;
  docHaccp?: string | null;
  docInsurance?: string | null;
  reviewEveryDays?: number | null;
  notes?: string | null;
};
export type AllergenFlags = Record<
  | "gluten" | "crustaceans" | "eggs" | "fish" | "peanuts" | "soybeans" | "milk"
  | "nuts" | "celery" | "mustard" | "sesame" | "sulphites" | "lupin" | "molluscs", boolean
>;
export type AllergenItem = {
  name: string;
  category?: string | null;
  notes?: string | null;
  flags: AllergenFlags;
};
export type ReviewMeta = { days: number; last: string | null; by?: string | null };

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" }) : "—";
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Simple one‑section PDFs ---------- */

export function exportTempLogsPDF(logs: TempLog[], title = "Temperature Logs", logoDataUrl?: string) {
  const doc = new jsPDF();
  if (logoDataUrl) {
    const w = doc.internal.pageSize.getWidth();
    doc.addImage(logoDataUrl, "PNG", w - 34, 8, 24, 24);
  }
  doc.text(title, 14, 16);
  doc.autoTable({
    head: [["When", "Item", "Temp (°C)", "Device", "Notes"]],
    body: logs.map(l => [fmtDateTime(l.timeISO), l.item, l.tempC.toFixed(1), l.device ?? "—", l.notes ?? "—"]),
    startY: 22,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] }
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}_${today()}.pdf`);
}

export function exportSuppliersPDF(suppliers: Supplier[], title = "Suppliers", logoDataUrl?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  if (logoDataUrl) {
    const w = doc.internal.pageSize.getWidth();
    doc.addImage(logoDataUrl, "PNG", w - 34, 8, 24, 24);
  }
  doc.text(title, 14, 16);
  doc.autoTable({
    head: [["Supplier", "Categories", "Contact", "Phone", "Email", "Allergen stmt", "HACCP cert", "Insurance/audit", "Review (days)", "Notes"]],
    body: suppliers.map(s => [
      s.name,
      s.categories.join(", "),
      s.contact ?? "—",
      s.phone ?? "—",
      s.email ?? "—",
      fmtDate(s.docAllergen),
      fmtDate(s.docHaccp),
      fmtDate(s.docInsurance),
      s.reviewEveryDays ?? "—",
      s.notes ?? "—",
    ]),
    startY: 22,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] }
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}_${today()}.pdf`);
}

export function exportAllergensPDF(items: AllergenItem[], title = "Allergen Matrix", logoDataUrl?: string) {
  const headers = [
    "Item", "Category", "GLU","CRU","EGG","FIS","PEA","SOY","MIL","NUT","CEL","MUS","SES","SUL","LUP","MOL","Notes"
  ];
  const keyOrder: (keyof AllergenFlags)[] = ["gluten","crustaceans","eggs","fish","peanuts","soybeans","milk","nuts","celery","mustard","sesame","sulphites","lupin","molluscs"];

  const doc = new jsPDF({ orientation: "landscape" });
  if (logoDataUrl) {
    const w = doc.internal.pageSize.getWidth();
    doc.addImage(logoDataUrl, "PNG", w - 34, 8, 24, 24);
  }
  doc.text(title, 14, 16);
  doc.autoTable({
    head: [headers],
    body: items.map(i => [
      i.name,
      i.category ?? "Other",
      ...keyOrder.map(k => i.flags?.[k] ? "Yes" : "No"),
      i.notes ?? "—",
    ]),
    startY: 22,
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [15, 23, 42] }
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}_${today()}.pdf`);
}

/* ---------- Full Audit PDF with logo + signature ---------- */

export function exportAuditPDF(opts: {
  brand?: string;
  rangeLabel: string;
  review?: ReviewMeta | null;
  logs: TempLog[];
  suppliers: Supplier[];
  allergenItems: AllergenItem[];
  logoDataUrl?: string;
}) {
  const { brand = "TempTake", rangeLabel, review, logs, suppliers, allergenItems, logoDataUrl } = opts;
  const doc = new jsPDF();

  // Cover
  const pageW = doc.internal.pageSize.getWidth();
  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", pageW - 34, 8, 24, 24);
  doc.setFontSize(16);
  doc.text(`${brand} – Audit Report`, 14, 18);
  doc.setFontSize(11);
  doc.text(`Period: ${rangeLabel}`, 14, 28);
  if (review) {
    doc.text(
      `Allergen register review: ${review.last ? fmtDate(review.last) : "—"}${review.by ? ` (by ${review.by})` : ""} • Interval: ${review.days} days`,
      14, 36
    );
  }
  doc.text(`Generated: ${fmtDateTime(new Date().toISOString())}`, 14, 44);

  // Section: Temperature logs
  doc.autoTable({
    startY: 54,
    margin: { top: 54 },
    head: [["Temperature logs", "", "", "", ""]],
    body: [],
    theme: "plain",
    styles: { fontStyle: "bold", fontSize: 12 }
  });
  doc.autoTable({
    head: [["When", "Item", "Temp (°C)", "Device", "Notes"]],
    body: logs.map(l => [fmtDateTime(l.timeISO), l.item, l.tempC.toFixed(1), l.device ?? "—", l.notes ?? "—"]),
    startY: doc.lastAutoTable?.finalY ?? 60,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  // Section: Suppliers
  doc.autoTable({
    startY: (doc.lastAutoTable?.finalY ?? 60) + 8,
    margin: { top: (doc.lastAutoTable?.finalY ?? 60) + 8 },
    head: [["Suppliers (docs + contacts)", "", "", "", ""]],
    body: [],
    theme: "plain",
    styles: { fontStyle: "bold", fontSize: 12 }
  });
  doc.autoTable({
    head: [["Supplier", "Contact", "Phone", "Email", "Allergen stmt", "HACCP", "Insurance", "Review (days)"]],
    body: suppliers.map(s => [
      s.name, s.contact ?? "—", s.phone ?? "—", s.email ?? "—",
      fmtDate(s.docAllergen), fmtDate(s.docHaccp), fmtDate(s.docInsurance),
      s.reviewEveryDays ?? "—",
    ]),
    startY: doc.lastAutoTable?.finalY ?? 60,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  // New page: Allergen matrix
  doc.addPage("landscape");
  if (logoDataUrl) {
    const w = doc.internal.pageSize.getWidth();
    doc.addImage(logoDataUrl, "PNG", w - 34, 8, 24, 24);
  }
  doc.autoTable({
    head: [["Allergen matrix", "", "", "", ""]],
    body: [],
    theme: "plain",
    styles: { fontStyle: "bold", fontSize: 12 }
  });
  const keyOrder: (keyof AllergenFlags)[] = ["gluten","crustaceans","eggs","fish","peanuts","soybeans","milk","nuts","celery","mustard","sesame","sulphites","lupin","molluscs"];
  doc.autoTable({
    head: [["Item","Category","GLU","CRU","EGG","FIS","PEA","SOY","MIL","NUT","CEL","MUS","SES","SUL","LUP","MOL","Notes"]],
    body: allergenItems.map(i => [
      i.name, i.category ?? "Other",
      ...keyOrder.map(k => i.flags?.[k] ? "Yes" : "No"),
      i.notes ?? "—"
    ]),
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  // Sign‑off block
  const y = (doc.lastAutoTable?.finalY ?? 40) + 12;
  doc.setFontSize(12);
  doc.text("Sign-off", 14, y);
  doc.setFontSize(10);
  doc.text("Name:", 14, y + 12);
  doc.text("Signature:", 14, y + 28);
  doc.text("Date:", 120, y + 12);
  doc.line(30, y + 12, 110, y + 12);
  doc.line(36, y + 28, 110, y + 28);
  doc.line(130, y + 12, 180, y + 12);

  doc.save(`audit-report_${today()}.pdf`);
}
