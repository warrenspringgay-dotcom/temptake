"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkstation } from "@/components/WorkstationLockProvider";

type TeamMember = {
  team_member_id: string;
  name: string;
  role: string | null;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "").slice(0, 6);
}

export default function WorkstationLockScreen() {
  const {
    locked,
    operator,
    setOperator,
    orgId,
    locationId,
  } = useWorkstation();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<TeamMember | null>(null);

  const [mode, setMode] = useState<"enter" | "setup">("enter");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!locked || !orgId || !locationId) return;

    async function loadMembers() {
      const res = await fetch(
        `/api/workstation/staff?orgId=${orgId}&locationId=${locationId}`
      );
      const json = await res.json();
      if (json?.members) setMembers(json.members);
    }

    loadMembers();
  }, [locked, orgId, locationId]);

  useEffect(() => {
    if (locked && mode === "enter") {
      setTimeout(() => pinRef.current?.focus(), 100);
    }
  }, [locked, mode]);

  if (!locked) return null;

  async function unlock() {
    if (!orgId || !locationId || !selected) return;

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/workstation/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          locationId,
          teamMemberId: selected.team_member_id,
          pin,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (json?.ok) {
        setOperator(json.operator);
        setPin("");
        setConfirmPin("");
        setMode("enter");
        return;
      }

      if (json?.reason === "no-pin-set") {
        setMode("setup");
        setPin("");
        setConfirmPin("");
        return;
      }

      setMsg("Invalid PIN.");
    } finally {
      setBusy(false);
    }
  }

  async function setupPin() {
    if (!orgId || !selected) return;

    if (pin.length < 4) {
      setMsg("PIN must be at least 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setMsg("PINs do not match.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/workstation/set-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          teamMemberId: selected.team_member_id,
          pin,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg("Failed to set PIN.");
        return;
      }

      // Immediately unlock after setting PIN
      setOperator(json.operator);

      setMode("enter");
      setPin("");
      setConfirmPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-lg font-semibold">
          Workstation locked
        </div>

        <div className="mb-4 text-sm text-slate-600">
          Select a user and{" "}
          {mode === "enter" ? "enter PIN" : "set PIN"} to continue.
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {members.map((m) => (
            <button
              key={m.team_member_id}
              onClick={() => {
                setSelected(m);
                setMode("enter");
                setPin("");
                setConfirmPin("");
                setMsg(null);
              }}
              className={`rounded-xl border p-3 text-left ${
                selected?.team_member_id === m.team_member_id
                  ? "border-black"
                  : "border-slate-300"
              }`}
            >
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-slate-500">{m.role}</div>
            </button>
          ))}
        </div>

        {selected && (
          <>
            {mode === "enter" ? (
              <>
                <div className="text-xs font-semibold text-slate-700">PIN</div>
                <input
                  ref={pinRef}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(onlyDigits(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-lg tracking-widest"
                  placeholder="••••"
                />
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-slate-700">
                  Set PIN
                </div>
                <input
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(onlyDigits(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-lg tracking-widest"
                  placeholder="••••"
                />

                <div className="mt-3 text-xs font-semibold text-slate-700">
                  Confirm PIN
                </div>
                <input
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-lg tracking-widest"
                  placeholder="••••"
                />
              </>
            )}

            {msg && (
              <div className="mt-3 text-sm text-red-600">{msg}</div>
            )}

            <button
              onClick={() =>
                void (mode === "enter" ? unlock() : setupPin())
              }
              disabled={
                busy ||
                !selected ||
                (mode === "enter"
                  ? pin.length < 4
                  : pin.length < 4 || confirmPin.length < 4)
              }
              className="mt-4 h-11 w-full rounded-xl bg-black text-white disabled:opacity-50"
            >
              {busy
                ? mode === "enter"
                  ? "Checking…"
                  : "Saving…"
                : mode === "enter"
                ? "Unlock"
                : "Set PIN"}
            </button>
          </>
        )}

        {!members.length && (
          <div className="text-sm text-red-600">
            No staff found for this location.
          </div>
        )}
      </div>
    </div>
  );
}