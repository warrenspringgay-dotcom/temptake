"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type StaffRow = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

type Props = {
  onClose?: () => void; // ✅ optional now
};

function initialsFromName(name?: string | null) {
  const s = String(name ?? "").trim();
  if (!s) return "";
  const parts = s.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ? p[0].toUpperCase() : ""))
    .join("");
}

export default function WorkstationLockScreen({ onClose }: Props) {
  const ws = useWorkstation();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => staff.find((s) => s.id === selectedId) ?? null,
    [staff, selectedId]
  );

  async function refreshContext() {
    // These may be async in your project, so always await.
    const o = await getActiveOrgIdClient();
    const l = await getActiveLocationIdClient();
    setOrgId(o ?? null);
    setLocationId(l ?? null);
    return { orgId: o ?? null, locationId: l ?? null };
  }

  async function loadOperators(oId: string, lId: string) {
    const res = await fetch(
      `/api/workstation/operators?orgId=${encodeURIComponent(oId)}&locationId=${encodeURIComponent(lId)}`,
      { cache: "no-store" }
    );
    const json = await res.json().catch(() => ({}));

    const ops: StaffRow[] = Array.isArray(json.operators) ? json.operators : [];
    setStaff(ops);

    // keep selection stable if possible
    if (ops.length && !ops.some((x) => x.id === selectedId)) {
      setSelectedId(ops[0].id);
    }
  }

  // Mount: load context, then operators.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ctx = await refreshContext();
      if (cancelled) return;

      if (ctx.orgId && ctx.locationId) {
        await loadOperators(ctx.orgId, ctx.locationId);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If context appears later (new signup flow), try again.
  useEffect(() => {
    if (orgId && locationId) {
      loadOperators(orgId, locationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId]);

  async function attemptUnlockWithPin(oId: string, lId: string, teamMemberId: string, pinValue: string) {
    const res = await fetch(`/api/workstation/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: oId,
        locationId: lId,
        teamMemberId,
        pin: pinValue,
      }),
    });

    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  }

  function isNoPinReason(reason: any) {
    return reason === "no_pin" || reason === "pin_not_set" || reason === "NO_PIN";
  }

  async function handleUnlock() {
    setMsg(null);

    const cleaned = String(pin ?? "").trim();
    if (cleaned.replace(/\D+/g, "").length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }

    setBusy(true);
    try {
      const ctx = { orgId, locationId };
      // If missing, re-check once (new signup timing)
      if (!ctx.orgId || !ctx.locationId) {
        const fresh = await refreshContext();
        ctx.orgId = fresh.orgId;
        ctx.locationId = fresh.locationId;
      }

      if (!ctx.orgId || !ctx.locationId) {
        setMsg("No active organisation/location selected.");
        return;
      }

      if (!selected) {
        setMsg("Select a user.");
        return;
      }

      // 1) Try unlock normally
      const first = await attemptUnlockWithPin(ctx.orgId, ctx.locationId, selected.id, cleaned);

      if (first.ok) {
        const op = first.json?.operator ?? null;

        // Be defensive: build Operator from what we already have
        ws.setOperator({
          teamMemberId: selected.id,
          orgId: ctx.orgId,
          locationId: ctx.locationId,
          name: selected.name ?? null,
          initials: selected.initials ?? initialsFromName(selected.name),
          role: selected.role ?? null,
        });

        onClose?.();
        return;
      }

      // 2) If no PIN exists yet, treat entered PIN as "set it now"
      const reason = first.json?.reason ?? first.json?.error ?? null;
      if (isNoPinReason(reason)) {
        const res2 = await fetch(`/api/workstation/set-pin`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: ctx.orgId,
            teamMemberId: selected.id,
            pin: cleaned,
          }),
        });
        const j2 = await res2.json().catch(() => ({}));

        if (!res2.ok) {
          setMsg(j2?.message ?? "Could not set PIN.");
          return;
        }

        // After setting PIN, unlock again
        const second = await attemptUnlockWithPin(ctx.orgId, ctx.locationId, selected.id, cleaned);
        if (second.ok) {
          ws.setOperator({
            teamMemberId: selected.id,
            orgId: ctx.orgId,
            locationId: ctx.locationId,
            name: selected.name ?? null,
            initials: selected.initials ?? initialsFromName(selected.name),
            role: selected.role ?? null,
          });

          onClose?.();
          return;
        }

        setMsg("Incorrect PIN.");
        return;
      }

      setMsg(first.json?.message ?? "Incorrect PIN.");
    } finally {
      setBusy(false);
    }
  }

  // ========== UI (UNCHANGED STYLING INTENT) ==========
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[680px] max-w-[92vw] rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md">
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Workstation locked
            </div>
            <div className="text-sm text-slate-700">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            type="button"
            onClick={() => ws.clearOperator()}
            className="rounded-xl bg-white/60 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-white/80"
          >
            Clear operator
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {!orgId || !locationId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No active organisation/location selected.
            </div>
          ) : staff.length === 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              No staff found for this location.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {staff.map((s) => {
                  const initials = (s.initials ?? initialsFromName(s.name)).slice(0, 2);
                  const selected = s.id === selectedId;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(s.id);
                        setMsg(null);
                        setPin("");
                      }}
                      className={[
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                        selected
                          ? "border-slate-300 bg-white/70"
                          : "border-white/30 bg-white/40 hover:bg-white/60",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {initials || "??"}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {s.name ?? "Unnamed"}
                        </div>
                        <div className="text-xs text-slate-600">
                          {(s.role ?? "staff").toLowerCase()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="text-xs font-medium text-slate-700">PIN</div>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  placeholder="••••"
                  autoFocus
                />
                {msg ? (
                  <div className="mt-2 text-sm text-rose-700">{msg}</div>
                ) : null}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={busy || !selectedId}
                  onClick={handleUnlock}
                  className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
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
