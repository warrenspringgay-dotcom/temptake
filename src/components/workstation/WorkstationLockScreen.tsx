"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
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

async function attemptUnlockWithPin(orgId: string, locationId: string, teamMemberId: string, pin: string) {
  return fetch("/api/workstation/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orgId, locationId, teamMemberId, pin }),
  });
}

export default function WorkstationLockScreen({ onClose }: { onClose: () => void }) {
  const ws = useWorkstation();

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selected, setSelected] = useState<OperatorRow | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const lastAttemptRef = useRef<string>("");

  const hasContext = !!ws.orgId && !!ws.locationId;

  const selectedId = selected?.id ?? null;

  const autoUnlockReady = useMemo(() => {
    return !!hasContext && !!selectedId && pin.length === 4 && !busy;
  }, [hasContext, selectedId, pin, busy]);

  async function loadOperators(o: string, l: string) {
    setMsg(null);

    const { data, error } = await supabase
      .from("team_members")
      .select("id,name,initials,role")
      .eq("org_id", o)
      .eq("location_id", l)
      .eq("pin_enabled", true) // IMPORTANT: pin_enabled, not login_enabled
      .order("name", { ascending: true });

    if (error) {
      setOperators([]);
      setSelected(null);
      setMsg(error.message);
      return;
    }

    const list = (data ?? []) as OperatorRow[];
    setOperators(list);

    // Auto-select last operator (from provider persisted operator).
    const lastId = ws.operator?.teamMemberId ?? null;
    const found = lastId ? list.find((x) => x.id === lastId) : null;
    setSelected(found ?? list[0] ?? null);
  }

  useEffect(() => {
    // Prefer provider context first.
    if (ws.orgId && ws.locationId) {
      loadOperators(ws.orgId, ws.locationId);
      return;
    }

    // Fallback to helpers (sync or async).
    (async () => {
      const o = await Promise.resolve(getActiveOrgIdClient() as any);
      const l = await Promise.resolve(getActiveLocationIdClient() as any);
      const orgId = typeof o === "string" ? o : null;
      const locationId = typeof l === "string" ? l : null;

      if (orgId && locationId) loadOperators(orgId, locationId);
      else setMsg("No active organisation/location selected.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.orgId, ws.locationId]);

  async function handleUnlock() {
    if (!ws.orgId || !ws.locationId) {
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

    const attemptKey = `${ws.orgId}:${ws.locationId}:${selected.id}:${pin}`;
    if (lastAttemptRef.current === attemptKey) return;
    lastAttemptRef.current = attemptKey;

    setBusy(true);
    setMsg(null);

    try {
      const res = await attemptUnlockWithPin(ws.orgId, ws.locationId, selected.id, pin);
      const json = await res.json().catch(() => ({} as any));

      if (res.ok && json?.ok) {
        ws.setOperator({
          teamMemberId: selected.id,
          orgId: ws.orgId,
          locationId: ws.locationId,
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
    } catch (e: any) {
      setMsg(e?.message ?? "Unlock failed.");
    } finally {
      setBusy(false);
    }
  }

  // Auto-unlock when 4 digits entered.
  useEffect(() => {
    if (!autoUnlockReady) return;
    handleUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUnlockReady]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 backdrop-blur-sm">
      <div className="w-[min(920px,92vw)] rounded-3xl border border-white/40 bg-white/70 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <div className="text-lg font-semibold">Workstation locked</div>
            <div className="text-sm text-slate-600">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            className="text-sm text-slate-700 hover:text-slate-900"
            onClick={() => {
              ws.clearOperator();
              ws.lockNow();
              setPin("");
              setMsg(null);
            }}
            type="button"
          >
            Clear operator
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-4 sm:grid-cols-2">
          {/* Operator list */}
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4 backdrop-blur">
            <div className="mb-3 text-xs font-semibold tracking-wide text-slate-600">
              OPERATOR
            </div>

            {(!hasContext && (
              <div className="text-sm text-slate-600">No active organisation/location selected.</div>
            )) ||
              null}

            {hasContext && operators.length === 0 ? (
              <div className="text-sm text-slate-600">No operators available.</div>
            ) : null}

            <div className="space-y-2">
              {operators.map((op) => {
                const active = selected?.id === op.id;
                const initials =
                  (op.initials ?? "").trim().toUpperCase() ||
                  initialsFromName(op.name) ||
                  "?";

                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setSelected(op);
                      setMsg(null);
                    }}
                    className={[
                      "w-full rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-slate-900/20 bg-white shadow-sm"
                        : "border-white/60 bg-white/40 hover:bg-white/60",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white text-sm font-semibold">
                        {initials}
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
              })}
            </div>
          </div>

          {/* PIN entry */}
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4 backdrop-blur">
            <div className="mb-3 text-xs font-semibold tracking-wide text-slate-600">
              PIN
            </div>

            <input
              value={pin}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              maxLength={4}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(next);
                setMsg(null);
              }}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-lg tracking-[0.35em] outline-none focus:border-slate-900/20"
              placeholder="••••"
            />

            <div className="mt-2 text-xs text-slate-600">Enter 4 digits.</div>

            {msg ? <div className="mt-2 text-sm text-red-600">{msg}</div> : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl px-4 py-2 text-sm text-slate-700 hover:text-slate-900"
              >
                Close
              </button>

              <button
                type="button"
                disabled={!hasContext || !selected || pin.length !== 4 || busy}
                onClick={handleUnlock}
                className={[
                  "rounded-2xl px-5 py-2 text-sm font-semibold text-white transition",
                  !hasContext || !selected || pin.length !== 4 || busy
                    ? "bg-slate-400"
                    : "bg-emerald-600 hover:bg-emerald-700",
                ].join(" ")}
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