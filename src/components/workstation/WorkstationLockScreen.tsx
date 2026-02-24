"use client";

import React, { useEffect, useMemo, useState } from "react";
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

export default function WorkstationLockScreen({ onClose }: { onClose: () => void }) {
  const ws = useWorkstation();

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [pin, setPin] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const orgId = getActiveOrgIdClient();
  const locationId = getActiveLocationIdClient();

  const selected = useMemo(
    () => operators.find((o) => o.id === selectedId) ?? null,
    [operators, selectedId]
  );

  async function loadOperators(oId: string, lId: string) {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/workstation/operators?orgId=${encodeURIComponent(oId)}&locationId=${encodeURIComponent(lId)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setOperators([]);
        setSelectedId(null);
        setMsg("Unable to load staff list.");
        return;
      }

      const list: OperatorRow[] = Array.isArray(json.operators) ? json.operators : [];
      setOperators(list);

      // Auto-select first user if none selected
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      if (list.length === 0) setMsg("No staff found for this location.");
    } catch {
      setOperators([]);
      setSelectedId(null);
      setMsg("Unable to load staff list.");
    }
  }

  // initial load + refresh when modal opens
  useEffect(() => {
    const oId = typeof orgId === "string" ? orgId : null;
    const lId = typeof locationId === "string" ? locationId : null;

    if (!oId || !lId) {
      setOperators([]);
      setSelectedId(null);
      setMsg("No active organisation/location selected.");
      return;
    }

    loadOperators(oId, lId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear pin + message when switching user
  useEffect(() => {
    setPin("");
    setMsg(null);
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

    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && !!json?.ok, json };
  }

  async function handleUnlock() {
    const oId = typeof orgId === "string" ? orgId : null;
    const lId = typeof locationId === "string" ? locationId : null;

    if (!oId || !lId) {
      setMsg("No active organisation/location selected.");
      return;
    }

    if (!selected) {
      setMsg("Select a user.");
      return;
    }

    const cleaned = String(pin ?? "").trim();
    const digits = cleaned.replace(/\D+/g, "");
    if (digits.length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      // Ensure auth still valid
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        setMsg("Session expired. Please refresh.");
        return;
      }

      const attempt = await attemptUnlockWithPin(oId, lId, selected.id, digits);

      if (attempt.ok) {
        // ✅ store operator INCLUDING org/location so the rest of the app can trust it
        ws.setOperator({
          teamMemberId: selected.id,
          orgId: oId,
          locationId: lId,
          name: selected.name ?? null,
          initials: selected.initials ?? null,
          role: selected.role ?? null,
        });
        onClose();
        return;
      }

      setMsg(attempt.json?.reason === "incorrect_pin" ? "Incorrect PIN." : "Unable to unlock.");
    } finally {
      setBusy(false);
    }
  }

  // ✅ Auto-submit when 4 digits entered (and a user is selected)
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
      {/* Your UI stays the same (glass background etc). */}
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
            {operators.map((o) => (
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
                  {(o.initials ?? "??").toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-medium">{o.name ?? "Unnamed"}</div>
                  <div className="text-xs text-black/60">{o.role ?? ""}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-black/70">PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              className="mt-2 w-full max-w-[520px] rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-base outline-none focus:bg-white/80"
              placeholder="••••"
              disabled={busy}
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
