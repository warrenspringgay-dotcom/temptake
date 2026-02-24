// src/components/workstation/WorkstationLockScreen.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

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

async function resolveMaybePromise<T>(v: T | Promise<T>): Promise<T> {
  return await Promise.resolve(v);
}

export default function WorkstationLockScreen({ onClose }: { onClose?: () => void }) {
  const ws = useWorkstation();

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selected, setSelected] = useState<OperatorRow | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const lastAttemptRef = useRef<string>("");

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // Load org/location (helpers might be async)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const o = await resolveMaybePromise(getActiveOrgIdClient() as any);
      const l = await resolveMaybePromise(getActiveLocationIdClient() as any);
      if (cancelled) return;
      setOrgId(o ?? null);
      setLocationId(l ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadOperators(o: string, l: string) {
    const res = await fetch(
      `/api/workstation/operators?orgId=${encodeURIComponent(o)}&locationId=${encodeURIComponent(l)}`,
      { method: "GET", cache: "no-store" }
    );
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.ok) {
      throw new Error(json?.reason || json?.message || "Failed to load operators");
    }
    return (json.operators ?? []) as OperatorRow[];
  }

  // Fetch operators when context is ready
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMsg(null);
      setOperators([]);
      setSelected(null);

      if (!ws.hasSession) return; // no auth session = no workstation lock
      if (!orgId || !locationId) {
        setMsg("No active organisation/location selected.");
        return;
      }

      try {
        const list = await loadOperators(orgId, locationId);
        if (cancelled) return;
        setOperators(list);

        // Auto-select previous operator if still available
        const stored = localStorage.getItem("tt_workstation_operator");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const prevId = parsed?.teamMemberId;
            const match = list.find((x) => x.id === prevId);
            if (match) setSelected(match);
          } catch {}
        }
      } catch (e: any) {
        if (cancelled) return;
        setMsg(String(e?.message ?? e));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.hasSession, orgId, locationId]);

  const canUnlock = useMemo(() => {
    return !!ws.hasSession && !!orgId && !!locationId && !!selected && pin.length === 4 && !busy;
  }, [ws.hasSession, orgId, locationId, selected, pin, busy]);

  async function attemptUnlockWithPin(o: string, l: string, teamMemberId: string, pin4: string) {
    const res = await fetch("/api/workstation/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: o, locationId: l, teamMemberId, pin: pin4 }),
    });
    return res;
  }

  async function handleUnlock() {
    if (!ws.hasSession) return;

    if (!orgId || !locationId) {
      setMsg("No active organisation/location selected.");
      return;
    }
    if (!selected) {
      setMsg("Select an operator.");
      return;
    }
    if (pin.length !== 4) {
      setMsg("Enter 4 digits.");
      return;
    }

    const attemptKey = `${orgId}|${locationId}|${selected.id}|${pin}`;
    if (lastAttemptRef.current === attemptKey) return; // prevent loop spam
    lastAttemptRef.current = attemptKey;

    setBusy(true);
    setMsg(null);

    try {
      const res = await attemptUnlockWithPin(orgId, locationId, selected.id, pin);
      const json = await res.json().catch(() => ({} as any));

      if (res.ok && json?.ok) {
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
        setMsg(null);
        onClose?.();
        return;
      }

      const reason =
        json?.reason ||
        json?.message ||
        (res.status === 401 ? "Incorrect PIN." : res.status === 423 ? "Workstation locked." : null);

      setMsg(reason || "Incorrect PIN.");
      setPin("");
      lastAttemptRef.current = ""; // allow retry
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
      lastAttemptRef.current = "";
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit on 4 digits
  useEffect(() => {
    if (pin.length === 4 && selected && orgId && locationId && ws.hasSession && !busy) {
      void handleUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      <div className="relative w-[92vw] max-w-[820px] rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-5">
          <div>
            <div className="text-lg font-semibold">Workstation locked</div>
            <div className="text-sm text-neutral-600">
              Select a user and enter a PIN to continue.
            </div>
          </div>
          <button
            className="text-sm text-neutral-700 hover:text-neutral-900"
            onClick={() => ws.clearOperator()}
          >
            Clear operator
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-neutral-600">
              OPERATOR
            </div>

            {!ws.hasSession ? (
              <div className="text-sm text-neutral-700">Log in first.</div>
            ) : !orgId || !locationId ? (
              <div className="text-sm text-neutral-700">
                No active organisation/location selected.
              </div>
            ) : operators.length === 0 ? (
              <div className="text-sm text-neutral-700">No operators available.</div>
            ) : (
              <div className="space-y-2">
                {operators.map((op) => {
                  const isSel = selected?.id === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() => {
                        setSelected(op);
                        setMsg(null);
                        lastAttemptRef.current = "";
                      }}
                      className={[
                        "w-full rounded-2xl border px-3 py-2 text-left transition",
                        isSel
                          ? "border-black/20 bg-white shadow-sm"
                          : "border-white/30 bg-white/40 hover:bg-white/60",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-black/70 text-white flex items-center justify-center text-sm font-semibold">
                          {(op.initials ?? initialsFromName(op.name) ?? "??").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-neutral-900">
                            {op.name ?? "Unnamed"}
                          </div>
                          <div className="text-xs text-neutral-600">
                            {op.role ?? "staff"}
                            {isSel ? " · selected" : ""}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-neutral-600">PIN</div>

            <input
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                setPin(next);
                setMsg(null);
                lastAttemptRef.current = "";
              }}
              placeholder="••••"
              className="w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-lg tracking-[0.35em] outline-none"
            />

            <div className="mt-2 text-xs text-neutral-600">Enter 4 digits.</div>

            {msg ? <div className="mt-2 text-sm text-red-600">{msg}</div> : null}

            <div className="mt-4 flex justify-end">
              <button
                className={[
                  "rounded-2xl px-5 py-2 text-sm font-semibold transition",
                  canUnlock
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-emerald-600/40 text-white/80 cursor-not-allowed",
                ].join(" ")}
                disabled={!canUnlock}
                onClick={() => void handleUnlock()}
              >
                {busy ? "Unlocking..." : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}