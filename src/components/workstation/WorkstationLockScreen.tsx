"use client";

import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type MemberOption = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
  hasPin: boolean;
};

function isNoPinReason(reason: unknown) {
  const r = String(reason ?? "").toLowerCase();
  return r.includes("no_pin") || r.includes("no pin") || r.includes("pin_not_set");
}

export default function WorkstationLockScreen({ onClose }: { onClose: () => void }) {
  const ws = useWorkstation();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [operators, setOperators] = useState<MemberOption[]>([]);
  const [selected, setSelected] = useState<MemberOption | null>(null);
  const [pin, setPin] = useState("");

  const canLoad = useMemo(() => !!orgId && !!locationId, [orgId, locationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadContextAndOperators() {
      setMsg(null);

      const oid = await Promise.resolve(getActiveOrgIdClient());
      const lid = await Promise.resolve(getActiveLocationIdClient());

      if (cancelled) return;

      setOrgId(oid || null);
      setLocationId(lid || null);

      if (!oid || !lid) {
        setOperators([]);
        setSelected(null);
        setMsg("No active organisation/location selected.");
        return;
      }

      try {
        const res = await fetch(
          `/api/workstation/operators?orgId=${encodeURIComponent(oid)}&locationId=${encodeURIComponent(
            lid
          )}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setOperators([]);
          setSelected(null);
          setMsg(json?.detail ?? "Failed to load operators.");
          return;
        }

        const list: MemberOption[] = (json.operators ?? []).map((o: any) => ({
          id: String(o.id),
          name: o.name ?? null,
          initials: o.initials ?? null,
          role: o.role ?? null,
          hasPin: !!o.has_pin,
        }));

        setOperators(list);

        // Keep selection stable if possible
        if (!selected && list.length > 0) setSelected(list[0]);
        if (selected && !list.some((x) => x.id === selected.id)) setSelected(list[0] ?? null);

        if (list.length === 0) setMsg("No staff found for this location.");
      } catch {
        setOperators([]);
        setSelected(null);
        setMsg("Failed to load operators.");
      }
    }

    loadContextAndOperators();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attemptUnlockWithPin(oid: string, lid: string, memberId: string, enteredPin: string) {
    const res = await fetch("/api/workstation/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        orgId: oid,
        locationId: lid,
        teamMemberId: memberId,
        pin: enteredPin,
      }),
    });

    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  }

  async function setPinForMember(oid: string, memberId: string, enteredPin: string) {
    // You said you already have a set pin route. Keep this path EXACTLY as your project uses.
    // If your actual route differs, change ONLY the URL, nothing else.
    const res = await fetch("/api/workstation/set-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        orgId: oid,
        teamMemberId: memberId,
        pin: enteredPin,
      }),
    });

    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  }

  async function onUnlock() {
    setMsg(null);

    const oid = orgId;
    const lid = locationId;

    if (!oid || !lid) {
      setMsg("No active organisation/location selected.");
      return;
    }

    if (!selected) {
      setMsg("Select a user to continue.");
      return;
    }

    const cleaned = String(pin ?? "").trim();
    if (cleaned.replace(/\D+/g, "").length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }

    setBusy(true);
    try {
      // 1) Try unlock normally
      const first = await attemptUnlockWithPin(oid, lid, selected.id, cleaned);

      if (first.ok) {
        // Expecting { operator: { teamMemberId, orgId, locationId, name, initials, role } }
        const op = first.json?.operator;
        if (!op?.teamMemberId || !op?.orgId || !op?.locationId) {
          setMsg("Unlock succeeded but operator payload was missing.");
          return;
        }

        ws.setOperator(op);
        setPin("");
        onClose();
        return;
      }

      // 2) If no PIN exists yet, treat entered PIN as setup PIN, then retry unlock
      const reason = first.json?.reason ?? first.json?.detail ?? "";
      if (isNoPinReason(reason)) {
        const created = await setPinForMember(oid, selected.id, cleaned);
        if (!created.ok) {
          setMsg(created.json?.detail ?? "Failed to set PIN.");
          return;
        }

        // refresh auth state in case RLS depends on it
        await supabase.auth.getSession();

        const second = await attemptUnlockWithPin(oid, lid, selected.id, cleaned);
        if (!second.ok) {
          setMsg(second.json?.detail ?? "PIN set but unlock failed.");
          return;
        }

        const op2 = second.json?.operator;
        if (!op2?.teamMemberId || !op2?.orgId || !op2?.locationId) {
          setMsg("Unlock succeeded but operator payload was missing.");
          return;
        }

        ws.setOperator(op2);
        setPin("");
        onClose();
        return;
      }

      // 3) Normal failure
      setMsg(first.json?.detail ?? "Incorrect PIN.");
    } finally {
      setBusy(false);
    }
  }

  function onClearOperator() {
    ws.clearOperator();
    setMsg(null);
    setPin("");
  }

  // =========================
  // UI: keep it as you have it
  // =========================
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-10">
      <div className="w-[min(980px,92vw)] rounded-3xl border border-white/40 bg-white/90 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Workstation locked</div>
            <div className="text-sm text-muted-foreground">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            type="button"
            onClick={onClearOperator}
            className="rounded-2xl bg-white/70 px-4 py-2 text-sm shadow"
          >
            Clear operator
          </button>
        </div>

        <div className="mt-5">
          {!canLoad ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {msg ?? "No active organisation/location selected."}
            </div>
          ) : operators.length === 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {msg ?? "No staff found for this location."}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {operators.map((m) => {
                  const active = selected?.id === m.id;
                  const initials = (m.initials ?? "?").toUpperCase();

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelected(m);
                        setMsg(null);
                        setPin("");
                      }}
                      className={[
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm",
                        active ? "border-black/20 bg-white" : "border-white/40 bg-white/60",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                        {initials}
                      </div>
                      <div className="min-w-[180px]">
                        <div className="text-sm font-semibold">{m.name ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{m.role ?? ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-muted-foreground">PIN</div>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  inputMode="numeric"
                  className="mt-2 w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm shadow-sm outline-none"
                  placeholder="••••"
                />
                {msg ? <div className="mt-2 text-sm text-rose-600">{msg}</div> : null}
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  disabled={busy || !selected}
                  onClick={onUnlock}
                  className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow disabled:opacity-50"
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
