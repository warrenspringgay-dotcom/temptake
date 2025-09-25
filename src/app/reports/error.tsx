"use client";

export default function Error({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900">
      <div className="font-medium">Something went wrong</div>
      <p className="mt-1 text-sm opacity-90">
        Try again. If it keeps happening, check server logs for “[/reports] getInstantAudit90d failed”.
      </p>
      <button
        onClick={() => reset()}
        className="mt-3 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm hover:bg-rose-100"
      >
        Try again
      </button>
    </div>
  );
}
