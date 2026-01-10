// src/lib/onboarding.ts

export type OnboardingStepKey =
  | "locations"
  | "routines"
  | "cleaning"
  | "allergens"
  | "team";

const LS_PREFIX = "tt_onboarding_v2";

/** Completed flag (rarely needed now, but kept for compatibility if you use it elsewhere). */
function doneKey(orgId: string | null, step: OnboardingStepKey) {
  return `${LS_PREFIX}:done:${orgId ?? "no-org"}:${step}`;
}

/** Snooze meta: stores JSON { until: number, count: number } */
function snoozeKey(orgId: string | null, step: OnboardingStepKey) {
  return `${LS_PREFIX}:snooze:${orgId ?? "no-org"}:${step}`;
}

export function getStepDone(orgId: string | null, step: OnboardingStepKey) {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(doneKey(orgId, step)) === "1";
  } catch {
    return false;
  }
}

export function setStepDone(orgId: string | null, step: OnboardingStepKey, done: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(doneKey(orgId, step), done ? "1" : "0");
  } catch {
    // ignore
  }
}

export function getStepSnooze(orgId: string | null, step: OnboardingStepKey): {
  until: number | null;
  count: number;
} {
  if (typeof window === "undefined") return { until: null, count: 0 };

  try {
    const raw = localStorage.getItem(snoozeKey(orgId, step));
    if (!raw) return { until: null, count: 0 };

    const parsed = JSON.parse(raw) as any;
    const until = typeof parsed?.until === "number" ? parsed.until : null;
    const count = typeof parsed?.count === "number" ? parsed.count : 0;

    if (!until || Number.isNaN(until)) return { until: null, count };
    return { until, count };
  } catch {
    return { until: null, count: 0 };
  }
}

export function isStepSnoozed(orgId: string | null, step: OnboardingStepKey) {
  const meta = getStepSnooze(orgId, step);
  if (!meta.until) return false;
  return meta.until > Date.now();
}

/**
 * Snooze a step with escalation:
 * 1st dismiss: 24h
 * 2nd dismiss: 3 days
 * 3rd+ dismiss: 7 days
 */
export function snoozeStep(orgId: string | null, step: OnboardingStepKey) {
  if (typeof window === "undefined") return;

  const meta = getStepSnooze(orgId, step);
  const nextCount = (meta.count ?? 0) + 1;

  const hours = nextCount >= 3 ? 24 * 7 : nextCount === 2 ? 24 * 3 : 24;
  const until = Date.now() + hours * 60 * 60 * 1000;

  try {
    localStorage.setItem(
      snoozeKey(orgId, step),
      JSON.stringify({ until, count: nextCount })
    );
  } catch {
    // ignore
  }
}

/** If a step becomes truly complete, clear its snooze so it never blocks UI logic. */
export function clearSnooze(orgId: string | null, step: OnboardingStepKey) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(snoozeKey(orgId, step));
  } catch {
    // ignore
  }
}
