"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border p-6 bg-card">
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
