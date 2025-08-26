"use client";
import { useState } from "react";
import { supabaseEnabled } from "@/lib/supabase";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-200 bg-white">{children}</div>;
}
function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4 border-b border-gray-200">{children}</div>;
}
function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4">{children}</div>;
}
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={"inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 " + (props.className ?? "")} />;
}

export default function SyncLocalPage() {
  const [state, setState] = useState<"idle"|"running"|"done"|"error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("running");
    setMsg("");
    try {
      if (!supabaseEnabled) throw new Error("Supabase disabled. Set NEXT_PUBLIC_SUPABASE_ENABLED=true and env keys.");

      const payload = {
        allergens: JSON.parse(localStorage.getItem("tt_allergen_rows") || "[]"),
        suppliers: JSON.parse(localStorage.getItem("tt_suppliers_rows") || "[]"),
        logs: JSON.parse(localStorage.getItem("tt_logs") || "[]"),
      };
      const res = await fetch("/api/sync-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setState("done");
      setMsg("Synced successfully.");
    } catch (e: unknown) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Local → Cloud sync</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 mb-3">
            Push this device’s local allergens, suppliers and temperature logs into the central database.
          </p>
          <Button onClick={run} disabled={state==="running"}>{state==="running" ? "Syncing…" : "Sync now"}</Button>
          {msg && (
            <div className={`mt-3 text-sm ${state==="error" ? "text-rose-700":"text-emerald-700"}`}>
              {msg}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
