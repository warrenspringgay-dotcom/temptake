// src/components/RoutineRunModal.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { TARGET_BY_KEY, type TargetPreset } from "@/lib/temp-constants";
import type { RoutineRow } from "@/components/RoutinePickerModal";
import { useVoiceRoutineEntry } from "@/lib/useVoiceRoutineEntry";

type Props = {
  open: boolean;
  routine: RoutineRow | null;
  defaultDate: string;
  defaultInitials: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type MemberRole = "manager" | "staff" | "owner" | "admin" | string;

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function inferStatus(
  temp: number | null,
  preset?: TargetPreset
): "pass" | "fail" | null {
  if (temp == null || !preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && temp < minC) return "fail";
  if (maxC != null && temp > maxC) return "fail";
  return "pass";
}

/* ---------- matching helpers ---------- */
function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(phrase: string, candidate: string) {
  const p = norm(phrase);
  const c = norm(candidate);
  if (!p || !c) return 0;
  if (c === p) return 999; // exact
  if (c.includes(p)) return 200; // phrase contained
  const pTokens = new Set(p.split(" "));
  const cTokens = new Set(c.split(" "));
  let hit = 0;
  for (const t of pTokens) if (cTokens.has(t)) hit++;
  return hit; // overlap score
}

function bestMatchIndex(phrase: string, items: { item?: string | null }[]) {
  let bestIdx = -1;
  let best = 0;

  for (let i = 0; i < items.length; i++) {
    const label = items[i]?.item ?? "";
    const score = tokenScore(phrase, label);
    if (score > best) {
      best = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0 && best >= 1) return bestIdx;
  return -1;
}

/* ---------- initials helpers ---------- */
function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p: string) => (p[0] ? p[0].toUpperCase() : ""))
    .join("");
}

async function resolveLoggedInInitials(orgId: string): Promise<string | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email?.toLowerCase() ?? null;
    if (!email) return null;

    const { data: tm, error } = await supabase
      .from("team_members")
      .select("initials,name,email,active")
      .eq("org_id", orgId)
      .eq("email", email)
      .maybeSingle();

    if (error || !tm) return null;

    const ini =
      (tm.initials ?? "").toString().trim().toUpperCase() ||
      ((tm.name ?? "").toString().trim()
        ? initialsFromName((tm.name ?? "").toString())
        : "");

    return ini || null;
  } catch {
    return null;
  }
}

/* ---------- role → redirect helpers ---------- */
function getDashboardPathForRole(role: MemberRole | null) {
  if (!role) return "/manager"; // safer default: send to manager dashboard
  const r = String(role).toLowerCase();
  if (r === "manager" || r === "admin" || r === "owner") return "/manager";
  return "/staff";
}

async function getDashboardPathForCurrentUser(orgId: string): Promise<string> {
  try {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;

    const user = authData?.user;
    if (!user) return "/manager";

    const userId = user.id;
    const email = user.email?.toLowerCase() ?? null;

    // Prefer user_id match; fallback to email match
    // (If your team_members table doesn't have user_id, this will just return no rows.)
    const byUserId = await supabase
      .from("team_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!byUserId.error && byUserId.data?.role) {
      return getDashboardPathForRole(byUserId.data.role as MemberRole);
    }

    if (email) {
      const byEmail = await supabase
        .from("team_members")
        .select("role")
        .eq("org_id", orgId)
        .ilike("email", email)
        .maybeSingle();

      if (!byEmail.error && byEmail.data?.role) {
        return getDashboardPathForRole(byEmail.data.role as MemberRole);
      }
    }

    return "/manager";
  } catch {
    return "/manager";
  }
}

/** Render modal at document.body level so it isn't "fixed inside a transformed parent" */
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default function RoutineRunModal({
  open,
  routine,
  defaultDate,
  defaultInitials,
  onClose,
  onSaved,
}: Props) {
  const router = useRouter();

  const [date, setDate] = useState(defaultDate);
  const [initials, setInitials] = useState(defaultInitials || "");
  const [temps, setTemps] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [activeIdx, setActiveIdx] = useState(0);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rowRefs = useRef<
    Record<string, HTMLTableRowElement | HTMLDivElement | null>
  >({});

  const items = useMemo(() => routine?.items ?? [], [routine]);

  // Reset when opens
  useEffect(() => {
    if (!open || !routine) return;

    setDate(defaultDate);
    setTemps(() => {
      const init: Record<string, string> = {};
      routine.items.forEach((it) => {
        init[it.id] = "";
      });
      return init;
    });
    setActiveIdx(0);

    // default initials immediately, then resolve logged-in initials
    setInitials(defaultInitials || "");

    (async () => {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) return;

      const mine = await resolveLoggedInInitials(orgId);
      if (mine) setInitials(mine);
      else if (!defaultInitials) {
        // last resort: try first letter of email
        try {
          const { data: userData } = await supabase.auth.getUser();
          const email = userData?.user?.email ?? "";
          if (email) setInitials(email[0].toUpperCase());
        } catch {}
      }
    })();
  }, [open, routine, defaultDate, defaultInitials]);

  // Voice hook
  const { supported: voiceSupported, listening, start, stop } =
    useVoiceRoutineEntry({
      lang: "en-GB",
      onResult: (r) => {
        if (!open) return;

        if (r.command === "stop") {
          stop();
          return;
        }

        let idx = activeIdx;

        // Match by spoken item phrase (preferred)
        if (r.itemPhrase) {
          const matched = bestMatchIndex(r.itemPhrase, items);
          if (matched >= 0) {
            idx = matched;
            setActiveIdx(matched);
          }
        }

        // Apply temp into matched/active row
        if (r.temp_c) {
          const it = items[idx];
          if (!it) return;

          setTemps((t) => ({ ...t, [it.id]: r.temp_c as string }));
        }
      },
      onError: (msg) => {
        console.warn(msg);
      },
    });

  // Keep active input focused + row visible (hands-free)
  useEffect(() => {
    if (!open) return;
    const it = items[activeIdx];
    if (!it) return;

    const rowEl = rowRefs.current[it.id];
    rowEl?.scrollIntoView?.({ block: "center", behavior: "smooth" });

    const inputEl = inputRefs.current[it.id];
    inputEl?.focus?.();
  }, [activeIdx, open, items]);

  if (!open || !routine) return null;

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!date || !initials) return;

    setSaving(true);
    try {
      const org_id = await getActiveOrgIdClient();
      const location_id = await getActiveLocationIdClient();

      if (!org_id || !location_id) {
        alert("Please select a location first.");
        return;
      }

      // Build timestamp: selected date + current time
      let atIso = new Date().toISOString();
      try {
        const selected = new Date(date);
        const now = new Date();
        const at = new Date(
          selected.getFullYear(),
          selected.getMonth(),
          selected.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds()
        );
        atIso = at.toISOString();
      } catch {}

      const rows = items
        .map((it) => {
          const raw = (temps[it.id] ?? "").trim();
          if (!raw) return null;

          const temp = Number.isFinite(Number(raw)) ? Number(raw) : null;
          const preset =
            (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
              it.target_key
            ];
          const status = inferStatus(temp, preset);

          return {
            org_id,
            location_id,
            at: atIso,
            area: it.location ?? null,
            note: it.item ?? null,
            staff_initials: initials.toUpperCase(),
            target_key: it.target_key,
            temp_c: temp,
            status,
          };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);

      if (!rows.length) {
        onClose();
        return;
      }

      const { error } = await supabase.from("food_temp_logs").insert(rows);
      if (error) {
        alert(error.message);
        return;
      }

      // ✅ decide redirect target by role
      const redirectTo = await getDashboardPathForCurrentUser(String(org_id));

      await onSaved();

      // close modal before navigating
      if (listening) stop();
      onClose();

      // ✅ redirect
      router.replace(redirectTo);
    } finally {
      setSaving(false);
    }
  }

  const activeId = items[activeIdx]?.id ?? null;

  return (
    <ModalPortal>
      {/* Overlay: top aligned with padding so it never sits under navbar */}
      <div
        className="fixed inset-0 z-[999] overflow-y-auto bg-black/40 px-3 pb-6 pt-[88px]"
        onClick={() => {
          if (listening) stop();
          onClose();
        }}
      >
        <form
          onSubmit={handleSave}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-600/30 bg-emerald-600 px-4 py-3 text-white">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-emerald-100">
                Run routine
              </div>
              <div className="truncate text-base font-semibold">
                {routine.name}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => (listening ? stop() : start())}
                  className={cls(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    listening
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-white/30 bg-white/15 text-white hover:bg-white/25"
                  )}
                  title="Voice entry"
                >
                  {listening ? "🎤 Listening" : "🎤 Voice"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (listening) stop();
                  onClose();
                }}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-800"
              >
                Close
              </button>
            </div>
          </div>

          {/* Compact top controls */}
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Date
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>

              <label className="text-sm font-medium">
                Initials (auto from logged-in user)
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase shadow-sm"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  required
                />
              </label>
            </div>

            {voiceSupported && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Say: <strong>"fish 75.2"</strong> or <strong>"stop"</strong>.
                It matches your phrase to the closest routine item name and fills
                that temp.
              </div>
            )}

            {/* Now / Next (hands-free hint) */}
            <div className="mt-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Now:</span>{" "}
              {items[activeIdx]?.item ?? "—"}{" "}
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-semibold text-slate-800">Next:</span>{" "}
              {items[Math.min(activeIdx + 1, items.length - 1)]?.item ?? "—"}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[62vh] overflow-y-auto bg-white px-4 py-3">
            {/* Table (desktop) */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2 text-left text-xs font-semibold">#</th>
                    <th className="p-2 text-left text-xs font-semibold">
                      Location
                    </th>
                    <th className="p-2 text-left text-xs font-semibold">Item</th>
                    <th className="p-2 text-left text-xs font-semibold">
                      Target
                    </th>
                    <th className="p-2 text-left text-xs font-semibold">
                      Temp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const preset =
                      (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
                        it.target_key
                      ];
                    const isActive = it.id === activeId;

                    return (
                      <tr
                        key={it.id}
                        ref={(el) => {
                          rowRefs.current[it.id] = el;
                        }}
                        className={cls(
                          "border-t border-slate-100 cursor-pointer",
                          isActive && "bg-emerald-50"
                        )}
                        onClick={() => setActiveIdx(idx)}
                      >
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{it.location ?? "—"}</td>
                        <td className="p-2">{it.item ?? "—"}</td>
                        <td className="p-2 text-xs text-slate-500">
                          {preset?.label ?? it.target_key ?? "—"}
                        </td>
                        <td className="p-2">
                          <input
                            ref={(el) => {
                              inputRefs.current[it.id] = el;
                            }}
                            className={cls(
                              "w-24 rounded-lg border bg-white px-2 py-1 shadow-sm",
                              isActive
                                ? "border-emerald-300 ring-2 ring-emerald-200"
                                : "border-slate-300"
                            )}
                            value={temps[it.id] ?? ""}
                            onChange={(e) =>
                              setTemps((t) => ({
                                ...t,
                                [it.id]: e.target.value,
                              }))
                            }
                            placeholder="e.g. 75.1"
                            inputMode="decimal"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {items.map((it, idx) => {
                const preset =
                  (TARGET_BY_KEY as Record<string, TargetPreset | undefined>)[
                    it.target_key
                  ];
                const isActive = it.id === activeId;

                return (
                  <div
                    key={it.id}
                    ref={(el) => {
                      rowRefs.current[it.id] = el;
                    }}
                    className={cls(
                      "rounded-xl border bg-white p-3 shadow-sm",
                      isActive
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200"
                    )}
                    onClick={() => setActiveIdx(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">
                        #{idx + 1} {isActive ? "· Active" : ""}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {preset?.label ?? it.target_key}
                      </div>
                    </div>

                    <div className="mt-1 font-medium text-slate-900">
                      {it.item ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {it.location ?? "—"}
                    </div>

                    <input
                      ref={(el) => {
                        inputRefs.current[it.id] = el;
                      }}
                      className={cls(
                        "mt-2 w-full rounded-lg border bg-white px-3 py-2 shadow-sm",
                        isActive
                          ? "border-emerald-300 ring-2 ring-emerald-200"
                          : "border-slate-300"
                      )}
                      placeholder="Temperature"
                      value={temps[it.id] ?? ""}
                      onChange={(e) =>
                        setTemps((t) => ({ ...t, [it.id]: e.target.value }))
                      }
                      inputMode="decimal"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => {
                if (listening) stop();
                onClose();
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save all"}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
