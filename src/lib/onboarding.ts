// src/lib/onboarding.ts

export type OnboardingStepKey =
  | "locations"
  | "routines"
  | "cleaning"
  | "allergens"
  | "team";

const LS_PREFIX = "tt_onboarding_v1";

function key(orgId: string | null, step: OnboardingStepKey) {
  return `${LS_PREFIX}:${orgId ?? "no-org"}:${step}`;
}

export function getStepDone(orgId: string | null, step: OnboardingStepKey) {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key(orgId, step)) === "1";
  } catch {
    return false;
  }
}

export function setStepDone(orgId: string | null, step: OnboardingStepKey, done: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(orgId, step), done ? "1" : "0");
  } catch {
    // ignore
  }
}
