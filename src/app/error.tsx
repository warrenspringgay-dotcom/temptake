"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Something went wrong</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error?.message ?? "Unknown error"}</pre>
      <button
        onClick={() => reset()}
        style={{ marginTop: 12, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6 }}
      >
        Try again
      </button>
    </div>
  );
}
