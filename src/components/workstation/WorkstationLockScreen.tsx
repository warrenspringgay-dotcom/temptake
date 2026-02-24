// src/components/workstation/WorkstationLockScreen.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type OperatorRow = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
  pin_enabled?: boolean;
  has_pin?: boolean;
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

async function fetchOperators(orgId: string, locationId: string | null) {
  const url = new URL("/api/workstation/operators", window.location.origin);
  url.searchParams.set("orgId", orgId);
  if (locationId) url.searchParams.set("locationId", locationId);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json().catch(() => ({} as any));
  return { res, json };
}

async function attemptUnlockWithPin(orgId: string, locationId: string | null, teamMemberId: string, pin: string) {
  const res = await fetch("/api/workstation/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orgId, locationId, teamMemberId, pin }),
  });
  const json = await res.json().catch(() => ({} as any));
  return { res, json };
}

export default function WorkstationLockScreen({ onClose }: { onClose: () => void }) {
  const ws = useWorkstation();

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selected, setSelected] = useState<OperatorRow | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const lastAttemptRef = useRef<string>("");

  const selectedId = selected?.id ?? null;

  // Auto-select previous operator if present
  useEffect(() => {
    if (!ws.operator?.teamMemberId) return;
    const id = ws.operator.teamMemberId;
    const found = operators.find((o) => o.id === id);
    if (found) setSelected(found);
  }, [operators, ws.operator?.teamMemberId]);

  // Load operators when modal mounts or org/location changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMsg(null);
      setOperators([]);
      setSelected(null);

      const { orgId, locationId } = await ws.getActiveContext();

      if (!orgId) {
        setMsg("No active organisation selected.");
        return;
      }

      const { res, json } = await fetchOperators(orgId, locationId);
      if (cancelled) return;

      if (!res.ok || !json?.ok) {
        setMsg(json?.reason || "Failed to load operators.");
        return;
      }

      const list = (json.operators ?? []) as OperatorRow[];
      setOperators(list);

      // keep selection if possible
      const prevId = ws.operator?.teamMemberId;
      if (prevId) {
        const found = list.find((o) => o.id === prevId);
        if (found) setSelected(found);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // ws.getActiveContext is stable (memoized in provider)
  }, [ws]);

  const canUnlock = useMemo(() => {
    if (busy) return false;
    if (!selectedId) return false;
    if (pin.trim().length !== 4) return false;
    return true;
  }, [busy, selectedId, pin]);

  async function handleUnlock() {
    if (!canUnlock || !selected) return;

    setMsg(null);

    const pin4 = pin.trim();
    const attemptKey = `${selected.id}:${pin4}`;

    // Prevent “stuck loop” by avoiding repeated identical attempts while still busy
    if (lastAttemptRef.current === attemptKey && busy) return;
    lastAttemptRef.current = attemptKey;

    setBusy(true);

    try {
      const { orgId, locationId } = await ws.getActiveContext();
      if (!orgId) {
        setMsg("No active organisation selected.");
        return;
      }

      const { res, json } = await attemptUnlockWithPin(orgId, locationId, selected.id, pin4);

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
        onClose();
        return;
      }

      const reason =
        json?.reason ||
        json?.message ||
        (res.status === 401 ? "Incorrect PIN." : null);

      setMsg(reason || "Incorrect PIN.");
      setPin("");
    } catch (e) {
      setMsg("Unlock failed.");
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit on 4 digits
  useEffect(() => {
    if (pin.trim().length === 4 && selectedId && !busy) {
      handleUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, selectedId]);

  function clearOperator() {
    ws.setOperator(null);
    ws.lockNow();
    setSelected(null);
    setPin("");
    setMsg(null);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[920px] rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md"
      >
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <div className="text-lg font-semibold text-zinc-900">Workstation locked</div>
            <div className="text-sm text-zinc-600">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            className="text-sm text-zinc-600 hover:text-zinc-900"
            onClick={clearOperator}
            type="button"
          >
            Clear operator
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-4 md:grid-cols-2">
          {/* Operators */}
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Operator
            </div>

            {msg && operators.length === 0 ? (
              <div className="text-sm text-zinc-700">{msg}</div>
            ) : operators.length === 0 ? (
              <div className="text-sm text-zinc-700">No operators available.</div>
            ) : (
              <div className="max-h-[260px] space-y-2 overflow-auto pr-1">
                {operators.map((o) => {
                  const active = selected?.id === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelected(o)}
                      className={[
                        "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                        active
                          ? "border-zinc-900/20 bg-white/80 shadow-sm"
                          : "border-white/50 bg-white/50 hover:bg-white/70",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white text-sm font-semibold">
                        {(o.initials ?? initialsFromName(o.name) ?? "??").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {o.name ?? "Unnamed"}
                        </div>
                        <div className="text-xs text-zinc-500">{o.role ?? ""}</div>
                      </div>

                      {active ? (
                        <div className="ml-auto rounded-full bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-700">
                          Selected
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PIN */}
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              PIN
            </div>

            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(v);
                setMsg(null);
              }}
              placeholder="Enter 4 digits."
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-lg tracking-widest outline-none focus:border-zinc-900/20"
            />

            <div className="mt-2 text-xs text-zinc-500">Enter 4 digits.</div>

            {msg ? <div className="mt-2 text-sm text-red-600">{msg}</div> : null}

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={handleUnlock}
                disabled={!canUnlock}
                className={[
                  "rounded-2xl px-5 py-2 text-sm font-semibold text-white transition",
                  canUnlock ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600/40 cursor-not-allowed",
                ].join(" ")}
              >
                {busy ? "Unlocking..." : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}