import type { ReportData } from "@/lib/reports/buildReportData";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function badge(text: string, tone: "green" | "red" | "amber" | "slate" = "slate") {
  const map = {
    green: "background:#dcfce7;color:#166534;border:1px solid #bbf7d0;",
    red: "background:#fee2e2;color:#991b1b;border:1px solid #fecaca;",
    amber: "background:#fef3c7;color:#92400e;border:1px solid #fde68a;",
    slate: "background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;",
  };

  return `<span style="display:inline-block;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:600;${map[tone]}">${escapeHtml(
    text
  )}</span>`;
}

function table(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) {
  const head = headers
    .map(
      (h) =>
        `<th style="text-align:left;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;font-size:12px;color:#475569;">${escapeHtml(
          h
        )}</th>`
    )
    .join("");

  const body = rows.length
    ? rows
        .map((row) => {
          const cols = row
            .map(
              (cell) =>
                `<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:13px;color:#0f172a;">${escapeHtml(
                  cell
                )}</td>`
            )
            .join("");
          return `<tr>${cols}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${headers.length}" style="padding:14px 12px;color:#64748b;font-size:13px;">No data in this section.</td></tr>`;

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function section(title: string, content: string, subtitle?: string) {
  return `
    <div style="margin-top:24px;">
      <h2 style="margin:0 0 8px;font-size:18px;line-height:24px;color:#0f172a;">${escapeHtml(
        title
      )}</h2>
      ${
        subtitle
          ? `<p style="margin:0 0 12px;font-size:13px;line-height:20px;color:#64748b;">${escapeHtml(
              subtitle
            )}</p>`
          : ""
      }
      ${content}
    </div>
  `;
}

export function renderReportHtml(report: ReportData) {
  const latestRating =
    report.hygiene.latest?.rating != null
      ? `${report.hygiene.latest.rating}/5`
      : "—";

  const summaryCards = [
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
  ]
    .map(
      ([label, value]) => `
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#ffffff;">
          <div style="font-size:12px;color:#64748b;">${escapeHtml(label)}</div>
          <div style="margin-top:6px;font-size:24px;font-weight:700;color:#0f172a;">${escapeHtml(
            value
          )}</div>
        </div>
      `
    )
    .join("");

  const tempsTable = table(
    ["Date", "Staff", "Location", "Item", "Temp (°C)", "Target", "Status"],
    report.temps.slice(0, 30).map((r) => [
      formatISOToUK(r.date),
      r.staff,
      r.location,
      r.item,
      r.temp_c ?? "—",
      r.target_key ?? "—",
      r.status ?? "—",
    ])
  );

  const incidentsTable = table(
    ["Date", "Time", "Type", "By", "Details", "Corrective action"],
    report.incidents.slice(0, 20).map((r) => [
      formatISOToUK(r.happened_on),
      formatTimeHM(r.created_at),
      r.type ?? "Incident",
      r.created_by ? r.created_by.toUpperCase() : "—",
      r.details ?? "—",
      r.corrective_action ?? "—",
    ])
  );

  const loggedIncidentsTable = table(
    ["Date", "Time", "Type", "By", "Details", "Immediate action", "Preventive action"],
    report.loggedIncidents.slice(0, 20).map((r) => [
      formatISOToUK(r.happened_on),
      formatTimeHM(r.created_at),
      r.type ?? "Incident",
      r.created_by ? r.created_by.toUpperCase() : "—",
      r.details ?? "—",
      r.immediate_action ?? "—",
      r.preventive_action ?? "—",
    ])
  );

  const cleaningRunsTable = table(
    ["Date", "Time", "Category", "Task", "Staff"],
    report.cleaningRuns.slice(0, 20).map((r) => [
      formatISOToUK(r.run_on),
      formatTimeHM(r.done_at),
      r.category,
      r.task,
      r.done_by ?? "—",
    ])
  );

  const signoffsTable = table(
    ["Date", "Time", "Signed by", "Notes"],
    report.signoffs.slice(0, 20).map((r) => [
      formatISOToUK(r.signoff_on),
      formatTimeHM(r.created_at),
      r.signed_by ? r.signed_by.toUpperCase() : "—",
      r.notes ?? "—",
    ])
  );

  const staffReviewsTable = table(
    ["Date", "Staff", "Manager", "Location", "Score", "Notes"],
    report.staffReviews.slice(0, 20).map((r) => [
      formatISOToUK(r.reviewed_on),
      r.staff_initials ? `${r.staff_initials.toUpperCase()} · ${r.staff_name}` : r.staff_name,
      r.reviewer ?? "—",
      r.location_name ?? "—",
      `${r.rating}/5`,
      r.notes ?? "—",
    ])
  );

  const trainingTable = table(
    ["Staff", "Course", "Awarded", "Expires", "Status", "Notes"],
    report.education.slice(0, 20).map((r) => [
      r.staff_initials ? `${r.staff_initials.toUpperCase()} · ${r.staff_name}` : r.staff_name,
      r.type ?? "—",
      formatISOToUK(r.awarded_on),
      formatISOToUK(r.expires_on),
      r.status === "valid" ? "Valid" : r.status === "expired" ? "Expired" : "No expiry",
      r.notes ?? "—",
    ])
  );

  const allergenReviewsTable = table(
    ["Last review", "Next due", "Days", "Reviewer"],
    report.allergenLog.slice(0, 20).map((r) => [
      formatISOToUK(r.reviewed_on),
      formatISOToUK(r.next_due),
      r.days_until ?? "—",
      r.reviewer ?? "—",
    ])
  );

  const allergenEditsTable = table(
    ["Date", "Time", "Item", "Action", "By"],
    report.allergenChanges.slice(0, 20).map((r) => [
      formatISOToUK(r.created_at),
      formatTimeHM(r.created_at),
      r.item_name ?? "Unnamed item",
      r.action ?? "—",
      r.staff_initials ? r.staff_initials.toUpperCase() : "—",
    ])
  );

  const calibrationChecksTable = table(
    ["Date", "Staff", "Cold storage", "Probes", "Thermometers", "All calibrated", "Notes"],
    report.calibrationChecks.slice(0, 20).map((r) => [
      formatISOToUK(r.checked_on),
      r.staff_initials ? r.staff_initials.toUpperCase() : "—",
      r.cold_storage_checked ? "Yes" : "No",
      r.probes_checked ? "Yes" : "No",
      r.thermometers_checked ? "Yes" : "No",
      r.all_equipment_calibrated ? "Yes" : "No",
      r.notes ?? "—",
    ])
  );

  const hygieneHistory =
    report.hygiene.history.length > 1
      ? table(
          ["Rating", "Inspection date", "Authority", "Reference", "Certificate expiry", "Notes"],
          report.hygiene.history.slice(1, 10).map((r) => [
            r.rating != null ? `${r.rating}/5` : "—",
            formatISOToUK(r.visit_date),
            r.issuing_authority ?? "—",
            r.reference ?? "—",
            formatISOToUK(r.certificate_expires_at),
            r.notes ?? "—",
          ])
        )
      : `<div style="padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#64748b;font-size:13px;">No previous hygiene rating history for this location.</div>`;

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>TempTake report</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:960px;margin:0 auto;padding:24px;">
      <div style="border:1px solid #e2e8f0;border-radius:20px;background:#ffffff;overflow:hidden;">
        <div style="padding:28px 28px 20px;background:linear-gradient(135deg,#0f172a 0%,#111827 55%,#0b3b2e 100%);">
          <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#a7f3d0;font-weight:700;">
            TempTake
          </div>
          <h1 style="margin:10px 0 0;font-size:30px;line-height:36px;color:#ffffff;">
            Food safety report
          </h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:22px;color:#cbd5e1;">
            ${escapeHtml(report.meta.locationLabel)} · ${escapeHtml(
    formatISOToUK(report.meta.from)
  )} to ${escapeHtml(formatISOToUK(report.meta.to))}
          </p>
          <p style="margin:8px 0 0;font-size:13px;line-height:20px;color:#94a3b8;">
            Generated ${escapeHtml(formatISOToUK(report.meta.generatedAt))} at ${escapeHtml(
    formatTimeHM(report.meta.generatedAt)
  )}
          </p>
        </div>

        <div style="padding:24px 28px 28px;">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
            ${summaryCards}
          </div>

          ${section(
            "Food hygiene rating",
            `
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                ${badge(`Latest rating: ${latestRating}`, report.hygiene.latest?.rating != null && report.hygiene.latest.rating >= 3 ? "green" : "amber")}
                <span style="font-size:13px;color:#475569;">Last inspection: ${escapeHtml(
                  formatISOToUK(report.hygiene.latest?.visit_date)
                )}</span>
              </div>
            `
          )}

          ${section("Temperature logs", tempsTable, "First 30 records included in the email body.")}
          ${section("Failures and corrective actions", incidentsTable, "First 20 records included in the email body.")}
          ${section("Logged incidents", loggedIncidentsTable, "First 20 records included in the email body.")}
          ${section("Cleaning runs", cleaningRunsTable, "First 20 records included in the email body.")}
          ${section("Day sign-offs", signoffsTable, "First 20 records included in the email body.")}
          ${section("Manager QC reviews", staffReviewsTable, "First 20 records included in the email body.")}
          ${section("Training and certificates", trainingTable, "First 20 records included in the email body.")}
          ${section("Allergen reviews", allergenReviewsTable, "First 20 records included in the email body.")}
          ${section("Allergen edits", allergenEditsTable, "First 20 records included in the email body.")}
          ${section(
            "Calibration checks",
            calibrationChecksTable,
            report.meta.locationId ? "First 20 records included in the email body." : "No location selected means calibration data may be empty."
          )}
          ${section("Previous hygiene ratings", hygieneHistory)}

          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            Sent by TempTake. The attached PDF version should be used as the formal shareable report once you wire the PDF attachment in properly, because apparently nothing in software can just be done once.
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
  `;
}