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
  pin_enabled: boolean;
  has_pin: boolean;
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

export default function WorkstationLockScreen({ onClose }: { onClose: () => void }) {
  const ws = useWorkstation();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [pin, setPin] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Prevent auto-submit loops when PIN stays at 4 digits
  const lastAttemptRef = useRef<string>("");

  const selected = useMemo(
    () => operators.find((o) => o.id === selectedId) ?? null,
    [operators, selectedId]
  );

  // Load org/location once (these are async in your setup)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const o = await getActiveOrgIdClient();
        const l = await getActiveLocationIdClient();
        if (!alive) return;
        setOrgId(o ?? null);
        setLocationId(l ?? null);
      } catch {
        if (!alive) return;
        setOrgId(null);
        setLocationId(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function loadOperators(oId: string, lId: string) {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/workstation/operators?orgId=${encodeURIComponent(oId)}&locationId=${encodeURIComponent(lId)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || !json?.ok) {
        setOperators([]);
        setSelectedId(null);
        setMsg("Unable to load staff list.");
        return;
      }

      const list: OperatorRow[] = Array.isArray(json.operators) ? json.operators : [];
      setOperators(list);

      // Auto-select previous operator if present, otherwise first
      const prevId = ws.operator?.teamMemberId ?? null;
      const stillExists = prevId ? list.some((x) => x.id === prevId) : false;

      if (stillExists) {
        setSelectedId(prevId);
      } else if (list.length > 0) {
        setSelectedId((curr) => curr ?? list[0].id);
      } else {
        setSelectedId(null);
        setMsg("No operators available.");
      }
    } catch {
      setOperators([]);
      setSelectedId(null);
      setMsg("Unable to load staff list.");
    }
  }

  // Refresh list whenever org/location becomes available
  useEffect(() => {
    if (!orgId || !locationId) {
      setOperators([]);
      setSelectedId(null);
      setMsg("No active organisation/location selected.");
      return;
    }
    loadOperators(orgId, locationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId]);

  // Clear pin + message when switching user
  useEffect(() => {
    setPin("");
    setMsg(null);
    lastAttemptRef.current = "";
  }, [selectedId]);

  async function attemptUnlockWithPin(oId: string, lId: string, teamMemberId: string, rawPin: string) {
    const res = await fetch("/api/workstation/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: oId,
        locationId: lId,
        teamMemberId,
        pin: rawPin,
      }),
    });

    const json = await res.json().catch(() => ({} as any));
    return { res, json };
  }

  async function handleUnlock() {
    if (!orgId || !locationId) {
      setMsg("No active organisation/location selected.");
      return;
    }
    if (!selected) {
      setMsg("Select a user.");
      return;
    }

    const digits = String(pin ?? "").replace(/\D+/g, "");
    if (digits.length < 4) {
      setMsg("Enter 4 digits.");
      return;
    }

    const attemptKey = `${orgId}|${locationId}|${selected.id}|${digits}`;
    if (lastAttemptRef.current === attemptKey) return; // stop loops
    lastAttemptRef.current = attemptKey;

    setBusy(true);
    setMsg(null);

    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        setMsg("Session expired. Please refresh.");
        return;
      }

      const { res, json } = await attemptUnlockWithPin(orgId, locationId, selected.id, digits);

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

        setPin("");
        setMsg(null);
        onClose();
        return;
      }

      // Show proper failure, don’t loop forever
      const reason =
        json?.reason ||
        json?.message ||
        (res.status === 401 ? "Incorrect PIN." : res.status === 423 ? "Workstation locked." : null);

      setMsg(reason || "Unable to unlock.");
      setPin("");
      lastAttemptRef.current = ""; // allow retry
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit on exactly 4 digits
  useEffect(() => {
    if (!selected) return;
    const digits = String(pin ?? "").replace(/\D+/g, "");
    if (digits.length === 4 && !busy) {
      handleUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div className="relative w-[92vw] max-w-[820px] rounded-3xl border border-white/40 bg-white/70 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-5">
          <div>
            <div className="text-lg font-semibold">Workstation locked</div>
            <div className="text-sm text-black/60">Select a user and enter a PIN to continue.</div>
          </div>

          <button
            type="button"
            className="rounded-xl bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white/80"
            onClick={() => {
              ws.clearOperator();
              ws.unlockWorkstation();
              onClose();
            }}
          >
            Clear operator
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {msg ? (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {msg}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {operators.length === 0 ? (
              <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm text-black/60">
                No operators available.
              </div>
            ) : (
              operators.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className={[
                    "flex min-w-[240px] items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                    selectedId === o.id
                      ? "border-black/10 bg-white/80 shadow-sm"
                      : "border-white/40 bg-white/40 hover:bg-white/60",
                  ].join(" ")}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-black text-white text-xs font-semibold">
                    {(o.initials ?? initialsFromName(o.name) ?? "??").toUpperCase()}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-medium">{o.name ?? "Unnamed"}</div>
                    <div className="text-xs text-black/60">{o.role ?? ""}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-black/70">PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              className="mt-2 w-full max-w-[520px] rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-base outline-none focus:bg-white/80"
              placeholder="••••"
              disabled={busy || !selected}
              autoFocus
            />
          </div>

          <div className="mt-5 flex items-center justify-end">
            <button
              type="button"
              onClick={handleUnlock}
              disabled={busy || !selected}
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? "Unlocking..." : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}