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
  period: { from: string; to: string; days: number };

  temperature: {
    total: number;
    fails: number;
    failRatePct: number;
    repeatFailures: FourWeekTempRepeat[];
  };

  cleaning: {
    dueTotal: number;
    completedTotal: number;
    missedTotal: number;
    repeatMisses: FourWeekMissedClean[];
  };

  training: {
    expired: number;
    dueSoon: number;
    drift: FourWeekTrainingDrift[];
  };

  headline: string[];
  recommendations: string[];
};

export function fourWeekSummaryToLines(s: FourWeekSummary): string[] {
  const lines: string[] = [];

  lines.push("TempTake | Four-Weekly Review (SFBB)");
  lines.push("");
  lines.push(`Period: ${s.period.from} to ${s.period.to} (${s.period.days} days)`);
  lines.push("");

  lines.push("1) Temperature checks");
  lines.push(`- Total logged: ${s.temperature.total}`);
  lines.push(`- Failures: ${s.temperature.fails} (${s.temperature.failRatePct}%)`);
  if (s.temperature.repeatFailures.length) {
    lines.push("- Repeat failures (2+):");
    for (const r of s.temperature.repeatFailures.slice(0, 8)) {
      lines.push(`  • ${r.area} | ${r.item} → ${r.count} fails (last ${r.lastSeenOn})`);
    }
  } else {
    lines.push("- Repeat failures: none detected");
  }
  lines.push("");

  lines.push("2) Cleaning");
  lines.push(`- Due: ${s.cleaning.dueTotal}`);
  lines.push(`- Completed: ${s.cleaning.completedTotal}`);
  lines.push(`- Missed: ${s.cleaning.missedTotal}`);
  if (s.cleaning.repeatMisses.length) {
    lines.push("- Repeat misses (2+):");
    for (const r of s.cleaning.repeatMisses.slice(0, 8)) {
      const where = [r.area, r.category].filter(Boolean).join(" | ");
      lines.push(
        `  • ${r.task}${where ? ` (${where})` : ""} → missed ${r.missedCount} (last ${r.lastMissedOn})`
      );
    }
  } else {
    lines.push("- Repeat misses: none detected");
  }
  lines.push("");

  lines.push("3) Training drift");
  lines.push(`- Expired: ${s.training.expired}`);
  lines.push(`- Due soon (30d): ${s.training.dueSoon}`);
  if (s.training.drift.length) {
    lines.push("- Items:");
    for (const r of s.training.drift.slice(0, 10)) {
      const who = r.staffInitials ? `${r.staffName} (${r.staffInitials})` : r.staffName;
      const st = r.status === "expired" ? "EXPIRED" : `due in ${r.daysLeft}d`;
      lines.push(`  • ${who} | ${r.type} → ${st} (exp ${r.expiresOn})`);
    }
  } else {
    lines.push("- Training drift: none detected");
  }
  lines.push("");

  lines.push("Recommendations");
  for (const rec of s.recommendations) lines.push(`- ${rec}`);

  return lines;
}
