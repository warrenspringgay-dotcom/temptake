// src/components/workstation/WorkstationLockScreen.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type OperatorRow = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

function initialsFromName(name?: string | null) {
  const s = String(name ?? "").trim();
  if (!s) return null;
  const parts = s.split(/\s+/).filter(Boolean);
  const out = parts
    .slice(0, 2)
    .map((p) => (p[0] ? p[0].toUpperCase() : ""))
    .join("");
  return out || null;
}

async function fetchOperators(orgId: string, locationId: string): Promise<OperatorRow[]> {
  const url = `/api/workstation/operators?orgId=${encodeURIComponent(orgId)}&locationId=${encodeURIComponent(
    locationId
  )}`;
  const res = await fetch(url, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) return [];
  return (json.operators ?? []) as OperatorRow[];
}

async function attemptUnlockWithPin(params: {
  orgId: string;
  locationId: string;
  teamMemberId: string;
  pin: string;
}) {
  const res = await fetch("/api/workstation/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function attemptSetPin(params: {
  orgId: string;
  locationId: string;
  teamMemberId: string;
  pin: string;
}) {
  const res = await fetch("/api/workstation/set-pin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function readOrgAndLocation(): Promise<{ orgId: string | null; locationId: string | null }> {
  try {
    const [orgId, locationId] = await Promise.all([getActiveOrgIdClient(), getActiveLocationIdClient()]);
    return { orgId, locationId };
  } catch {
    return { orgId: null, locationId: null };
  }
}

export default function WorkstationLockScreen({ onClose }: { onClose: () => void }) {
  const ws = useWorkstation();

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selected, setSelected] = useState<OperatorRow | null>(null);

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState(""); // ✅ confirm pin
  const [needsSetPin, setNeedsSetPin] = useState(false); // ✅ set-pin mode

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const lastAttemptRef = useRef<string>("");

  // Load org/location
  useEffect(() => {
    let alive = true;
    (async () => {
      const { orgId: o, locationId: l } = await readOrgAndLocation();
      if (!alive) return;
      setOrgId(o);
      setLocationId(l);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load operators once we have org/location
  useEffect(() => {
    let alive = true;

    (async () => {
      setMsg(null);

      if (!orgId || !locationId) {
        setOperators([]);
        setSelected(null);
        setMsg("No active organisation/location selected.");
        return;
      }

      const list = await fetchOperators(orgId, locationId);
      if (!alive) return;

      setOperators(list);

      const lastId = ws.operator?.teamMemberId ?? null;
      const found = lastId ? list.find((o) => o.id === lastId) : null;
      setSelected(found ?? list[0] ?? null);
    })();

    return () => {
      alive = false;
    };
  }, [orgId, locationId, ws.operator?.teamMemberId]);

  // Clear pin when changing operator
  useEffect(() => {
    setPin("");
    setPin2("");
    setMsg(null);
    setNeedsSetPin(false); // ✅ reset set-pin mode when operator changes
  }, [selected?.id]);

  const selectedLabel = useMemo(() => {
    if (!selected) return "No operators available.";
    return `${selected.name ?? "Unnamed"}${selected.role ? ` (${selected.role})` : ""}`;
  }, [selected]);

  function setOperatorAndUnlock() {
    if (!orgId || !locationId || !selected?.id) return;

    ws.setOperator({
      teamMemberId: selected.id,
      orgId,
      locationId,
      name: selected.name ?? null,
      initials:
        (selected.initials ?? "").trim().toUpperCase() ||
        initialsFromName(selected.name) ||
        null,
      role: selected.role ?? null,
    });

    ws.unlockWorkstation();
    setPin("");
    setPin2("");
    setMsg(null);
    setNeedsSetPin(false);
    onClose();
  }

  async function handleUnlock() {
    if (busy) return;

    if (!orgId || !locationId) {
      setMsg("No active organisation/location selected.");
      return;
    }
    if (!selected?.id) {
      setMsg("Select an operator.");
      return;
    }

    // ✅ If we're in set-pin mode, validate both pins first
    if (needsSetPin) {
      const p1 = pin.trim();
      const p2 = pin2.trim();
      if (p1.length !== 4 || p2.length !== 4) {
        setMsg("Enter 4 digits in both fields.");
        return;
      }
      if (p1 !== p2) {
        setMsg("PINs do not match.");
        setPin("");
        setPin2("");
        return;
      }

      setBusy(true);
      setMsg(null);

      try {
        const sp = await attemptSetPin({
          orgId,
          locationId,
          teamMemberId: selected.id,
          pin: p1,
        });

        if (!(sp.res.ok && sp.json?.ok)) {
          const r = sp.json?.reason || sp.json?.message || "Could not set PIN.";
          setMsg(String(r));
          setPin("");
          setPin2("");
          return;
        }

        // Now unlock
        const un = await attemptUnlockWithPin({
          orgId,
          locationId,
          teamMemberId: selected.id,
          pin: p1,
        });

        if (un.res.ok && un.json?.ok) {
          setOperatorAndUnlock();
          return;
        }

        const r2 =
          un.json?.reason ||
          un.json?.message ||
          (un.res.status === 401 ? "Incorrect PIN." : null) ||
          "Unlock failed.";
        setMsg(String(r2));
        setPin("");
        setPin2("");
      } catch {
        setMsg("Unlock failed.");
        setPin("");
        setPin2("");
      } finally {
        setBusy(false);
        lastAttemptRef.current = "";
      }

      return;
    }

    // ✅ normal unlock mode
    const p = pin.trim();
    if (p.length !== 4) {
      setMsg("Enter 4 digits.");
      return;
    }

    const attemptKey = `${selected.id}:${p}`;
    if (lastAttemptRef.current === attemptKey) return;
    lastAttemptRef.current = attemptKey;

    setBusy(true);
    setMsg(null);

    try {
      const first = await attemptUnlockWithPin({
        orgId,
        locationId,
        teamMemberId: selected.id,
        pin: p,
      });

      if (first.res.ok && first.json?.ok) {
        setOperatorAndUnlock();
        return;
      }

      const firstReason = first.json?.reason ?? first.json?.message ?? null;

      // ✅ if no pin set, switch UI into set-pin mode instead of silently setting it
      if (String(firstReason) === "no-pin-set") {
        setNeedsSetPin(true);
        setMsg("Please set a 4-digit PIN for this operator.");
        setPin("");
        setPin2("");
        return;
      }

      const reason =
        first.json?.reason ||
        first.json?.message ||
        (first.res.status === 401 ? "Incorrect PIN." : null) ||
        "Unlock failed.";

      setMsg(String(reason));
      setPin("");
    } catch {
      setMsg("Unlock failed.");
      setPin("");
    } finally {
      setBusy(false);
      lastAttemptRef.current = "";
    }
  }

  // Auto-submit on 4 digits (only in normal unlock mode)
  useEffect(() => {
    if (needsSetPin) return;
    if (!selected?.id) return;
    if (pin.trim().length === 4 && !busy) {
      handleUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, needsSetPin]);

  function clearOperator() {
    ws.clearOperator();
    setSelected(null);
    setPin("");
    setPin2("");
    setMsg(null);
    setNeedsSetPin(false);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[92vw] max-w-[860px] rounded-3xl border border-white/30 bg-white/70 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-5">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {needsSetPin ? "Set operator PIN" : "Workstation locked"}
            </div>
            <div className="text-sm text-slate-600">
              {needsSetPin
                ? "This operator doesn’t have a PIN yet. Set one to continue."
                : "Select a user and enter a PIN to continue."}
            </div>
          </div>

          <button
            type="button"
            onClick={clearOperator}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Clear operator
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-4 md:grid-cols-2">
          {/* Operator list */}
          <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
              Operator
            </div>

            <div className="space-y-2">
              {operators.length === 0 ? (
                <div className="text-sm text-slate-600">{msg ?? "No operators available."}</div>
              ) : (
                operators.map((op) => {
                  const active = selected?.id === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelected(op)}
                      className={[
                        "w-full rounded-xl border px-3 py-2 text-left transition",
                        active
                          ? "border-slate-900/30 bg-white/80 shadow-sm"
                          : "border-white/40 bg-white/50 hover:bg-white/70",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                          {(op.initials ?? initialsFromName(op.name) ?? "?").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {op.name ?? "Unnamed"}
                          </div>
                          <div className="text-xs text-slate-600">{op.role ?? ""}</div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PIN entry */}
          <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
              {needsSetPin ? "New PIN" : "PIN"}
            </div>

            <div className="mb-2 text-sm text-slate-700">{selectedLabel}</div>

            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(v);
                setMsg(null);
              }}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-slate-900/20"
              placeholder="••••"
              disabled={busy || !selected}
              autoFocus
            />

            {needsSetPin ? (
              <>
                <div className="mt-3 mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                  Confirm PIN
                </div>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin2}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin2(v);
                    setMsg(null);
                  }}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-slate-900/20"
                  placeholder="••••"
                  disabled={busy || !selected}
                />
                <div className="mt-2 text-xs text-slate-600">
                  Enter the same 4 digits twice to confirm.
                </div>
              </>
            ) : (
              <div className="mt-2 text-xs text-slate-600">Enter 4 digits.</div>
            )}

            {msg ? <div className="mt-2 text-sm text-red-600">{msg}</div> : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleUnlock}
                disabled={
                  busy ||
                  !selected ||
                  (needsSetPin
                    ? pin.trim().length !== 4 || pin2.trim().length !== 4
                    : pin.trim().length !== 4)
                }
                className={[
                  "rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
                  busy ||
                  !selected ||
                  (needsSetPin
                    ? pin.trim().length !== 4 || pin2.trim().length !== 4
                    : pin.trim().length !== 4)
                    ? "bg-emerald-600/50"
                    : "bg-emerald-600 hover:bg-emerald-700",
                ].join(" ")}
              >
                {busy ? (needsSetPin ? "Setting..." : "Unlocking...") : needsSetPin ? "Set PIN" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}