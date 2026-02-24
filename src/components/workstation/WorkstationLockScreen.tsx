"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

/**
* IMPORTANT:
* - Keep the UI exactly as it is (glass modal look).
* - Auto-submit on 4 digits.
* - Do NOT depend on toast API (your implementation differs).
*/

type OperatorRow = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

export default function WorkstationLockScreen() {
  const ws = useWorkstation();

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selected, setSelected] = useState<OperatorRow | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const cleanedPin = useMemo(
    () => String(pin ?? "").replace(/\D+/g, ""),
    [pin]
  );

  const loadOperators = useCallback(async (oId: string, lId: string) => {
    const res = await fetch(
      `/api/workstation/operators?orgId=${encodeURIComponent(
        oId
      )}&locationId=${encodeURIComponent(lId)}`,
      { cache: "no-store" }
    );

    const json = await res.json().catch(() => ({}));
    const list = Array.isArray(json.operators)
      ? (json.operators as OperatorRow[])
      : [];

    setOperators(list);

    setSelected((prev) => {
      if (prev && list.some((x) => x.id === prev.id)) return prev;
      return list[0] ?? null;
    });
  }, []);

  const refreshActiveContext = useCallback(async () => {
    // support sync or async helper
    const o = await Promise.resolve(getActiveOrgIdClient() as any);
    const l = await Promise.resolve(getActiveLocationIdClient() as any);

    const oStr = typeof o === "string" && o ? o : null;
    const lStr = typeof l === "string" && l ? l : null;

    setOrgId(oStr);
    setLocationId(lStr);

    if (!oStr || !lStr) {
      setOperators([]);
      setSelected(null);
      setMsg("No active organisation/location selected.");
      return;
    }

    setMsg(null);
    await loadOperators(oStr, lStr);
  }, [loadOperators]);

  useEffect(() => {
    refreshActiveContext();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshActiveContext();
    });

    return () => subscription.unsubscribe();
  }, [refreshActiveContext]);

  useEffect(() => {
    setPin("");
    setMsg(null);
  }, [selected?.id]);

  async function attemptUnlockWithPin(
    oId: string,
    lId: string,
    teamMemberId: string,
    enteredPin: string
  ) {
    const res = await fetch("/api/workstation/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: oId,
        locationId: lId,
        teamMemberId,
        pin: enteredPin,
      }),
    });

    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && !!json.ok, json };
  }

  async function unlockWorkstation() {
    if (busy) return;

    if (!orgId || !locationId) {
      setMsg("No active organisation/location selected.");
      return;
    }

    if (!selected) {
      setMsg("No staff found for this location.");
      return;
    }

    if (cleanedPin.length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await attemptUnlockWithPin(
        orgId,
        locationId,
        selected.id,
        cleanedPin
      );

      if (res.ok) {
        ws.setOperator({
          teamMemberId: selected.id,
          name: selected.name ?? null,
          initials: selected.initials ?? null,
          role: selected.role ?? null,
        });
        ws.closeLockModal();
        return;
      }

      const reason = res.json?.reason || res.json?.error || "Incorrect PIN.";
      setMsg(String(reason));
    } catch {
      setMsg("Something went wrong unlocking.");
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit when exactly 4 digits
  useEffect(() => {
    if (!selected) return;
    if (!orgId || !locationId) return;
    if (busy) return;

    if (cleanedPin.length === 4) {
      unlockWorkstation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanedPin, selected?.id, orgId, locationId, busy]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div className="relative w-[92vw] max-w-[920px] rounded-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold text-zinc-900">
              Workstation locked
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              ws.clearOperator();
              ws.closeLockModal();
            }}
            className="rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-black/5 hover:bg-white/80"
          >
            Clear operator
          </button>
        </div>

        <div className="px-6 pb-6">
          {msg ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {msg}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/40 bg-white/50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Operator
              </div>

              {operators.length === 0 ? (
                <div className="text-sm text-zinc-600">
                  No staff found for this location.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {operators.map((op) => {
                    const isActive = selected?.id === op.id;
                    const initials =
                      (op.initials ?? "").trim().toUpperCase() ||
                      (op.name ?? "?")
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() ?? "")
                        .join("") ||
                      "?";

                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelected(op)}
                        className={[
                          "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                          isActive
                            ? "border-black/10 bg-white/80"
                            : "border-white/40 bg-white/40 hover:bg-white/60",
                        ].join(" ")}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {op.name ?? "Unnamed"}
                          </div>
                          <div className="text-xs text-zinc-600">
                            {op.role ?? ""}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                PIN
              </div>

              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={busy || !selected}
                className="w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-white/60"
                placeholder="••••"
              />

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                  {cleanedPin.length >= 4 ? "Auto-unlocking…" : "Enter 4 digits"}
                </div>

                <button
                  type="button"
                  onClick={unlockWorkstation}
                  disabled={busy || !selected}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? "Unlocking…" : "Unlock"}
                </button>
              </div>

              {msg && msg.toLowerCase().includes("incorrect") ? (
                <div className="mt-3 text-sm text-red-600">{msg}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}