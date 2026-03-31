import jsPDF from "jspdf";
import autoTableImport from "jspdf-autotable";
import type { ReportData } from "@/lib/reports/buildReportData";

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

type AutoTableCell = string | number;

type AutoTableOptions = {
  startY?: number;
  head?: AutoTableCell[][];
  body?: AutoTableCell[][];
  styles?: {
    fontSize?: number;
    cellPadding?: number;
    overflow?: "linebreak" | "ellipsize" | "hidden" | "visible";
  };
  headStyles?: {
    fillColor?: [number, number, number];
  };
  theme?: "grid" | "striped" | "plain";
  margin?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
};

const autoTable = autoTableImport as unknown as (
  doc: JsPDFWithAutoTable,
  options: AutoTableOptions
) => void;

const ALLERGEN_LABELS: Record<string, string> = {
  gluten: "Gluten",
  crustaceans: "Crustaceans",
  eggs: "Eggs",
  fish: "Fish",
  peanuts: "Peanuts",
  soybeans: "Soy",
  milk: "Milk",
  nuts: "Tree nuts",
  celery: "Celery",
  mustard: "Mustard",
  sesame: "Sesame",
  sulphites: "Sulphites",
  lupin: "Lupin",
  molluscs: "Molluscs",
};

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatISOToUK(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeHM(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalText(value: string | number | null | undefined) {
  return String(value ?? "—");
}

function presentAllergens(flags: Record<string, boolean> | null | undefined) {
  if (!flags) return "No allergens marked";
  const present = Object.entries(flags)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => ALLERGEN_LABELS[key] ?? key);

  return present.length ? present.join(", ") : "No allergens marked";
}

function addTitle(doc: JsPDFWithAutoTable, title: string, subtitle?: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 40, 40);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, 40, 56);
  }
}

function addSectionHeading(doc: JsPDFWithAutoTable, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 40, y);
}

function nextY(doc: JsPDFWithAutoTable, fallback: number) {
  return (doc.lastAutoTable?.finalY ?? fallback) + 18;
}

function ensurePage(doc: JsPDFWithAutoTable, y: number, minRemaining = 120) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - minRemaining) {
    doc.addPage();
    return 40;
  }
  return y;
}

function addWrappedBlock(
  doc: JsPDFWithAutoTable,
  label: string,
  content: string,
  y: number,
  width = 515
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label, 40, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(content || "—", width);
  doc.text(lines, 40, y + 12);

  return y + 12 + lines.length * 11;
}

function addBulletListBlock(
  doc: JsPDFWithAutoTable,
  label: string,
  items: string[],
  y: number,
  width = 500
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label, 40, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  if (!items.length) {
    doc.text("—", 50, y);
    return y + 12;
  }

  for (const item of items) {
    const lines = doc.splitTextToSize(`• ${item}`, width);
    doc.text(lines, 50, y);
    y += lines.length * 11 + 4;
  }

  return y;
}

export async function renderReportPdf(report: ReportData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  }) as JsPDFWithAutoTable;

  addTitle(
    doc,
    "TempTake Food Safety Report",
    `${report.meta.locationLabel} • ${formatISOToUK(report.meta.from)} to ${formatISOToUK(
      report.meta.to
    )} • Generated ${formatISOToUK(report.meta.generatedAt)} ${formatTimeHM(report.meta.generatedAt)}`
  );

  let y = 84;

  addSectionHeading(doc, "Summary", y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Temperature logs", report.summary.tempsCount],
      ["Cleaning runs", report.summary.cleaningRunsCount],
      ["Failures / incidents", report.summary.incidentsCount],
      ["Logged incidents", report.summary.loggedIncidentsCount],
      ["Day sign-offs", report.summary.signoffsCount],
      ["QC reviews", report.summary.staffReviewsCount],
      ["Training records", report.summary.educationCount],
      ["Allergen reviews", report.summary.allergenReviewsCount],
      ["Allergen edits", report.summary.allergenChangesCount],
      ["Calibration checks", report.summary.calibrationChecksCount],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [15, 23, 42] },
    theme: "grid",
  });

  y = nextY(doc, 120);
  y = ensurePage(doc, y);

  addSectionHeading(doc, "Food hygiene rating", y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Latest rating", "Inspection date", "Certificate expiry", "Authority", "Reference"]],
    body: [
      [
        report.hygiene.latest?.rating != null ? `${report.hygiene.latest.rating}/5` : "—",
        formatISOToUK(report.hygiene.latest?.visit_date),
        formatISOToUK(report.hygiene.latest?.certificate_expires_at),
        normalText(report.hygiene.latest?.issuing_authority),
        normalText(report.hygiene.latest?.reference),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [15, 23, 42] },
    theme: "grid",
  });

  if (report.hygiene.history.length > 1) {
    y = nextY(doc, 180);
    y = ensurePage(doc, y);
    addSectionHeading(doc, "Previous hygiene ratings", y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Rating", "Inspection", "Cert expiry", "Authority", "Reference", "Notes"]],
      body: report.hygiene.history.slice(1).map((r) => [
        r.rating != null ? `${r.rating}/5` : "—",
        formatISOToUK(r.visit_date),
        formatISOToUK(r.certificate_expires_at),
        normalText(r.issuing_authority),
        normalText(r.reference),
        normalText(r.notes),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42] },
      theme: "grid",
    });
  }

  const sections: Array<{
    title: string;
    head: string[];
    body: AutoTableCell[][];
    landscape?: boolean;
  }> = [
    {
      title: "Temperature logs",
      head: ["Date", "Staff", "Location", "Item", "Temp (°C)", "Target", "Status"],
      body: report.temps.map((r) => [
        formatISOToUK(r.date),
        r.staff,
        r.location,
        r.item,
        r.temp_c ?? "—",
        r.target_key ?? "—",
        r.status ?? "—",
      ]),
      landscape: true,
    },
    {
      title: "Failures and corrective actions",
      head: ["Date", "Time", "Type", "By", "Details", "Corrective action"],
      body: report.incidents.map((r) => [
        formatISOToUK(r.happened_on),
        formatTimeHM(r.created_at),
        r.type ?? "Incident",
        r.created_by ? r.created_by.toUpperCase() : "—",
        r.details ?? "—",
        r.corrective_action ?? "—",
      ]),
      landscape: true,
    },
    {
      title: "Logged incidents",
      head: ["Date", "Time", "Type", "By", "Details", "Immediate action", "Preventive action"],
      body: report.loggedIncidents.map((r) => [
        formatISOToUK(r.happened_on),
        formatTimeHM(r.created_at),
        r.type ?? "Incident",
        r.created_by ? r.created_by.toUpperCase() : "—",
        r.details ?? "—",
        r.immediate_action ?? "—",
        r.preventive_action ?? "—",
      ]),
      landscape: true,
    },
    {
      title: "Cleaning runs",
      head: ["Date", "Time", "Category", "Task", "Staff"],
      body: report.cleaningRuns.map((r) => [
        formatISOToUK(r.run_on),
        formatTimeHM(r.done_at),
        r.category,
        r.task,
        r.done_by ?? "—",
      ]),
    },
    {
      title: "Day sign-offs",
      head: ["Date", "Time", "Signed by", "Notes"],
      body: report.signoffs.map((r) => [
        formatISOToUK(r.signoff_on),
        formatTimeHM(r.created_at),
        r.signed_by ? r.signed_by.toUpperCase() : "—",
        r.notes ?? "—",
      ]),
    },
    {
      title: "Manager QC reviews",
      head: ["Date", "Staff", "Manager", "Location", "Score", "Notes"],
      body: report.staffReviews.map((r) => [
        formatISOToUK(r.reviewed_on),
        r.staff_initials ? `${r.staff_initials.toUpperCase()} · ${r.staff_name}` : r.staff_name,
        r.reviewer ?? "—",
        r.location_name ?? "—",
        `${r.rating}/5`,
        r.notes ?? "—",
      ]),
      landscape: true,
    },
    {
      title: "Training and certificates",
      head: ["Staff", "Course", "Awarded", "Expires", "Status", "Notes"],
      body: report.education.map((r) => [
        r.staff_initials ? `${r.staff_initials.toUpperCase()} · ${r.staff_name}` : r.staff_name,
        r.type ?? "—",
        formatISOToUK(r.awarded_on),
        formatISOToUK(r.expires_on),
        r.status === "valid" ? "Valid" : r.status === "expired" ? "Expired" : "No expiry",
        r.notes ?? "—",
      ]),
      landscape: true,
    },
    {
      title: "Allergen register",
      head: [
        "Item",
        "Category",
        "Allergens present",
        "Ingredients",
        "Prep / cross-contamination notes",
        "Label photo",
      ],
      body: report.allergenRegister.map((r) => [
        r.item,
        r.category ?? "—",
        presentAllergens(r.flags),
        r.ingredients_text ?? "No ingredients added.",
        r.notes ?? "—",
        r.ingredients_label_image_url ? "Uploaded" : "No image",
      ]),
      landscape: true,
    },
    {
      title: "Allergen reviews",
      head: ["Last review", "Next due", "Days", "Reviewer"],
      body: report.allergenLog.map((r) => [
        formatISOToUK(r.reviewed_on),
        formatISOToUK(r.next_due),
        r.days_until ?? "—",
        r.reviewer ?? "—",
      ]),
    },
    {
      title: "Allergen edits",
      head: ["Date", "Time", "Item", "Action", "By"],
      body: report.allergenChanges.map((r) => [
        formatISOToUK(r.created_at),
        formatTimeHM(r.created_at),
        r.item_name ?? "Unnamed item",
        r.action ?? "—",
        r.staff_initials ? r.staff_initials.toUpperCase() : "—",
      ]),
    },
    {
      title: "Calibration checks",
      head: ["Date", "Staff", "Cold storage", "Probes", "Thermometers", "All calibrated", "Notes"],
      body: report.calibrationChecks.map((r) => [
        formatISOToUK(r.checked_on),
        r.staff_initials ? r.staff_initials.toUpperCase() : "—",
        r.cold_storage_checked ? "Yes" : "No",
        r.probes_checked ? "Yes" : "No",
        r.thermometers_checked ? "Yes" : "No",
        r.all_equipment_calibrated ? "Yes" : "No",
        r.notes ?? "—",
      ]),
      landscape: true,
    },
  ];

  for (const section of sections) {
    doc.addPage(section.landscape ? "landscape" : "portrait");

    addTitle(
      doc,
      section.title,
      `${report.meta.locationLabel} • ${formatISOToUK(report.meta.from)} to ${formatISOToUK(
        report.meta.to
      )}`
    );

    autoTable(doc, {
      startY: 72,
      head: [section.head],
      body: section.body.length ? section.body : [["No data for this section."]],
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [15, 23, 42] },
      theme: "grid",
      margin: { left: 30, right: 30 },
    });
  }

  doc.addPage("landscape");
  addTitle(
    doc,
    "Training areas (SFBB coverage)",
    `${report.meta.locationLabel} • ${formatISOToUK(report.meta.from)} to ${formatISOToUK(
      report.meta.to
    )}`
  );

  const areaHeaders = [
    "Team member",
    "Cross-contamination",
    "Cleaning",
    "Chilling",
    "Cooking",
    "Allergens",
    "Management",
  ];

  const grouped = new Map<
    string,
    {
      name: string;
      byArea: Record<string, { selected: boolean; awarded_on: string | null }>;
    }
  >();

  for (const row of report.trainingAreas) {
    if (!grouped.has(row.member_id)) {
      grouped.set(row.member_id, {
        name: row.name,
        byArea: {},
      });
    }
    grouped.get(row.member_id)!.byArea[row.area] = {
      selected: row.selected,
      awarded_on: row.awarded_on,
    };
  }

  const matrixRows: AutoTableCell[][] = Array.from(grouped.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => [
      row.name,
      row.byArea["Cross-contamination"]?.selected
        ? `✓ ${formatISOToUK(row.byArea["Cross-contamination"]?.awarded_on)}`
        : "—",
      row.byArea["Cleaning"]?.selected
        ? `✓ ${formatISOToUK(row.byArea["Cleaning"]?.awarded_on)}`
        : "—",
      row.byArea["Chilling"]?.selected
        ? `✓ ${formatISOToUK(row.byArea["Chilling"]?.awarded_on)}`
        : "—",
      row.byArea["Cooking"]?.selected
        ? `✓ ${formatISOToUK(row.byArea["Cooking"]?.awarded_on)}`
        : "—",
      row.byArea["Allergens"]?.selected
        ? `✓ ${formatISOToUK(row.byArea["Allergens"]?.awarded_on)}`
        : "—",
      row.byArea["Management"]?.selected
        ? `✓ ${formatISOToUK(row.byArea["Management"]?.awarded_on)}`
        : "—",
    ]);

  autoTable(doc, {
    startY: 72,
    head: [areaHeaders],
    body: matrixRows.length ? matrixRows : [["No training area data."]],
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42] },
    theme: "grid",
    margin: { left: 30, right: 30 },
  });

  doc.addPage("portrait");
  addTitle(
    doc,
    "HACCP Procedures",
    `${report.meta.locationLabel} • ${formatISOToUK(report.meta.from)} to ${formatISOToUK(
      report.meta.to
    )}`
  );

  autoTable(doc, {
    startY: 72,
    head: [["Field", "Value"]],
    body: [
      ["Document title", report.haccp.meta.title],
      ["Version", report.haccp.meta.version],
      ["Status", report.haccp.meta.status === "published" ? "Published" : "Draft"],
      ["Site / address", report.haccp.meta.siteAddress || report.meta.locationLabel],
      ["Reviewed by", report.haccp.meta.reviewedBy ?? "—"],
      ["Last reviewed", formatISOToUK(report.haccp.meta.lastReviewedAt)],
      ["Next review due", formatISOToUK(report.haccp.meta.nextReviewDue)],
      ["Published by", report.haccp.meta.publishedBy ?? "—"],
      ["Published at", `${formatISOToUK(report.haccp.meta.publishedAt)} ${formatTimeHM(report.haccp.meta.publishedAt)}`],
      ["Notes", report.haccp.meta.notes || "—"],
    ],
    styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42] },
    theme: "grid",
    margin: { left: 30, right: 30 },
  });

  for (const [index, procedure] of report.haccp.procedures.entries()) {
    doc.addPage("portrait");

    addTitle(
      doc,
      `HACCP Procedure ${index + 1}`,
      `${procedure.title} • ${report.meta.locationLabel}`
    );

    let procedureY = 78;

    procedureY = addWrappedBlock(
      doc,
      "Category / Type",
      `${procedure.category.replaceAll("_", " ")}${procedure.isCcp ? " • CCP" : " • Control procedure"}`,
      procedureY
    );
    procedureY += 8;

    procedureY = addWrappedBlock(doc, "Summary", procedure.summary, procedureY);
    procedureY += 8;

    procedureY = addWrappedBlock(doc, "Scope", procedure.scope, procedureY);
    procedureY += 10;

    procedureY = ensurePage(doc, procedureY, 280);
    procedureY = addBulletListBlock(doc, "Hazards", procedure.hazards, procedureY);
    procedureY += 6;

    procedureY = ensurePage(doc, procedureY, 240);
    procedureY = addBulletListBlock(doc, "Control measures", procedure.controlMeasures, procedureY);
    procedureY += 6;

    procedureY = ensurePage(doc, procedureY, 240);
    procedureY = addBulletListBlock(doc, "Critical limits", procedure.criticalLimits, procedureY);
    procedureY += 6;

    procedureY = ensurePage(doc, procedureY, 240);
    procedureY = addBulletListBlock(doc, "Monitoring", procedure.monitoring, procedureY);
    procedureY += 6;

    procedureY = ensurePage(doc, procedureY, 240);
    procedureY = addBulletListBlock(doc, "Corrective actions", procedure.correctiveActions, procedureY);
    procedureY += 6;

    procedureY = ensurePage(doc, procedureY, 240);
    addBulletListBlock(doc, "Verification / review", procedure.verification, procedureY);
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}