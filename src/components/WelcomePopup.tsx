"use client";

import React, { useEffect, useState } from "react";

const LS_KEY = "tt_welcome_seen_v1";

export default function WelcomePopup({ user }: { user: any | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    try {
      const seen = localStorage.getItem(LS_KEY);
      if (seen === "1") return;
      setOpen(true);
      localStorage.setItem(LS_KEY, "1");
    } catch {
      // ignore
      setOpen(true);
    }
  }, [user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="text-lg font-semibold">Welcome to TempTake</div>
        <div className="mt-2 text-sm text-slate-600">
          Quick setup:
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Add your first location (Sites).</li>
            <li>Add your team members.</li>
            <li>Build your temp routines.</li>
          </ol>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={() => setOpen(false)}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
