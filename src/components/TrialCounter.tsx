// src/components/TrialCounter.tsx
"use client";

type TrialCounterProps = {
  trialEndsAt: string | null; // ISO timestamp from DB
};

export default function TrialCounter({ trialEndsAt }: TrialCounterProps) {
  if (!trialEndsAt) return null;

  const end = new Date(trialEndsAt);
  const now = new Date();

  // Trial already over
  if (end <= now) return null;

  const msLeft = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
      <span>🎁 Free trial</span>
      <span className="rounded-full bg-amber-200 px-2 py-[2px]">
        {daysLeft} day{daysLeft === 1 ? "" : "s"} left
      </span>
    </div>
  );
}
