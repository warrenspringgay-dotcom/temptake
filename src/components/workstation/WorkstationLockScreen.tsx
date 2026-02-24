"use client";

import React, { useEffect, useRef, useState } from "react";
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

export default function WorkstationLockScreen() {
  const ws = useWorkstation();

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selected, setSelected] = useState<OperatorRow | null>(null);

  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const lastAttemptRef = useRef<string>("");
  const loadedRef = useRef(false);

  async function loadOperators(oId: string, lId: string) {
    const res = await fetch(
      `/api/workstation/operators?orgId=${encodeURIComponent(oId)}&locationId=${encodeURIComponent(
        lId
      )}`,
      { cache: "no-store" }
    );

    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.ok) {
      setOperators([]);
      return;
    }

    const list: OperatorRow[] = Array.isArray(json.operators) ? json.operators : [];
    setOperators(list);
  }

  // ✅ Resolve active org/location (async-safe)
  useEffect(() => {
    let alive = true;

    (async () => {
      const o = await resolveMaybePromise(getActiveOrgIdClient());
      const l = await resolveMaybePromise(getActiveLocationIdClient());

      if (!alive) return;

      setOrgId(o || null);
      setLocationId(l || null);

      if (!o || !l) {
        setOperators([]);
        setSelected(null);
        setMsg("No active organisation/location selected.");
        return;
      }

      setMsg(null);
      await loadOperators(o, l);
      loadedRef.current = true;
    })();

    return () => {
      alive = false;
    };
  }, []);

  // If org/location can change while mounted, refresh operators when they do
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!orgId || !locationId) return;
      if (!loadedRef.current) return;

      if (!alive) return;
      setMsg(null);
      await loadOperators(orgId, locationId);
    })();

    return () => {
      alive = false;
    };
  }, [orgId, locationId]);

  // ✅ Auto-select last operator (from workstation context if available)
  useEffect(() => {
    if (!operators.length) return;

    const lastId = ws.operator?.teamMemberId || null;
    if (!lastId) return;

    const match = operators.find((o) => o.id === lastId);
    if (match) setSelected(match);
  }, [operators, ws.operator?.teamMemberId]);

  function clearAll() {
    setPin("");
    setMsg(null);
    setBusy(false);
    lastAttemptRef.current = "";
    ws.clearOperator();
  }

  async function attemptUnlockWithPin(
    oId: string,
    lId: string,
    teamMemberId: string,
    enteredPin: string
  ) {
    return fetch("/api/workstation/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: oId,
        locationId: lId,
        teamMemberId,
        pin: enteredPin,
      }),
    });
  }

  async function handleUnlock() {
    const oId = orgId;
    const lId = locationId;

    if (!oId || !lId) {
      setMsg("No active organisation/location selected.");
      return;
    }
    if (!selected) {
      setMsg("Select an operator.");
      return;
    }

    const cleaned = String(pin ?? "").trim();
    const digitsOnly = cleaned.replace(/\D+/g, "");

    if (digitsOnly.length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }

    const attemptKey = `${selected.id}:${digitsOnly}`;
    if (busy) return;
    if (lastAttemptRef.current === attemptKey) return;

    lastAttemptRef.current = attemptKey;
    setBusy(true);
    setMsg(null);

    try {
      const res = await attemptUnlockWithPin(oId, lId, selected.id, digitsOnly);
      const json = await res.json().catch(() => ({} as any));

      if (res.ok && json?.ok) {
        ws.setOperator({
          teamMemberId: selected.id,
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
        return;
      }

      const reason =
        json?.reason ||
        json?.message ||
        (res.status === 401 ? "Incorrect PIN." : null);

      setMsg(reason || "Incorrect PIN.");
      setPin("");
      lastAttemptRef.current = "";
    } catch {
      setMsg("Unlock failed. Try again.");
      setPin("");
      lastAttemptRef.current = "";
    } finally {
      setBusy(false);
    }
  }

  // ✅ Auto-unlock when exactly 4 digits entered
  useEffect(() => {
    const digits = String(pin ?? "").replace(/\D+/g, "");
    if (!selected) return;
    if (busy) return;
    if (digits.length !== 4) return;

    handleUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, selected, busy]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-[92%] max-w-[920px] rounded-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Workstation locked
            </div>
            <div className="text-sm text-slate-600">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-white/60"
            onClick={clearAll}
            type="button"
          >
            Clear operator
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2">
          {/* Operators list */}
          <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Operator
            </div>

            {!operators.length ? (
              <div className="text-sm text-slate-600">
                {msg ?? "No operators available."}
              </div>
            ) : (
              <div className="space-y-2">
                {operators.map((op) => {
                  const isSelected = selected?.id === op.id;
                  const initials =
                    (op.initials ?? "").trim().toUpperCase() ||
                    initialsFromName(op.name) ||
                    "??";

                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        setSelected(op);
                        setMsg(null);
                        setPin("");
                        lastAttemptRef.current = "";
                      }}
                      className={[
                        "w-full rounded-2xl border p-3 text-left transition",
                        isSelected
                          ? "border-slate-900/20 bg-white shadow"
                          : "border-white/40 bg-white/40 hover:bg-white/60",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {op.name ?? "Unnamed"}
                          </div>
                          <div className="text-xs text-slate-600">
                            {op.role ?? "staff"}
                            {isSelected ? " • selected" : ""}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PIN */}
          <div className="rounded-2xl border border-white/40 bg-white/60 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              PIN
            </div>

            <input
              value={pin}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, "").slice(0, 8);
                setPin(next);
                setMsg(null);
              }}
              inputMode="numeric"
              placeholder="••••"
              className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-lg tracking-widest outline-none focus:border-slate-900/20"
              disabled={!selected || busy}
            />

            <div className="mt-2 text-xs text-slate-600">
              {busy ? "Auto-unlocking..." : "Enter 4 digits."}
            </div>

            {msg ? <div className="mt-2 text-sm text-red-600">{msg}</div> : null}

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                onClick={handleUnlock}
                disabled={!selected || busy || String(pin).replace(/\D+/g, "").length < 4}
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