"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type Mode = "unlock" | "set-pin";

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

  // Unlock PIN
  const [pin, setPin] = useState("");

  // Set PIN flow
  const [mode, setMode] = useState<Mode>("unlock");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
          .eq("login_enabled", true)
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

  function resetPins() {
    setPin("");
    setNewPin("");
    setConfirmPin("");
  }

  function selectUser(s: StaffRow) {
    setSelected(s);
    setMsg(null);
    setMode("unlock");
    resetPins();
  }

  async function unlock() {
    if (!orgId || !locationId) return;
    if (!selected) return setMsg("Pick a user.");
    const cleaned = onlyDigits(pin);
    if (cleaned.length < 4) return setMsg("Enter a 4+ digit PIN.");

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
        if (reason === "locked") {
          setMsg("Too many wrong PINs. Wait a bit and try again.");
        } else if (reason === "no-pin-set") {
          // ✅ Flip into set-pin mode instead of dead-ending
          setMode("set-pin");
          setMsg("This user has no PIN set. Create one now.");
          setNewPin("");
          setConfirmPin("");
        } else {
          setMsg("Wrong PIN.");
        }
        return;
      }

      // ✅ Make sure shape matches provider expectations
      const op = json?.operator ?? {};
      setOperator({
        teamMemberId: String(op.teamMemberId ?? op.team_member_id ?? selected.team_member_id),
        orgId: String(op.orgId ?? op.org_id ?? orgId),
        locationId: String(op.locationId ?? op.location_id ?? locationId),
        name: String(op.name ?? selected.name ?? "Operator"),
        initials: (op.initials ?? selected.initials ?? null) as string | null,
        role: (op.role ?? selected.role ?? null) as string | null,
      });

      resetPins();
      setSelected(null);
      setMode("unlock");
    } catch (e: any) {
      setMsg(e?.message ?? "Unlock failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setPinForUser() {
    if (!orgId || !locationId) return;
    if (!selected) return setMsg("Pick a user.");

    const p1 = onlyDigits(newPin);
    const p2 = onlyDigits(confirmPin);

    if (p1.length < 4) return setMsg("PIN must be 4–8 digits.");
    if (p1 !== p2) return setMsg("PINs do not match.");

    setBusy(true);
    setMsg(null);

    try {
      // You need an API route that calls your RPC:
      // - set_my_team_member_pin(org_id, team_member_id, pin)
      const res = await fetch("/api/workstation/set-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          locationId,
          teamMemberId: selected.team_member_id,
          pin: p1,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        const reason = json?.reason ?? "set-pin-failed";
        if (reason === "forbidden") setMsg("Not allowed to set PIN for this user.");
        else setMsg("Failed to set PIN.");
        return;
      }

      // ✅ PIN set, go back to unlock
      setMode("unlock");
      setMsg("PIN set. Enter it to unlock.");
      setPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to set PIN.");
    } finally {
      setBusy(false);
    }
  }

  // HARD gates
  if (!mounted) return null;
  if (!locked) return null;
  if (isPublicPath(pathname)) return null;
  if (!hasSession) return null;

  // PORTAL: guarantees we’re above everything regardless of parent stacking contexts
  return createPortal(
    <div className="fixed inset-0 z-[2147483647] isolate">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      {/* Panel */}
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
            onClick={() => {
              setMode("unlock");
              resetPins();
              clearOperator();
            }}
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
                    onClick={() => selectUser(s)}
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
              {mode === "unlock" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">PIN</div>
                    <input
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(onlyDigits(e.target.value))}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg tracking-widest"
                      placeholder="••••"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void unlock();
                      }}
                    />
                    <div className="mt-1 text-[11px] text-slate-500">4–8 digits</div>
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
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">Set new PIN</div>
                    <input
                      inputMode="numeric"
                      value={newPin}
                      onChange={(e) => setNewPin(onlyDigits(e.target.value))}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg tracking-widest"
                      placeholder="••••"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void setPinForUser();
                      }}
                    />
                    <div className="mt-1 text-[11px] text-slate-500">4–8 digits</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700">Confirm PIN</div>
                    <input
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg tracking-widest"
                      placeholder="••••"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void setPinForUser();
                      }}
                    />
                    <div className="mt-1 text-[11px] text-slate-500">Must match</div>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                    {msg ? <div className="mr-auto text-xs text-rose-700">{msg}</div> : null}

                    <button
                      onClick={() => {
                        setMode("unlock");
                        setMsg(null);
                        setNewPin("");
                        setConfirmPin("");
                      }}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      type="button"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => void setPinForUser()}
                      disabled={!selected || newPin.length < 4 || confirmPin.length < 4 || busy}
                      className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      type="button"
                    >
                      {busy ? "Saving…" : "Set PIN"}
                    </button>
                  </div>
                </div>
              )}
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