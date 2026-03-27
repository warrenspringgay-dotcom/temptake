"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Mail } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Button from "@/components/ui/button";

type Props = {
  orgId: string | null;
  from: string;
  to: string;
  locationId: string | null;
  locationLabel: string;
  disabled?: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EmailReportButton({
  orgId,
  from,
  to,
  locationId,
  locationLabel,
  disabled,
}: Props) {
  const { user } = useAuth();

  const selfEmail = user?.email ?? "";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sendToSelf, setSendToSelf] = useState<boolean>(!!selfEmail);
  const [extraEmail, setExtraEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const recipientsPreview = useMemo(() => {
    const emails = new Set<string>();

    if (sendToSelf && selfEmail) emails.add(selfEmail.trim().toLowerCase());
    if (extraEmail.trim()) emails.add(extraEmail.trim().toLowerCase());

    return Array.from(emails);
  }, [sendToSelf, selfEmail, extraEmail]);

  const canSend =
    !disabled &&
    !!orgId &&
    !sending &&
    recipientsPreview.length > 0 &&
    (!extraEmail.trim() || isValidEmail(extraEmail));

  async function handleSend() {
    if (!orgId) {
      setError("No organisation selected.");
      return;
    }

    if (!sendToSelf && !extraEmail.trim()) {
      setError("Choose at least one recipient.");
      return;
    }

    if (extraEmail.trim() && !isValidEmail(extraEmail)) {
      setError("Enter a valid extra email address.");
      return;
    }

    try {
      setSending(true);
      setError(null);
      setStatus(null);

      const res = await fetch("/api/reports/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId,
          from,
          to,
          locationId,
          locationLabel,
          sendToSelf,
          extraEmail: extraEmail.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to send report email.");
      }

      setStatus(`Report emailed to ${json.recipients.join(", ")}`);
      setExtraEmail("");
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send report email.");
    } finally {
      setSending(false);
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999]">
            <button
              type="button"
              aria-label="Close email report modal"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />

            <div className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Email report</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {locationLabel} • {from} to {to}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={sendToSelf}
                    onChange={(e) => setSendToSelf(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    disabled={!selfEmail}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">Send to me</div>
                    <div className="truncate text-xs text-slate-500">
                      {selfEmail || "No account email found"}
                    </div>
                  </div>
                </label>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">
                    Extra email recipient
                  </label>
                  <input
                    type="email"
                    value={extraEmail}
                    onChange={(e) => setExtraEmail(e.target.value)}
                    placeholder="inspector@example.com"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    Leave blank if you only want to send it to yourself.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Recipients
                  </div>
                  <div className="mt-2 break-words text-sm text-slate-800">
                    {recipientsPreview.length > 0 ? recipientsPreview.join(", ") : "None selected"}
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send report"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setError(null);
          setStatus(null);
          setOpen(true);
        }}
        disabled={disabled || !orgId}
        className="w-full rounded-xl border-slate-300 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        <Mail className="mr-2 h-4 w-4" />
        Email report
      </Button>

      {status && (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {status}
        </div>
      )}

      {error && !open && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      {modal}
    </>
  );
}