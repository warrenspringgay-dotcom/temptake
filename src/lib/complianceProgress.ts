export type WeeklyComplianceState = {
  scorePct: number;
  signedOffDays: number;
  openDays: number;
  tempLogs: number;
  cleaningRuns: number;
  streak: number;

  signoffScorePct: number;
  tempScorePct: number;
  cleaningScorePct: number;

  compliantTempDays: number;
  dueCleaningTasks: number;
  completedCleaningTasks: number;
};

export type CompletionFeedbackData = {
  title: string;
  summaryLine: string;
  points: number;
  compliantDaysThisWeek: number;
  openDaysThisWeek: number;
  streakDays: number;
  selectedDate: string;
  initials: string | null;
  completedTodayLabel: string;
};

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function safeRatioPct(done: number, total: number) {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 100;
  return clampPct((done / total) * 100);
}

export function calculateWeeklyComplianceState(args: {
  signedOffDays: number;
  openDays: number;
  tempLogs: number;
  cleaningRuns: number;
  streak: number;

  compliantTempDays?: number;
  dueCleaningTasks?: number;
  completedCleaningTasks?: number;
}) {
  const {
    signedOffDays,
    openDays,
    tempLogs,
    cleaningRuns,
    streak,
    compliantTempDays,
    dueCleaningTasks,
    completedCleaningTasks,
  } = args;

  const safeOpenDays = Math.max(0, openDays);

  const resolvedCompliantTempDays =
    typeof compliantTempDays === "number"
      ? Math.max(0, compliantTempDays)
      : Math.min(Math.max(0, tempLogs), safeOpenDays);

  const resolvedDueCleaningTasks =
    typeof dueCleaningTasks === "number" ? Math.max(0, dueCleaningTasks) : 0;

  const resolvedCompletedCleaningTasks =
    typeof completedCleaningTasks === "number"
      ? Math.max(0, completedCleaningTasks)
      : Math.max(0, cleaningRuns);

  const signoffScorePct =
    safeOpenDays > 0 ? safeRatioPct(signedOffDays, safeOpenDays) : 100;

  const tempScorePct =
    safeOpenDays > 0 ? safeRatioPct(resolvedCompliantTempDays, safeOpenDays) : 100;

  const cleaningScorePct =
    resolvedDueCleaningTasks > 0
      ? safeRatioPct(resolvedCompletedCleaningTasks, resolvedDueCleaningTasks)
      : 100;

  const scorePct = clampPct(
    signoffScorePct * 0.4 + tempScorePct * 0.3 + cleaningScorePct * 0.3
  );

  return {
    scorePct,
    signedOffDays,
    openDays: safeOpenDays,
    tempLogs: Math.max(0, tempLogs),
    cleaningRuns: Math.max(0, cleaningRuns),
    streak: Math.max(0, streak),

    signoffScorePct,
    tempScorePct,
    cleaningScorePct,

    compliantTempDays: resolvedCompliantTempDays,
    dueCleaningTasks: resolvedDueCleaningTasks,
    completedCleaningTasks: resolvedCompletedCleaningTasks,
  } satisfies WeeklyComplianceState;
}

export function buildComplianceFeedback(args: {
  compliantDaysThisWeek: number;
  openDaysThisWeek: number;
  streakDays: number;
  selectedDate: string;
  initials: string | null;
  completedTodayLabel: string;
}): CompletionFeedbackData {
  const {
    compliantDaysThisWeek,
    openDaysThisWeek,
    streakDays,
    selectedDate,
    initials,
    completedTodayLabel,
  } = args;

  const points =
    1 +
    (compliantDaysThisWeek >= 3 ? 1 : 0) +
    (compliantDaysThisWeek >= 5 ? 1 : 0) +
    (streakDays >= 3 ? 1 : 0) +
    (streakDays >= 7 ? 1 : 0);

  let title = "Nice work";
  if (openDaysThisWeek > 0 && compliantDaysThisWeek >= openDaysThisWeek) {
    title = "Week fully on track";
  } else if (streakDays >= 7) {
    title = "Strong streak";
  } else if (streakDays >= 3) {
    title = "Momentum building";
  }

  let summaryLine = `You’re on ${compliantDaysThisWeek}/${openDaysThisWeek} compliant day${
    openDaysThisWeek === 1 ? "" : "s"
  } this week.`;

  if (openDaysThisWeek > 0 && compliantDaysThisWeek >= openDaysThisWeek) {
    summaryLine = "Everything due so far this week is completed.";
  }

  return {
    title,
    summaryLine,
    points,
    compliantDaysThisWeek,
    openDaysThisWeek,
    streakDays,
    selectedDate,
    initials,
    completedTodayLabel,
  };
}