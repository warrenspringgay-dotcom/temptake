"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type OperatorRow = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
  has_pin: boolean;
};

function isNoPinReason(reason: unknown) {
  return reason === "no_pin" || reason === "no_pin_set" || reason === "missing_pin";
}

async function fetchOperators(orgId: string, locationId: string) {
  const res = await fetch(
    `/api/workstation/operators?orgId=${encodeURIComponent(orgId)}&locationId=${encodeURIComponent(
      locationId
    )}`,
    { cache: "no-store" }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Failed to load operators");
  return (Array.isArray(json?.operators) ? json.operators : []) as OperatorRow[];
}

async function attemptUnlockWithPin(orgId: string, teamMemberId: string, pin: string) {
  const res = await fetch("/api/workstation/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orgId, teamMemberId, pin }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

async function setPin(orgId: string, teamMemberId: string, pin: string) {
  // You said you already have set pin route. Keeping it generic:
  const res = await fetch("/api/workstation/set-pin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orgId, teamMemberId, pin }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export default function WorkstationLockScreen() {
  const ws = useWorkstation();

  const [open, setOpen] = useState(false);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => operators.find((o) => o.id === selectedId) || null,
    [operators, selectedId]
  );

  const [pin, setPinInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refreshActiveContext = useCallback(async () => {
    const o = await getActiveOrgIdClient();
    const l = await getActiveLocationIdClient();
    setOrgId(o ?? null);
    setLocationId(l ?? null);
    return { orgId: o ?? null, locationId: l ?? null };
  }, []);

  const loadOperators = useCallback(
    async (oId: string, lId: string) => {
      const list = await fetchOperators(oId, lId);
      setOperators(list);

      // Keep selection stable if possible
      if (list.length && !list.some((x) => x.id === selectedId)) {
        setSelectedId(list[0].id);
      }
      if (!list.length) {
        setSelectedId(null);
      }
    },
    [selectedId]
  );

  // Open modal when the provider/FAB asks
  useEffect(() => {
    const onOpen = async () => {
      setOpen(true);
      setMsg(null);
      setPinInput("");

      const { orgId: o, locationId: l } = await refreshActiveContext();
      if (o && l) {
        try {
          await loadOperators(o, l);
        } catch (e: any) {
          setOperators([]);
          setSelectedId(null);
          setMsg(e?.message || "Failed to load staff");
        }
      } else {
        setOperators([]);
        setSelectedId(null);
      }
    };

    window.addEventListener("tt-open-workstation-lock", onOpen);
    return () => window.removeEventListener("tt-open-workstation-lock", onOpen);
  }, [loadOperators, refreshActiveContext]);

  // Auto-open if currently locked (so you don't get the “locked toast but no modal” nonsense)
  useEffect(() => {
    if (!ws.locked) return;
    window.dispatchEvent(new CustomEvent("tt-open-workstation-lock"));
  }, [ws.locked]);

  // Reset messages when selection changes
  useEffect(() => {
    setMsg(null);
    setPinInput("");
  }, [selectedId]);

  const onClearOperator = useCallback(() => {
    ws.clearOperator();
    setMsg(null);
    setPinInput("");
  }, [ws]);

  const unlock = useCallback(async () => {
    const cleaned = String(pin ?? "").trim();
    if (cleaned.replace(/\D+/g, "").length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }
    if (!orgId || !locationId) {
      setMsg("No active organisation/location selected.");
      return;
    }
    if (!selected) {
      setMsg("Select a user first.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      // 1) Try unlock
      const first = await attemptUnlockWithPin(orgId, selected.id, cleaned);

      if (first.ok) {
        ws.setOperator({
          teamMemberId: selected.id,
          orgId,
          locationId,
          name: selected.name ?? null,
          initials: selected.initials ?? null,
          role: selected.role ?? null,
        });
        setOpen(false);
        return;
      }

      // 2) If no PIN exists yet: set it, then unlock again
      const reason = first.json?.reason ?? first.json?.error ?? null;
      if (isNoPinReason(reason)) {
        const sp = await setPin(orgId, selected.id, cleaned);
        if (!sp.ok) {
          setMsg(sp.json?.error || "Could not set PIN.");
          return;
        }

        const second = await attemptUnlockWithPin(orgId, selected.id, cleaned);
        if (second.ok) {
          ws.setOperator({
            teamMemberId: selected.id,
            orgId,
            locationId,
            name: selected.name ?? null,
            initials: selected.initials ?? null,
            role: selected.role ?? null,
          });
          setOpen(false);
          return;
        }

        setMsg(second.json?.error || "PIN set, but unlock failed.");
        return;
      }

      // 3) Normal failure
      setMsg(first.json?.error || "Incorrect PIN.");
    } finally {
      setBusy(false);
    }
  }, [pin, orgId, locationId, selected, ws]);

  if (!open) return null;

  // ---------------- UI BELOW: unchanged layout/structure ----------------
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-5xl rounded-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between p-5 sm:p-6">
          <div>
            <div className="text-lg font-semibold text-slate-900">Workstation locked</div>
            <div className="text-sm text-slate-600">Select a user and enter a PIN to continue.</div>
          </div>

          <button
            onClick={onClearOperator}
            className="rounded-2xl bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 shadow hover:bg-white"
          >
            Clear operator
          </button>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          {!orgId || !locationId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No active organisation/location selected.
            </div>
          ) : operators.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No staff found for this location.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {operators.map((op) => {
                  const isSelected = op.id === selectedId;
                  const initials =
                    (op.initials || "")
                      .trim()
                      .slice(0, 2)
                      .toUpperCase() || "??";

                  return (
                    <button
                      key={op.id}
                      onClick={() => setSelectedId(op.id)}
                      className={[
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                        isSelected
                          ? "border-slate-900/20 bg-white/80 shadow"
                          : "border-white/40 bg-white/40 hover:bg-white/60",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {op.name || "Unnamed"}
                        </div>
                        <div className="text-xs text-slate-600">{op.role || "staff"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <div className="mb-1 text-xs font-medium text-slate-700">PIN</div>
                  <input
                    value={pin}
                    onChange={(e) => setPinInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") unlock();
                    }}
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm outline-none focus:border-slate-900/20"
                    placeholder="••••"
                    disabled={busy}
                  />
                  {msg ? <div className="mt-2 text-sm text-rose-600">{msg}</div> : null}
                </div>

                <button
                  onClick={unlock}
                  disabled={busy || !selectedId}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-50"
                >
                  Unlock
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
