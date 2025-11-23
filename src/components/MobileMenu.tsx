// src/components/MobileMenu.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  user: any | null;
};

const links: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/reports", label: "Reports" },
  { href: "/locations", label: "Locations & sites" },
  { href: "/help", label: "Help & support" },
];

const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function MobileMenu({ user }: Props) {
  // 🚫 If not logged in → hide mobile menu entirely
  if (!user) return null;

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isManager =
    user?.user_metadata?.role === "manager" ||
    user?.user_metadata?.is_manager === true;

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      setOpen(false);
      router.push("/login");
      router.refresh?.();
    } catch (e) {
      console.error(e);
      alert("Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      {/* Hamburger (mobile only, now only shows when logged in) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
      >
        <span className="block h-[2px] w-4 rounded bg-slate-800" />
        <span className="mt-[3px] block h-[2px] w-4 rounded bg-slate-800" />
        <span className="mt-[3px] block h-[2px] w-4 rounded bg-slate-800" />
      </button>

      {/* Overlay + slide-out panel */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Background dim */}
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute top-2 right-2 w-[calc(100%-1rem)] max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            …
          </div>
        </div>
      )}
    </>
  );
}


