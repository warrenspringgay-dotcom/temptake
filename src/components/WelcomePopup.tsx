// src/components/WelcomePopup.tsx
"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

const LS_KEY = "tt_welcome_seen_v1";

type WelcomePopupProps = {
  user: User | null;
};

export default function WelcomePopup({ user }: WelcomePopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    try {
      const seen = window.localStorage.getItem(LS_KEY);
      if (seen === "1") return;

      setOpen(true);
      window.localStorage.setItem(LS_KEY, "1");
    } catch {
      // localStorage might explode in some weird browser modes – just show it once
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
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Use the FAB Plus for quick tasks (floating bottom corner)</li>
            <li>Add all your team members.</li>
            <li>Build your temp routines.</li>
            <li>Setup your cleaning rota.</li>
            <li>Update your allergen information.</li>
            <li>Add all your suppliers.</li>
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
