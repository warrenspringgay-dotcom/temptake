// src/app/(protected)/four-week-review/page.tsx
import Link from "next/link";
import { getFourWeeklyReview } from "@/app/actions/reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDDMMYYYY(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

function tileTone(tone: "danger" | "warn" | "ok") {
  if (tone === "danger") return "border-red-200 bg-red-50/90 text-red-950";
  if (tone === "warn") return "border-amber-200 bg-amber-50/90 text-amber-950";
  return "border-emerald-200 bg-emerald-50/90 text-emerald-950";
}

function pillTone(tone: "danger" | "warn" | "ok") {
  if (tone === "danger") return "bg-red-600 text-white";
  if (tone === "warn") return "bg-amber-600 text-white";
  return "bg-emerald-600 text-white";
}

export default async function FourWeekReviewPage() {
  const summary = await getFourWeeklyReview({});
  const { from, to } = summary.period;

  const repeatFailCount = summary.temperature.repeatFailures.length;
  const repeatMissCount = summary.cleaning.repeatMisses.length;

  const trainingBad = summary.training.expired;
  const trainingSoon = summary.training.dueSoon;

  const tempsTone: "danger" | "warn" | "ok" =
    summary.temperature.fails > 0 ? (repeatFailCount > 0 ? "danger" : "warn") : "ok";

  const cleaningTone: "danger" | "warn" | "ok" =
    summary.cleaning.missedTotal > 0 ? (repeatMissCount > 0 ? "danger" : "warn") : "ok";

  const trainingTone: "danger" | "warn" | "ok" =
    trainingBad > 0 ? "danger" : trainingSoon > 0 ? "warn" : "ok";

  // “Top fixes”: just the highest-impact items, zero essays.
  const topFixes: Array<{ title: string; action: string; tone: "danger" | "warn" | "ok" }> = [];

  const worstTemp = summary.temperature.repeatFailures[0];
  if (worstTemp) {
    topFixes.push({
      title: `Repeat temp failures: ${worstTemp.area} | ${worstTemp.item} (${worstTemp.count} fails)`,
      action: "Check equipment/process. Log corrective action each time it fails.",
      tone: "danger",
    });
  } else if (summary.temperature.fails > 0) {
    topFixes.push({
      title: `Temp failures logged (${summary.temperature.fails})`,
      action: "When a fail happens: recheck, correct, and add a note. Don’t leave it blank.",
      tone: "warn",
    });
  }

  const worstClean = summary.cleaning.repeatMisses[0];
  if (worstClean) {
    topFixes.push({
      title: `Cleaning repeatedly missed: ${worstClean.task} (missed ${worstClean.missedCount})`,
      action: "Assign an owner for this task and complete it today. Keep the run log clean.",
      tone: "danger",
    });
  } else if (summary.cleaning.missedTotal > 0) {
    topFixes.push({
      title: `Cleaning missed (${summary.cleaning.missedTotal})`,
      action: "Complete today’s due tasks and tick them off as you go. No heroics required.",
      tone: "warn",
    });
  }

  if (trainingBad > 0) {
    topFixes.push({
      title: `Training expired (${trainingBad})`,
      action: "Book refreshers now. Inspections love expired training, it keeps them employed.",
      tone: "danger",
    });
  } else if (trainingSoon > 0) {
    topFixes.push({
      title: `Training due soon (${trainingSoon})`,
      action: "Schedule refreshers this week so it doesn’t become ‘expired’ next week.",
      tone: "warn",
    });
  }

  // Keep to max 3, because attention spans are fragile.
  const fixes = topFixes.slice(0, 3);

  const issuesFound =
    repeatFailCount + repeatMissCount + trainingBad + trainingSoon;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-5 space-y-4">
      <header className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Four-Weekly Review
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Period:{" "}
              <span className="font-extrabold text-slate-900">
                {formatDDMMYYYY(from)} → {formatDDMMYYYY(to)}
              </span>
              {" · "}
              Issues found:{" "}
              <span className="font-extrabold text-slate-900">{issuesFound}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/reports/four-week?to=${encodeURIComponent(to)}`}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800"
            >
              Download PDF (Inspector)
            </Link>

            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return;
                localStorage.setItem("tt_four_week_reviewed_at", new Date().toISOString());
                // tiny UX: bounce back to dashboard after marking reviewed
                window.location.href = "/dashboard";
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-extrabold text-slate-900 shadow-sm hover:bg-white"
            >
              Mark reviewed
            </button>
          </div>
        </div>
      </header>

      {/* Scoreboard */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={`rounded-3xl border p-4 shadow-sm backdrop-blur ${tileTone(tempsTone)}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]">
            Temperature
          </div>
          <div className="mt-2 text-4xl font-extrabold leading-none">
            {summary.temperature.fails}
          </div>
          <div className="mt-2 text-xs font-semibold opacity-90">
            Repeat issues: {repeatFailCount}
          </div>
          <div className="mt-3 text-[11px] font-medium opacity-80 line-clamp-2">
            Fail rate: {summary.temperature.failRatePct}%
          </div>
        </div>

        <div className={`rounded-3xl border p-4 shadow-sm backdrop-blur ${tileTone(cleaningTone)}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]">
            Cleaning
          </div>
          <div className="mt-2 text-4xl font-extrabold leading-none">
            {summary.cleaning.missedTotal}
          </div>
          <div className="mt-2 text-xs font-semibold opacity-90">
            Repeat misses: {repeatMissCount}
          </div>
          <div className="mt-3 text-[11px] font-medium opacity-80 line-clamp-2">
            Due: {summary.cleaning.dueTotal} · Completed: {summary.cleaning.completedTotal}
          </div>
        </div>

        <div className={`rounded-3xl border p-4 shadow-sm backdrop-blur ${tileTone(trainingTone)}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]">
            Training
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-4xl font-extrabold leading-none">{trainingBad}</div>
            <div className="text-xs font-extrabold opacity-90 pb-1">expired</div>
          </div>
          <div className="mt-2 text-xs font-semibold opacity-90">
            Due soon: {trainingSoon}
          </div>
          <div className="mt-3 text-[11px] font-medium opacity-80 line-clamp-2">
            Keep it current. Inspectors love easy wins.
          </div>
        </div>
      </section>

      {/* Top fixes */}
      <section className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
        <h2 className="text-sm font-extrabold text-slate-900">Top fixes</h2>
        <p className="mt-1 text-[11px] font-medium text-slate-500">
          The point is to do less guessing and more fixing.
        </p>

        <div className="mt-3 space-y-2">
          {fixes.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs font-semibold text-emerald-900">
              No major recurring issues detected. Keep logging consistently.
            </div>
          ) : (
            fixes.map((f, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900">
                    {f.title}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-600">
                    {f.action}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold ${pillTone(f.tone)}`}>
                  {f.tone === "danger" ? "URGENT" : f.tone === "warn" ? "DO SOON" : "OK"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Details (simple lists, staff readable) */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
          <h3 className="text-sm font-extrabold text-slate-900">Repeat temp failures</h3>
          <div className="mt-2 space-y-2">
            {summary.temperature.repeatFailures.length ? (
              summary.temperature.repeatFailures.slice(0, 6).map((r) => (
                <div key={r.key} className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="text-xs font-extrabold text-slate-900">
                    {r.area} · {r.item}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-600">
                    {r.count} fails · last seen {formatDDMMYYYY(r.lastSeenOn)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs font-semibold text-slate-600">
                None detected.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
          <h3 className="text-sm font-extrabold text-slate-900">Repeat missed cleans</h3>
          <div className="mt-2 space-y-2">
            {summary.cleaning.repeatMisses.length ? (
              summary.cleaning.repeatMisses.slice(0, 6).map((r) => (
                <div key={r.taskId} className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="text-xs font-extrabold text-slate-900">
                    {r.task}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-600">
                    Missed {r.missedCount} · last missed {formatDDMMYYYY(r.lastMissedOn)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs font-semibold text-slate-600">
                None detected.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
