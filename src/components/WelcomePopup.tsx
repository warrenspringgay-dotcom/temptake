// src/components/WelcomePopup.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const LS_KEY = "tt_welcome_seen_v2";

export default function WelcomePopup() {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;          // wait for AuthProvider
    if (!user) return;           // only for logged-in users

    try {
      const seen = window.localStorage.getItem(LS_KEY);
      if (seen === "1") return;

      setOpen(true);
      window.localStorage.setItem(LS_KEY, "1");
    } catch {
      // localStorage blocked? still show once
      setOpen(true);
    }
  }, [ready, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="text-lg font-semibold">Welcome to TempTake</div>

        <div className="mt-2 text-sm text-slate-600">
          Quick setup checklist:
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Add your team members.</li>
            <li>Create your cleaning rota.</li>
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
