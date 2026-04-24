export type FourWeekTempRepeat = {
  key: string;
  area: string;
  item: string;
  count: number;
  lastSeenOn: string;
};

export type FourWeekMissedClean = {
  taskId: string;
  task: string;
  category: string | null;
  area: string | null;
  missedCount: number;
  lastMissedOn: string;
};

export type FourWeekTrainingDrift = {
  staffName: string;
  staffInitials: string | null;
  type: string;
  expiresOn: string;
  daysLeft: number;
  status: "expired" | "due_soon";
};

export type FourWeekSummary = {
  period: { from: string; to: string; days: number; locationId?: string | null };

  rangeLabel: string;
  compliantDays: number;
  totalDays: number;

  tempLogs: number;
  tempFails: number;

  cleaningDone: number;
  cleaningTotal: number | null;

  trainingDueSoon: number;
  trainingOver: number;
  trainingAssigned: number;
  trainingInProgress: number;

  allergenDueSoon: number;
  allergenOver: number;

  incidents: number;

  signoffsDone: number;
  signoffsExpected: number | null;

  calibrationChecks: number;
  calibrationDue: boolean;

  staffOffToday: number;
  staffAbsencesLast30Days: number;

  managerQcReviews: number;
  managerQcAverage: number | null;

  topMissedAreas: Array<{
    area: string;
    missed: number;
  }>;

  topIssues: Array<{
    label: string;
    count: number;
    tone?: "good" | "warn" | "bad" | "neutral";
  }>;

  temperature: {
    total: number;
    fails: number;
    failRatePct: number;
    repeatFailures: FourWeekTempRepeat[];
    recentLogs: Array<{
      id: string;
      at: string;
      routine_id: string | null;
      routine_item_id: string | null;
      area: string | null;
      note: string | null;
      target_key: string | null;
      staff_initials: string | null;
      temp_c: number | null;
      status: string | null;
      location_id?: string | null;
    }>;
    recentFailures: Array<{
      id: string;
      happenedOn: string | null;
      createdAt: string | null;
      createdBy: string | null;
      details: string | null;
      correctiveAction: string | null;
    }>;
  };

  cleaning: {
    dueTotal: number;
    completedTotal: number;
    missedTotal: number;
    repeatMisses: FourWeekMissedClean[];
    recentRuns: Array<{
      id: string;
      runOn: string;
      doneAt: string | null;
      doneBy: string | null;
      category: string;
      task: string;
    }>;
    categoryProgress: Array<{
      category: string;
      done: number;
      total: number;
    }>;
  };

  training: {
    expired: number;
    dueSoon: number;
    drift: FourWeekTrainingDrift[];
    records: Array<{
      id: string;
      staffName: string;
      staffInitials: string | null;
      staffEmail: string | null;
      type: string | null;
      awardedOn: string | null;
      expiresOn: string | null;
      daysUntil: number | null;
      status: "valid" | "expired" | "no-expiry";
      notes: string | null;
      certificateUrl: string | null;
    }>;
    areaCoverage: Array<{
      memberId: string;
      name: string;
      initials: string | null;
      email: string | null;
      area: string;
      selected: boolean;
      awardedOn: string | null;
      expiresOn: string | null;
      daysUntil: number | null;
      status: "green" | "amber" | "red" | "unknown";
    }>;
  };

  allergens: {
    dueSoon: number;
    overdue: number;
    recentChanges: Array<{
      id: string;
      createdAt: string | null;
      itemName: string | null;
      action: string | null;
      staffInitials: string | null;
    }>;
    recentReviews: Array<{
      id: string;
      reviewedOn: string | null;
      nextDue: string | null;
      reviewer: string | null;
      daysUntil: number | null;
    }>;
  };

  incidentsLog: {
    total: number;
    recent: Array<{
      id: string;
      happenedOn: string | null;
      createdAt: string | null;
      type: string | null;
      createdBy: string | null;
      details: string | null;
      immediateAction: string | null;
      preventiveAction: string | null;
    }>;
  };

  signoffs: {
    total: number;
    expected: number | null;
    recent: Array<{
      id: string;
      signoffOn: string;
      signedBy: string | null;
      notes: string | null;
      createdAt: string | null;
    }>;
  };

  staffAbsences: {
    total: number;
    today: number;
    last30Days: number;
    recent: Array<{
      id: string;
      teamMemberName: string;
      teamMemberInitials: string | null;
      absenceType: string | null;
      startDate: string;
      endDate: string;
      isHalfDay: boolean;
      halfDayPeriod: string | null;
      locationName: string | null;
      status: string | null;
      notes: string | null;
      operationalImpact: string | null;
      createdAt: string | null;
    }>;
  };

  managerQc: {
    total: number;
    averageRating: number | null;
    recent: Array<{
      id: string;
      reviewedOn: string;
      createdAt: string | null;
      staffName: string;
      staffInitials: string | null;
      reviewer: string | null;
      rating: number;
      notes: string | null;
    }>;
  };

  calibration: {
    total: number;
    due: boolean;
    recent: Array<{
      id: string;
      checkedOn: string;
      staffInitials: string;
      coldStorageChecked: boolean;
      probesChecked: boolean;
      thermometersChecked: boolean;
      allEquipmentCalibrated: boolean;
      notes: string | null;
      createdAt: string | null;
    }>;
  };

  hygiene: {
    latest: {
      rating: number | null;
      visitDate: string | null;
      certificateExpiresAt: string | null;
      issuingAuthority: string | null;
      reference: string | null;
    } | null;
    history: Array<{
      id: string;
      rating: number | null;
      visitDate: string | null;
      certificateExpiresAt: string | null;
      issuingAuthority: string | null;
      reference: string | null;
      notes: string | null;
      createdAt: string | null;
    }>;
  };

  headline: string[];
  recommendations: string[];
};

function formatUkDate(iso: string | null | undefined): string {
  if (!iso) return "—";

  const raw = String(iso).slice(0, 10);
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;

  const [y, m, d] = parts;
  if (!y || !m || !d) return raw;

  return `${d}/${m}/${y}`;
}

function percentLabel(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value}%`;
}

function ratioLabel(done: number, total: number | null): string {
  if (total == null) return `${done}/—`;
  return `${done}/${total}`;
}

function cleaningCompletionPct(done: number, total: number | null): number {
  if (!total) return 0;
  return Math.round((done / total) * 1000) / 10;
}

function signoffCompletionPct(done: number, total: number | null): number {
  if (!total) return 0;
  return Math.round((done / total) * 1000) / 10;
}

function compliancePct(done: number, total: number): number {
  if (!total) return 0;
  return Math.round((done / total) * 1000) / 10;
}

function buildOverallStatus(summary: FourWeekSummary): string {
  let score = 0;

  if (summary.tempFails > 0) score += 2;
  if ((summary.cleaningTotal ?? 0) > 0 && (summary.cleaningTotal! - summary.cleaningDone) > 0) {
    score += 2;
  }
  if (summary.trainingOver > 0) score += 2;
  if (summary.allergenOver > 0) score += 2;
  if ((summary.signoffsExpected ?? 0) > summary.signoffsDone) score += 1;
  if (summary.incidents > 0) score += 1;
  if (summary.calibrationDue) score += 1;
  if ((summary.managerQcAverage ?? 5) < 4) score += 1;

  if (score >= 6) return "Action required";
  if (score >= 3) return "Needs attention";
  return "On track";
}

function buildKeyFindings(summary: FourWeekSummary): string[] {
  const findings: string[] = [];

  findings.push(
    `${summary.compliantDays}/${summary.totalDays} review day${
      summary.totalDays === 1 ? "" : "s"
    } were fully compliant (${percentLabel(
      compliancePct(summary.compliantDays, summary.totalDays)
    )}).`
  );

  if (summary.tempFails === 0) {
    findings.push("No failed temperature checks were recorded in this review period.");
  } else {
    findings.push(
      `${summary.tempFails} failed temperature check${
        summary.tempFails === 1 ? "" : "s"
      } were recorded from ${summary.tempLogs} total log${
        summary.tempLogs === 1 ? "" : "s"
      }.`
    );
  }

  if ((summary.cleaningTotal ?? 0) === 0) {
    findings.push("No scheduled cleaning tasks fell due in the selected review window.");
  } else if ((summary.cleaningTotal! - summary.cleaningDone) === 0) {
    findings.push("All due cleaning tasks were completed in the review period.");
  } else {
    findings.push(
      `${summary.cleaningTotal! - summary.cleaningDone} cleaning task${
        summary.cleaningTotal! - summary.cleaningDone === 1 ? " was" : "s were"
      } missed out of ${summary.cleaningTotal} due.`
    );
  }

  if (summary.trainingOver === 0 && summary.trainingDueSoon === 0) {
    findings.push("No expired or near-due training records were identified.");
  } else {
    findings.push(
      `Training drift identified: ${summary.trainingOver} expired and ${summary.trainingDueSoon} due within 30 days.`
    );
  }

  if (summary.allergenOver === 0 && summary.allergenDueSoon === 0) {
    findings.push("No overdue or near-due allergen reviews were identified.");
  } else {
    findings.push(
      `Allergen review drift identified: ${summary.allergenOver} overdue and ${summary.allergenDueSoon} due soon.`
    );
  }

  if (summary.signoffsExpected != null) {
    findings.push(
      `Daily sign-offs recorded: ${summary.signoffsDone}/${summary.signoffsExpected} (${percentLabel(
        signoffCompletionPct(summary.signoffsDone, summary.signoffsExpected)
      )}).`
    );
  }

  return findings;
}

function pushSectionTitle(lines: string[], title: string) {
  lines.push(title.toUpperCase());
  lines.push("-".repeat(title.length));
}

function pushBullet(lines: string[], text: string) {
  lines.push(`• ${text}`);
}

function pushSubBullet(lines: string[], text: string) {
  lines.push(`  - ${text}`);
}

function labelFromTone(tone?: "good" | "warn" | "bad" | "neutral"): string {
  if (tone === "bad") return "high priority";
  if (tone === "warn") return "watch";
  if (tone === "good") return "good";
  return "info";
}

export function fourWeekSummaryToLines(summary: FourWeekSummary): string[] {
  const lines: string[] = [];

  const status = buildOverallStatus(summary);
  const cleaningPct = cleaningCompletionPct(summary.cleaningDone, summary.cleaningTotal);
  const signoffPct = signoffCompletionPct(
    summary.signoffsDone,
    summary.signoffsExpected
  );
  const compliantPct = compliancePct(summary.compliantDays, summary.totalDays);

  lines.push("TEMPTAKE");
  lines.push("Four-Weekly Food Safety Review");
  lines.push("");

  lines.push(
    `Review period: ${formatUkDate(summary.period.from)} to ${formatUkDate(
      summary.period.to
    )} (${summary.period.days} days)`
  );
  lines.push(`Range: ${summary.rangeLabel}`);
  lines.push(`Overall status: ${status}`);
  lines.push("");

  pushSectionTitle(lines, "Executive summary");
  pushBullet(
    lines,
    `Fully compliant days: ${summary.compliantDays}/${summary.totalDays} (${percentLabel(
      compliantPct
    )})`
  );
  pushBullet(lines, `Temperature logs recorded: ${summary.tempLogs}`);
  pushBullet(
    lines,
    `Temperature failures: ${summary.tempFails} (${percentLabel(
      summary.temperature.failRatePct
    )})`
  );
  pushBullet(
    lines,
    `Cleaning completion: ${ratioLabel(
      summary.cleaningDone,
      summary.cleaningTotal
    )} (${percentLabel(cleaningPct)})`
  );
  pushBullet(
    lines,
    `Day sign-offs: ${ratioLabel(summary.signoffsDone, summary.signoffsExpected)} (${percentLabel(
      signoffPct
    )})`
  );
  pushBullet(lines, `Training expired: ${summary.trainingOver}`);
  pushBullet(lines, `Training due within 30 days: ${summary.trainingDueSoon}`);
  pushBullet(lines, `Training assigned: ${summary.trainingAssigned}`);
  pushBullet(lines, `Training in progress: ${summary.trainingInProgress}`);
  pushBullet(lines, `Allergen reviews overdue: ${summary.allergenOver}`);
  pushBullet(lines, `Allergen reviews due soon: ${summary.allergenDueSoon}`);
  pushBullet(lines, `Incidents logged: ${summary.incidents}`);
  pushBullet(
    lines,
    `Manager QC reviews: ${summary.managerQcReviews}${
      summary.managerQcAverage != null ? ` (average ${summary.managerQcAverage}/5)` : ""
    }`
  );
  pushBullet(
    lines,
    `Staff absences: ${summary.staffAbsencesLast30Days} in last 30 days, ${summary.staffOffToday} off today`
  );
  pushBullet(
    lines,
    `Calibration: ${summary.calibrationChecks} check${
      summary.calibrationChecks === 1 ? "" : "s"
    } logged${summary.calibrationDue ? " - review due now" : ""}`
  );
  lines.push("");

  pushSectionTitle(lines, "Key findings");
  for (const finding of buildKeyFindings(summary)) {
    pushBullet(lines, finding);
  }
  lines.push("");

  pushSectionTitle(lines, "Top issues to address");
  if (summary.topIssues.length > 0) {
    for (const issue of summary.topIssues.slice(0, 10)) {
      pushBullet(
        lines,
        `${issue.label}: ${issue.count} (${labelFromTone(issue.tone)})`
      );
    }
  } else {
    pushBullet(lines, "No major recurring issue categories were identified.");
  }
  lines.push("");

  pushSectionTitle(lines, "Temperature review");
  if (summary.temperature.total === 0) {
    pushBullet(lines, "No temperature logs were recorded in the review period.");
  } else {
    pushBullet(
      lines,
      `${summary.temperature.total} total temperature log${
        summary.temperature.total === 1 ? "" : "s"
      } recorded.`
    );
    pushBullet(
      lines,
      `${summary.temperature.fails} fail${
        summary.temperature.fails === 1 ? "" : "s"
      } recorded, giving a fail rate of ${percentLabel(summary.temperature.failRatePct)}.`
    );

    if (summary.temperature.repeatFailures.length > 0) {
      pushBullet(lines, "Repeat temperature failures detected:");
      for (const item of summary.temperature.repeatFailures.slice(0, 8)) {
        pushSubBullet(
          lines,
          `${item.area || "Unknown area"} | ${item.item || "Unnamed item"} - ${
            item.count
          } fail${item.count === 1 ? "" : "s"}, last seen ${formatUkDate(
            item.lastSeenOn
          )}.`
        );
      }
    } else {
      pushBullet(lines, "No repeat temperature failure pattern was detected.");
    }

    if (summary.temperature.recentFailures.length > 0) {
      pushBullet(lines, "Most recent failed checks:");
      for (const item of summary.temperature.recentFailures.slice(0, 5)) {
        pushSubBullet(
          lines,
          `${item.details ?? "Failure logged"}${
            item.correctiveAction ? ` | corrective action: ${item.correctiveAction}` : ""
          }`
        );
      }
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Cleaning review");
  pushBullet(lines, `${summary.cleaning.dueTotal} cleaning task(s) were due.`);
  pushBullet(
    lines,
    `${summary.cleaning.completedTotal} were completed and ${summary.cleaning.missedTotal} were missed.`
  );

  if (summary.cleaning.repeatMisses.length > 0) {
    pushBullet(lines, "Repeat missed cleaning tasks:");
    for (const item of summary.cleaning.repeatMisses.slice(0, 8)) {
      const areaBits = [item.area, item.category].filter(Boolean).join(" | ");
      pushSubBullet(
        lines,
        `${item.task}${areaBits ? ` (${areaBits})` : ""} - missed ${
          item.missedCount
        } time${item.missedCount === 1 ? "" : "s"}, last missed ${formatUkDate(
          item.lastMissedOn
        )}.`
      );
    }
  } else {
    pushBullet(lines, "No repeat missed cleaning pattern was detected.");
  }

  if (summary.cleaning.categoryProgress.length > 0) {
    pushBullet(lines, "Category completion snapshot:");
    for (const category of summary.cleaning.categoryProgress.slice(0, 8)) {
      const pct = cleaningCompletionPct(category.done, category.total);
      pushSubBullet(
        lines,
        `${category.category}: ${category.done}/${category.total} (${percentLabel(pct)})`
      );
    }
  }

  if (summary.topMissedAreas.length > 0) {
    pushBullet(lines, "Most affected areas:");
    for (const area of summary.topMissedAreas.slice(0, 5)) {
      pushSubBullet(lines, `${area.area}: ${area.missed} missed task(s).`);
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Sign-off review");
  if (summary.signoffsExpected == null) {
    pushBullet(lines, `${summary.signoffsDone} sign-off(s) were recorded.`);
  } else {
    pushBullet(
      lines,
      `${summary.signoffsDone}/${summary.signoffsExpected} sign-off day${
        summary.signoffsExpected === 1 ? "" : "s"
      } were recorded (${percentLabel(signoffPct)}).`
    );
  }

  if (summary.signoffs.recent.length > 0) {
    pushBullet(lines, "Most recent sign-offs:");
    for (const item of summary.signoffs.recent.slice(0, 5)) {
      pushSubBullet(
        lines,
        `${formatUkDate(item.signoffOn)} - ${
          item.signedBy ?? "Unknown"
        }${item.notes ? ` | ${item.notes}` : ""}`
      );
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Training review");
  pushBullet(lines, `${summary.training.expired} training item(s) are expired.`);
  pushBullet(lines, `${summary.training.dueSoon} training item(s) are due within 30 days.`);
  pushBullet(lines, `${summary.trainingAssigned} training item(s) are assigned.`);
  pushBullet(lines, `${summary.trainingInProgress} training item(s) are in progress.`);

  if (summary.training.drift.length > 0) {
    pushBullet(lines, "Training drift items:");
    for (const item of summary.training.drift.slice(0, 10)) {
      const staffLabel = item.staffInitials
        ? `${item.staffName} (${item.staffInitials})`
        : item.staffName;

      const statusLabel =
        item.status === "expired"
          ? `EXPIRED, due ${formatUkDate(item.expiresOn)}`
          : `due in ${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"} (${formatUkDate(
              item.expiresOn
            )})`;

      pushSubBullet(lines, `${staffLabel} | ${item.type} - ${statusLabel}.`);
    }
  } else {
    pushBullet(lines, "No current training drift items were identified.");
  }

  if (summary.training.records.length > 0) {
    pushBullet(lines, "Recent training records:");
    for (const item of summary.training.records.slice(0, 5)) {
      const who = item.staffInitials
        ? `${item.staffName} (${item.staffInitials})`
        : item.staffName;
      pushSubBullet(
        lines,
        `${who} | ${item.type ?? "Training"} | ${
          item.expiresOn ? `expires ${formatUkDate(item.expiresOn)}` : "no expiry recorded"
        }`
      );
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Allergen review");
  pushBullet(lines, `${summary.allergens.overdue} allergen review(s) are overdue.`);
  pushBullet(lines, `${summary.allergens.dueSoon} allergen review(s) are due soon.`);

  if (summary.allergens.recentReviews.length > 0) {
    pushBullet(lines, "Recent allergen reviews:");
    for (const item of summary.allergens.recentReviews.slice(0, 5)) {
      pushSubBullet(
        lines,
        `Reviewed ${formatUkDate(item.reviewedOn)}${
          item.nextDue ? ` | next due ${formatUkDate(item.nextDue)}` : ""
        }${item.reviewer ? ` | reviewer ${item.reviewer}` : ""}`
      );
    }
  }

  if (summary.allergens.recentChanges.length > 0) {
    pushBullet(lines, "Recent allergen edits:");
    for (const item of summary.allergens.recentChanges.slice(0, 5)) {
      pushSubBullet(
        lines,
        `${item.itemName ?? "Unnamed item"} | ${item.action ?? "change"}${
          item.staffInitials ? ` | ${item.staffInitials}` : ""
        }`
      );
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Incident and failure review");
  pushBullet(lines, `${summary.incidentsLog.total} logged incident(s) in the review period.`);

  if (summary.incidentsLog.recent.length > 0) {
    pushBullet(lines, "Recent logged incidents:");
    for (const item of summary.incidentsLog.recent.slice(0, 5)) {
      pushSubBullet(
        lines,
        `${formatUkDate(item.happenedOn)} | ${item.type ?? "Incident"}${
          item.details ? ` | ${item.details}` : ""
        }`
      );
    }
  } else {
    pushBullet(lines, "No logged incidents were recorded.");
  }
  lines.push("");

  pushSectionTitle(lines, "Manager QC review");
  pushBullet(lines, `${summary.managerQc.total} QC review(s) were recorded.`);
  pushBullet(
    lines,
    `Average QC score: ${
      summary.managerQc.averageRating != null ? `${summary.managerQc.averageRating}/5` : "—"
    }`
  );

  if (summary.managerQc.recent.length > 0) {
    pushBullet(lines, "Most recent QC reviews:");
    for (const item of summary.managerQc.recent.slice(0, 5)) {
      const staff = item.staffInitials
        ? `${item.staffName} (${item.staffInitials})`
        : item.staffName;
      pushSubBullet(
        lines,
        `${formatUkDate(item.reviewedOn)} | ${staff} | ${item.rating}/5${
          item.notes ? ` | ${item.notes}` : ""
        }`
      );
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Staffing and absence review");
  pushBullet(lines, `${summary.staffAbsences.total} absence record(s) overlapped this period.`);
  pushBullet(lines, `${summary.staffAbsences.today} staff member(s) are off today.`);
  pushBullet(lines, `${summary.staffAbsences.last30Days} absence record(s) in the last 30 days.`);

  if (summary.staffAbsences.recent.length > 0) {
    pushBullet(lines, "Recent absence records:");
    for (const item of summary.staffAbsences.recent.slice(0, 5)) {
      const who = item.teamMemberInitials
        ? `${item.teamMemberName} (${item.teamMemberInitials})`
        : item.teamMemberName;
      pushSubBullet(
        lines,
        `${who} | ${item.absenceType ?? "Absence"} | ${formatUkDate(
          item.startDate
        )} to ${formatUkDate(item.endDate)}${
          item.status ? ` | ${item.status}` : ""
        }`
      );
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Calibration and verification");
  pushBullet(
    lines,
    `${summary.calibration.total} calibration check${
      summary.calibration.total === 1 ? "" : "s"
    } were logged in the review period.`
  );
  pushBullet(
    lines,
    summary.calibration.due
      ? "Calibration review is currently due."
      : "Calibration review appears up to date."
  );

  if (summary.calibration.recent.length > 0) {
    pushBullet(lines, "Recent calibration checks:");
    for (const item of summary.calibration.recent.slice(0, 5)) {
      pushSubBullet(
        lines,
        `${formatUkDate(item.checkedOn)} | ${item.staffInitials} | all equipment calibrated: ${
          item.allEquipmentCalibrated ? "yes" : "no"
        }`
      );
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Food hygiene rating");
  if (!summary.hygiene.latest) {
    pushBullet(lines, "No food hygiene rating record is available for this location.");
  } else {
    pushBullet(
      lines,
      `Latest rating: ${
        summary.hygiene.latest.rating != null ? `${summary.hygiene.latest.rating}/5` : "—"
      }`
    );
    pushBullet(
      lines,
      `Inspection date: ${formatUkDate(summary.hygiene.latest.visitDate)}`
    );
    if (summary.hygiene.latest.issuingAuthority) {
      pushBullet(lines, `Issuing authority: ${summary.hygiene.latest.issuingAuthority}`);
    }
    if (summary.hygiene.latest.reference) {
      pushBullet(lines, `Reference: ${summary.hygiene.latest.reference}`);
    }
  }

  if (summary.hygiene.history.length > 1) {
    pushBullet(lines, "Previous rating history:");
    for (const item of summary.hygiene.history.slice(1, 5)) {
      pushSubBullet(
        lines,
        `${formatUkDate(item.visitDate)} | ${
          item.rating != null ? `${item.rating}/5` : "—"
        }${item.issuingAuthority ? ` | ${item.issuingAuthority}` : ""}`
      );
    }
  }
  lines.push("");

  pushSectionTitle(lines, "Management action");
  if (summary.recommendations.length > 0) {
    for (const recommendation of summary.recommendations) {
      pushBullet(lines, recommendation);
    }
  } else {
    pushBullet(lines, "No specific follow-up actions generated.");
  }
  lines.push("");

  pushSectionTitle(lines, "Review note");
  pushBullet(
    lines,
    "This report is intended to support the regular four-weekly food safety review and highlight recurring issues that require management follow-up."
  );

  return lines;
}