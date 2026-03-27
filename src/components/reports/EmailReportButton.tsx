// src/components/reports/EmailReportButton.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

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
  disabled = false,
}: Props) {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [sendToSelf, setSendToSelf] = useState(true);
  const [extraEmail, setExtraEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selfEmail = user?.email?.trim() || "";

  const recipients = useMemo(() => {
    const list: string[] = [];

    if (sendToSelf && selfEmail) {
      list.push(selfEmail);
    }

    const extra = extraEmail.trim();
    if (extra) {
      list.push(extra);
    }

    return Array.from(new Set(list));
  }, [sendToSelf, selfEmail, extraEmail]);

  async function handleSend() {
    setError(null);
    setSuccess(null);

    if (!orgId) {
      setError("No organisation selected.");
      return;
    }

    if (sendToSelf && !selfEmail) {
      setError("No logged-in email found for ‘Send to me’.");
      return;
    }

    if (extraEmail.trim() && !isValidEmail(extraEmail)) {
      setError("Enter a valid extra email address.");
      return;
    }

    if (recipients.length === 0) {
      setError("Choose at least one recipient.");
      return;
    }

    setSending(true);

    try {
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
          recipients,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      if (!isJson) {
        const text = await res.text();
        console.error("[email report] non-json response:", text);
        throw new Error(
          "Email route returned HTML instead of JSON. Check the API path and route file location."
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send report email.");
      }

      setSuccess("Report emailed successfully.");
      setOpen(false);
      setExtraEmail("");
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to send report email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(null);
          setOpen(true);
        }}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        <Mail className="mr-2 h-4 w-4" />
        Email report
      </button>

      {success ? (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {success}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Email report</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {locationLabel} • {from} to {to}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <input
                  type="checkbox"
                  checked={sendToSelf}
                  onChange={(e) => setSendToSelf(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900">Send to me</div>
                  <div className="text-xs text-slate-500">{selfEmail || "No logged-in email"}</div>
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Leave blank if you only want to send it to yourself.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Recipients
                </div>
                <div className="mt-2 space-y-1 text-sm text-slate-800">
                  {recipients.length ? (
                    recipients.map((email) => <div key={email}>{email}</div>)
                  ) : (
                    <div className="text-slate-500">No recipients selected</div>
                  )}
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}