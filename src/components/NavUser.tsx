"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  role: "staff" | "manager" | "admin";
  full_name?: string | null;
  email?: string | null;
};

export default function NavUser() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!mounted) return;
        setProfile(data as Profile);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); mounted = false; };
  }, []);

  if (!email) {
    return (
      <a href="/sign-in" className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-gray-100">
        Sign in
      </a>
    );
  }

  const initials = (profile?.full_name || email).split(/[^\w]+/).filter(Boolean).map(s => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs">{initials}</span>
        <span className="hidden sm:inline text-slate-700">{profile?.role ?? "staff"}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow">
          <div className="px-3 py-2 border-b text-sm">
            <div className="font-medium">{profile?.full_name || email}</div>
            <div className="text-xs text-slate-600">Role: {profile?.role ?? "staff"}</div>
          </div>
          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={async () => { await supabase.auth.signOut(); location.href = "/"; }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
