"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type OperatorRow = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

function cleanPin(pin: string) {
  return String(pin ?? "").replace(/\D+/g, "").slice(0, 8);
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

  // Prevent auto-submit loops on wrong pin:
  // store last attempted (memberId:pin) so it only auto-submits once per entry.
  const lastAttemptRef = useRef<string>("");

  const cleaned = useMemo(() => cleanPin(pin), [pin]);

  const refreshActiveContext = useCallback(async () => {
    const o = await Promise.resolve(getActiveOrgIdClient()).catch(() => null);
    const l = await Promise.resolve(getActiveLocationIdClient()).catch(() => null);
    const oo = o ? String(o) : null;
    const ll = l ? String(l) : null;
    setOrgId(oo);
    setLocationId(ll);
    return { orgId: oo, locationId: ll };
  }, []);

  const loadOperators = useCallback(
    async (oId: string, lId: string) => {
      const res = await fetch(
        `/api/workstation/operators?orgId=${encodeURIComponent(oId)}&locationId=${encodeURIComponent(
          lId
        )}`,
        { cache: "no-store" }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setOperators([]);
        setSelected(null);
        setMsg("Could not load operators.");
        return;
      }

      const list: OperatorRow[] = Array.isArray(json.operators) ? json.operators : [];
      setOperators(list);

      // Keep current selection if still present, else pick first
      setSelected((prev) => {
        if (prev && list.some((x) => x.id === prev.id)) return prev;
        return list[0] ?? null;
      });
    },
    []
  );

  useEffect(() => {
    (async () => {
      const ctx = await refreshActiveContext();
      if (!ctx.orgId || !ctx.locationId) {
        setOperators([]);
        setSelected(null);
        setMsg("No active organisation/location selected.");
        return;
      }

      setMsg(null);
      await loadOperators(ctx.orgId, ctx.locationId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attemptUnlockWithPin = useCallback(
    async (oId: string, lId: string, teamMemberId: string, rawPin: string) => {
      const p = cleanPin(rawPin);
      const res = await fetch("/api/workstation/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId: oId,
          locationId: lId,
          teamMemberId,
          pin: p,
        }),
      });

      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && !!json?.ok, status: res.status, json };
    },
    []
  );

  const doUnlock = useCallback(async () => {
    setMsg(null);

    const oId = orgId ?? (await Promise.resolve(getActiveOrgIdClient()).catch(() => null));
    const lId =
      locationId ?? (await Promise.resolve(getActiveLocationIdClient()).catch(() => null));

    const oo = oId ? String(oId) : "";
    const ll = lId ? String(lId) : "";

    if (!oo || !ll) {
      setMsg("No active organisation/location selected.");
      return;
    }
    if (!selected?.id) {
      setMsg("Select an operator.");
      return;
    }

    const p = cleaned;
    if (p.length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }

    const attemptKey = `${selected.id}:${p}`;
    lastAttemptRef.current = attemptKey;

    setBusy(true);
    try {
      const r = await attemptUnlockWithPin(oo, ll, selected.id, p);

      if (r.ok) {
        ws.setOperator({
          teamMemberId: selected.id,
          orgId: oo,
          locationId: ll,
          name: selected.name ?? null,
          initials: selected.initials ?? null,
          role: selected.role ?? null,
        });
        return;
      }

      // Handle lockout / wrong pin cleanly
      if (r.status === 423) {
        setMsg("Too many attempts. Try again shortly.");
      } else {
        setMsg("Incorrect PIN.");
      }

      // ✅ Break auto-submit loops:
      setPin("");
    } finally {
      setBusy(false);
    }
  }, [attemptUnlockWithPin, cleaned, locationId, orgId, selected, ws]);

  // ✅ Auto-submit ONCE when 4 digits hit (per operator+pin)
  useEffect(() => {
    if (!selected?.id) return;
    if (busy) return;

    if (cleaned.length === 4) {
      const attemptKey = `${selected.id}:${cleaned}`;
      if (lastAttemptRef.current === attemptKey) return; // already tried this exact pin
      // mark now, before awaiting
      lastAttemptRef.current = attemptKey;
      setMsg("Auto-unlocking...");
      void doUnlock();
    }
  }, [cleaned, selected?.id, busy, doUnlock]);

  // When switching operator, reset pin + message + loop guard
  useEffect(() => {
    lastAttemptRef.current = "";
    setPin("");
    setMsg(null);
  }, [selected?.id]);

  function onClearOperator() {
    ws.clearOperator();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop (glass effect stays) */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-[92vw] max-w-[980px] rounded-3xl border border-white/30 bg-white/70 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold text-slate-900">Workstation locked</div>
            <div className="text-sm text-slate-600">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            onClick={onClearOperator}
            className="rounded-xl border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/80"
          >
            Clear operator
          </button>
        </div>

        {/* Context warning */}
        {!orgId || !locationId ? (
          <div className="mx-6 mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
            No active organisation/location selected.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 px-6 pb-6 md:grid-cols-2">
          {/* Operator list */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Operator
            </div>

            <div className="mt-3 space-y-2">
              {operators.map((op) => {
                const isSel = selected?.id === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setSelected(op)}
                    className={[
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      isSel
                        ? "border-slate-900/10 bg-white/90 ring-2 ring-slate-900/10"
                        : "border-white/40 bg-white/60 hover:bg-white/80",
                    ].join(" ")}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                      {(op.initials ?? "??").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {op.name ?? "Unnamed"}
                      </div>
                      <div className="text-xs text-slate-500">{op.role ?? ""}</div>
                    </div>
                  </button>
                );
              })}

              {operators.length === 0 ? (
                <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-3 text-sm text-slate-600">
                  No operators available.
                </div>
              ) : null}
            </div>
          </div>

          {/* PIN */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">PIN</div>

            <input
              value={cleaned}
              onChange={(e) => {
                setMsg(null);
                setPin(cleanPin(e.target.value));
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-3 w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-4 text-lg tracking-widest outline-none placeholder:text-slate-400 focus:bg-white/80"
              placeholder="••••"
              disabled={!selected || busy}
            />

            <div className="mt-3 min-h-[20px] text-sm">
              {msg ? <span className="text-slate-600">{msg}</span> : null}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={doUnlock}
                disabled={!selected || busy || cleaned.length < 4}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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