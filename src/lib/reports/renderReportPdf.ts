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

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}