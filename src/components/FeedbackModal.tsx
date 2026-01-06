// src/components/FeedbackModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { usePathname } from "next/navigation";

type FeedbackKind = "bug" | "confusing" | "idea" | "other";

type Props = {
  open: boolean;
  onClose: () => void;
  // Optional: if you want to pass extra context from the FAB (location/area etc.)
  locationId?: string | null;
  area?: string | null;
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function FeedbackModal({
  open,
  onClose,
  locationId = null,
  area = null,
}: Props) {
  const { user } = useAuth();
  const pathname = usePathname();

  const [kind, setKind] = useState<FeedbackKind>("other");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !!user && message.trim().length >= 3 && !sending;
  }, [user, message, sending]);

  useEffect(() => {
    if (!open) return;
    // Reset each time it opens (keeps it fast and frictionless)
    setKind("other");
    setMessage("");
    setStatus(null);
    setSending(false);
  }, [open]);

  async function submit() {
    if (!user) {
      setStatus("You must be signed in to send feedback.");
      return;
    }
    const text = message.trim();
    if (text.length < 3) {
      setStatus("Add a little more detail (at least 3 characters).");
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setStatus("No active organisation found.");
        setSending(false);
        return;
      }

      const meta = {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        timestampClient: new Date().toISOString(),
      };

      const { error } = await supabase.from("feedback_items").insert({
        org_id: orgId,
        user_id: user.id,
        location_id: locationId,
        area,
        kind,
        message: text,
        page_path: pathname ?? null,
        meta,
      });

      if (error) {
        setStatus(error.message);
        setSending(false);
        return;
      }

      setStatus("Thanks. Feedback sent.");
      // Close quickly after success so it feels instant
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to send feedback.");
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close feedback"
      />

      <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-extrabold text-slate-900">
            Send feedback
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Quick notes help us fix the right things.
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">
              Type
            </div>
            <div className="flex flex-wrap gap-2">
              {(["bug", "confusing", "idea", "other"] as FeedbackKind[]).map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cls(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      kind === k
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    {k === "bug"
                      ? "Bug"
                      : k === "confusing"
                      ? "Confusing"
                      : k === "idea"
                      ? "Idea"
                      : "Other"}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">
              Message
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="What were you trying to do?"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
            <div className="mt-1 text-[11px] text-slate-500">
              Page: <span className="font-mono">{pathname ?? "—"}</span>
            </div>
          </div>

          {status && (
            <div
              className={cls(
                "rounded-2xl px-4 py-3 text-sm",
                status === "Thanks. Feedback sent."
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-slate-50 text-slate-700"
              )}
            >
              {status}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={cls(
              "rounded-2xl px-4 py-2 text-sm font-semibold",
              canSubmit
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-slate-200 text-slate-600 cursor-not-allowed"
            )}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
