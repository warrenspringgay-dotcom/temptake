"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

import { useWorkstation } from "./WorkstationLockProvider";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type OperatorRow = {
  id: string;
  name: string | null;
  initials: string | null;
  role: string | null;
};

type Props = {
  onClose?: () => void;
};

const LS_OPERATOR = "tt_workstation_operator";

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

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

export default function WorkstationLockScreen({ onClose }: Props) {
  const ws = useWorkstation();

  const [mounted, setMounted] = useState(false);

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selected, setSelected] = useState<OperatorRow | null>(null);

  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // prevent infinite auto-submit loops on failed attempts
  const lastAttemptRef = useRef<string>("");

  useEffect(() => setMounted(true), []);

  // load operators for current org/location
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setMsg(null);

      const orgId = getActiveOrgIdClient?.() as unknown as string | null | undefined;
      const locationId =
        getActiveLocationIdClient?.() as unknown as string | null | undefined;

      if (!orgId || !locationId) {
        setOperators([]);
        setSelected(null);
        setMsg("No active organisation/location selected.");
        return;
      }

      const res = await fetch(
        `/api/workstation/operators?orgId=${encodeURIComponent(
          orgId
        )}&locationId=${encodeURIComponent(locationId)}`,
        { cache: "no-store" }
      );

      const json = await res.json().catch(() => ({}));
      if (cancelled) return;

      const list: OperatorRow[] = Array.isArray(json?.operators)
        ? json.operators
        : [];

      setOperators(list);

      // auto-select previous operator if present
      const stored = safeParse<{ teamMemberId?: string }>(
        localStorage.getItem(LS_OPERATOR)
      );
      const previousId = stored?.teamMemberId ?? null;
      const found =
        (previousId && list.find((o) => o.id === previousId)) || null;

      setSelected(found ?? list[0] ?? null);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // when operator changes, clear pin + message
  useEffect(() => {
    setPin("");
    setMsg(null);
    lastAttemptRef.current = "";
  }, [selected?.id]);

  async function attemptUnlock() {
    const cleaned = String(pin ?? "").trim().replace(/\D+/g, "");

    if (!selected) {
      setMsg("Select an operator.");
      return;
    }
    if (cleaned.length < 4) {
      setMsg("Enter a 4+ digit PIN.");
      return;
    }

    const orgId = getActiveOrgIdClient?.() as unknown as string | null | undefined;
    const locationId =
      getActiveLocationIdClient?.() as unknown as string | null | undefined;

    if (!orgId || !locationId) {
      setMsg("No active organisation/location selected.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/workstation/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          locationId,
          teamMemberId: selected.id,
          pin: cleaned,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // stop auto-resubmitting the same 4 digits in a loop
        lastAttemptRef.current = `${selected.id}:${cleaned}`;

        // show a real error instead of hammering /unlock forever
        setMsg(json?.reason || "Incorrect PIN.");
        setPin(""); // let user re-enter
        return;
      }

      // success: set operator (this is what makes FAB + app agree)
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

      // remove force lock if any
      ws.unlockNow();

      // close
      onClose?.();
      ws.closeLockModal();
    } finally {
      setBusy(false);
    }
  }

  // auto-submit on 4 digits (but only once per pin/operator combo)
  useEffect(() => {
    const cleaned = String(pin ?? "").trim().replace(/\D+/g, "");
    if (!selected) return;
    if (cleaned.length !== 4) return;

    const key = `${selected.id}:${cleaned}`;
    if (lastAttemptRef.current === key) return;

    lastAttemptRef.current = key;
    attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, selected?.id]);

  const selectedId = selected?.id ?? null;

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.985 }}
        transition={{ duration: 0.18 }}
        className="relative w-[92vw] max-w-[720px] rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <div className="text-lg font-semibold">Workstation locked</div>
            <div className="text-sm text-muted-foreground">
              Select a user and enter a PIN to continue.
            </div>
          </div>

          <button
            type="button"
            className="rounded-2xl border border-white/50 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white"
            onClick={() => {
              ws.clearOperator();
              ws.lockNow();
              setMsg(null);
              setPin("");
            }}
          >
            Clear operator
          </button>
        </div>

        {msg ? (
          <div className="px-5 pb-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {msg}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
          {/* Operator list */}
          <div className="rounded-2xl border border-white/40 bg-white/60 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Operator
            </div>

            <div className="space-y-2">
              {operators.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No operators available.
                </div>
              ) : (
                operators.map((op) => {
                  const isSelected = op.id === selectedId;
                  const badge =
                    (op.initials ?? "").trim().toUpperCase() ||
                    initialsFromName(op.name) ||
                    "??";

                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelected(op)}
                      className={[
                        "w-full rounded-2xl border px-3 py-3 text-left shadow-sm transition",
                        isSelected
                          ? "border-black/10 bg-white"
                          : "border-white/50 bg-white/60 hover:bg-white/80",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-sm font-semibold text-white">
                          {badge}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {op.name ?? "Unnamed"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {op.role ?? ""}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PIN entry */}
          <div className="rounded-2xl border border-white/40 bg-white/60 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              PIN
            </div>

            <input
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D+/g, "");
                setPin(v);
                setMsg(null);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-lg tracking-widest shadow-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••"
              disabled={!selected || busy}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {busy
                  ? "Auto-unlocking…"
                  : pin.replace(/\D+/g, "").length === 4
                  ? "Auto-unlock will trigger."
                  : "Enter 4 digits."}
              </div>

              <button
                type="button"
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                disabled={!selected || busy}
                onClick={attemptUnlock}
              >
                {busy ? "Unlocking…" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
