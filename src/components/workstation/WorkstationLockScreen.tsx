"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type StaffRow = {
  team_member_id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "").slice(0, 8);
}

// Keep aligned with middleware PUBLIC_PATHS
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/pricing",
  "/guides",
  "/app",
  "/privacy",
  "/terms",
  "/cookies",
  "/demo-wall",
]);

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/guides/") ||
    pathname.startsWith("/demo-wall") ||
    pathname.startsWith("/demo/")
  );
}

export default function WorkstationLockScreen() {
  const pathname = usePathname();
  const { locked, operator, setOperator, clearOperator } = useWorkstation();

  const [mounted, setMounted] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<StaffRow | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pinRef = useRef<HTMLInputElement | null>(null);
  const autoSubmittingRef = useRef(false);

  // Portal mount
  useEffect(() => setMounted(true), []);

  // Session gate
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      setHasSession(!!data?.session && !error);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Prevent background scrolling when locked
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);

  // Load staff list (only when relevant)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      if (isPublicPath(pathname) || !hasSession) {
        setStaff([]);
        setOrgId(null);
        setLocationId(null);
        setLoading(false);
        return;
      }

      const oid = await getActiveOrgIdClient();
      const lid = await getActiveLocationIdClient();
      if (!alive) return;

      setOrgId(oid);
      setLocationId(lid);

      if (!oid || !lid) {
        setStaff([]);
        setLoading(false);
        return;
      }

      const primary = await supabase
        .from("v_location_team")
        .select("team_member_id,name,initials,role")
        .eq("org_id", oid)
        .eq("location_id", lid)
        .order("name", { ascending: true });

      if (!alive) return;

      if (primary.error) {
        setMsg(primary.error.message);
        setStaff([]);
        setLoading(false);
        return;
      }

      const rows = ((primary.data ?? []) as any) as StaffRow[];

      // Fallback if view is empty
      if (rows.length === 0) {
        const fallback = await supabase
  .from("team_members")
  .select("id,name,initials,role")
  .eq("org_id", oid)
  .eq("location_id", lid)
  .eq("active", true)
  .eq("pin_enabled", true)
  .order("name", { ascending: true });

        if (!alive) return;

        if (!fallback.error && Array.isArray(fallback.data) && fallback.data.length) {
          setStaff(
            fallback.data.map((r: any) => ({
              team_member_id: String(r.id),
              name: r.name ? String(r.name) : null,
              initials: r.initials ? String(r.initials) : null,
              role: r.role ? String(r.role) : null,
            }))
          );
        } else {
          setStaff([]);
        }
      } else {
        setStaff(rows);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [pathname, hasSession]);

  const visible = useMemo(() => staff, [staff]);

  // ✅ Preselect last active operator (if they exist in current location list)
  useEffect(() => {
    if (!locked) return;
    if (!visible.length) return;

    if (selected) return; // don’t override if user already picked
    const prevId = operator?.teamMemberId;
    if (!prevId) return;

    const match = visible.find((s) => s.team_member_id === prevId);
    if (match) setSelected(match);
  }, [locked, visible, operator, selected]);

  // ✅ Focus PIN when locked opens
  useEffect(() => {
    if (!locked) return;
    window.setTimeout(() => pinRef.current?.focus(), 50);
  }, [locked]);

  async function unlock() {
    if (!orgId || !locationId) return;
    if (!selected) return setMsg("Pick a user.");
    const cleaned = onlyDigits(pin);
    if (cleaned.length < 4) return setMsg("Enter your PIN.");

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/workstation/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          locationId,
          teamMemberId: selected.team_member_id,
          pin: cleaned,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        const reason = json?.reason ?? "unlock-failed";
        if (reason === "locked") setMsg("Too many wrong PINs. Wait a bit and try again.");
        else if (reason === "no-pin-set") setMsg("This user has no PIN set.");
        else if (reason === "pin-not-enabled") setMsg("PIN not enabled for this user.");
        else setMsg("Wrong PIN.");
        return;
      }

      setOperator(json.operator);
      setPin("");
      setSelected(null);
    } finally {
      setBusy(false);
      autoSubmittingRef.current = false;
    }
  }

  // ✅ Auto-submit when PIN reaches 4 digits (minimum clicks)
  useEffect(() => {
    if (!locked) return;
    if (!selected) return;
    if (busy) return;
    const cleaned = onlyDigits(pin);
    if (cleaned.length < 4) return;

    if (autoSubmittingRef.current) return;
    autoSubmittingRef.current = true;
    void unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, locked, selected, busy]);

  // HARD gates
  if (!mounted) return null;
  if (!locked) return null;
  if (isPublicPath(pathname)) return null;
  if (!hasSession) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] isolate">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      <div className="relative mx-auto mt-10 w-[min(720px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-white/90 p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">Workstation locked</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={clearOperator}
            type="button"
            title="Clears active operator on this device"
          >
            Clear operator
          </button>
        </div>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading staff…
          </div>
        ) : !orgId || !locationId ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No active organisation/location selected.
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No staff found for this location.
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map((s) => {
                const active = selected?.team_member_id === s.team_member_id;
                const initials = (s.initials ?? "").toUpperCase() || "—";
                return (
                  <button
                    key={s.team_member_id}
                    onClick={() => {
                      setSelected(s);
                      setMsg(null);
                      window.setTimeout(() => pinRef.current?.focus(), 50);
                    }}
                    className={[
                      "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                    type="button"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {s.name ?? "Unnamed"}
                      </div>
                      <div className="text-[11px] text-slate-500">{(s.role ?? "staff").toString()}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-slate-700">PIN</div>
                  <input
                    ref={pinRef}
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(onlyDigits(e.target.value))}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg tracking-widest"
                    placeholder="••••"
                  />
                </div>

                <div className="flex items-end justify-end gap-2">
                  {msg ? <div className="mr-auto text-xs text-rose-700">{msg}</div> : null}

                  <button
                    onClick={() => void unlock()}
                    disabled={!selected || pin.length < 4 || busy}
                    className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    type="button"
                  >
                    {busy ? "Checking…" : "Unlock"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {operator ? (
          <div className="mt-3 text-[11px] text-slate-600">
            Previously active:{" "}
            <span className="font-semibold">{operator.initials ?? operator.name}</span>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}