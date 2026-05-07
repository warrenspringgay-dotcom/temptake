"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useActiveLocation } from "@/hooks/useActiveLocation";

type PushPrefs = {
  notify_closing_signoff: boolean;
  notify_cleaning: boolean;
  notify_temp_fail: boolean;
  notify_training: boolean;
  notify_allergen: boolean;
};

type PushSubscriptionRow = PushPrefs & {
  id: string;
  enabled: boolean;
  created_at: string | null;
};

const DEFAULT_PREFS: PushPrefs = {
  notify_closing_signoff: true,
  notify_cleaning: true,
  notify_temp_fail: true,
  notify_training: true,
  notify_allergen: true,
};

const PREF_ITEMS: Array<{
  key: keyof PushPrefs;
  title: string;
  description: string;
}> = [
  {
    key: "notify_closing_signoff",
    title: "Closing sign-off reminders",
    description: "Prompt near closing if today has not been signed off.",
  },
  {
    key: "notify_cleaning",
    title: "Cleaning reminders",
    description: "Prompt near closing if cleaning tasks are still incomplete.",
  },
  {
    key: "notify_temp_fail",
    title: "Temperature fail alerts",
    description: "Instant alert when a temperature check fails.",
  },
  {
    key: "notify_training",
    title: "Training expiry reminders",
    description: "Warn when food safety training is due or expired.",
  },
  {
    key: "notify_allergen",
    title: "Allergen review reminders",
    description: "Warn when allergen review is due.",
  },
];

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function PushNotificationSetup() {
  const { orgId, locationId, loading: activeLocationLoading } = useActiveLocation();

  const [busy, setBusy] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof PushPrefs | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [subscriptionRow, setSubscriptionRow] = useState<PushSubscriptionRow | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PREFS);

  const pushEnabled = !!subscriptionRow?.enabled;

  const browserPermission = useMemo(() => {
    if (typeof window === "undefined") return "unknown";
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }, [status, pushEnabled]);

  async function loadPrefs() {
    setLoadingPrefs(true);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;

      if (!user) {
        setSubscriptionRow(null);
        setPrefs(DEFAULT_PREFS);
        return;
      }

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select(
          "id,enabled,created_at,notify_closing_signoff,notify_cleaning,notify_temp_fail,notify_training,notify_allergen"
        )
        .eq("user_id", user.id)
        .eq("enabled", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSubscriptionRow(null);
        setPrefs(DEFAULT_PREFS);
        return;
      }

      const row = data as PushSubscriptionRow;
      setSubscriptionRow(row);
      setPrefs({
        notify_closing_signoff: row.notify_closing_signoff !== false,
        notify_cleaning: row.notify_cleaning !== false,
        notify_temp_fail: row.notify_temp_fail !== false,
        notify_training: row.notify_training !== false,
        notify_allergen: row.notify_allergen !== false,
      });
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message || "Failed to load push notification settings.");
    } finally {
      setLoadingPrefs(false);
    }
  }

  useEffect(() => {
    void loadPrefs();
  }, []);

  async function enablePush() {
    setBusy(true);
    setStatus(null);

    try {
      if (!orgId) throw new Error("No organisation found.");
      if (!("serviceWorker" in navigator)) {
        throw new Error("This browser does not support service workers.");
      }
      if (!("PushManager" in window)) {
        throw new Error("This browser does not support push notifications.");
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Notifications were not allowed.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");

      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId,
          locationId,
          subscription,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save push subscription.");
      }

      setStatus("Push notifications enabled for this device.");
      await loadPrefs();
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message || "Failed to enable push notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePref(key: keyof PushPrefs, checked: boolean) {
    if (!subscriptionRow?.id) {
      setStatus("Enable push notifications before changing preferences.");
      return;
    }

    const previous = prefs;

    setPrefs((prev) => ({
      ...prev,
      [key]: checked,
    }));

    setSavingKey(key);
    setStatus(null);

    try {
      const { error } = await supabase
        .from("push_subscriptions")
        .update({
          [key]: checked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionRow.id);

      if (error) throw error;

      setStatus("Notification preference saved.");
    } catch (e: any) {
      console.error(e);
      setPrefs(previous);
      setStatus(e?.message || "Failed to save notification preference.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            Push notifications
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Control which compliance alerts this browser receives. Keep this tight:
            only alerts that prevent missed records should interrupt users.
          </p>
        </div>

        <span
          className={cls(
            "w-fit rounded-full border px-2 py-1 text-[11px] font-bold",
            pushEnabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          )}
        >
          {pushEnabled ? "Enabled" : "Not enabled"}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold text-slate-900">
              Browser permission
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Current status:{" "}
              <span className="font-semibold text-slate-700">
                {browserPermission}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={enablePush}
            disabled={busy || activeLocationLoading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {busy ? "Enabling…" : pushEnabled ? "Re-enable on this device" : "Enable push notifications"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {PREF_ITEMS.map((item) => {
          const checked = prefs[item.key];
          const disabled = !pushEnabled || loadingPrefs || savingKey === item.key;

          return (
            <label
              key={item.key}
              className={cls(
                "flex items-center justify-between gap-4 rounded-2xl border px-3 py-3",
                checked ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50",
                disabled && "opacity-60"
              )}
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {item.description}
                </span>
              </span>

              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => void updatePref(item.key, e.target.checked)}
                className="h-5 w-5 shrink-0 accent-slate-900"
              />
            </label>
          );
        })}
      </div>

      {!pushEnabled && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Enable push notifications before changing preferences.
        </div>
      )}

      {status ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
          {status}
        </div>
      ) : null}
    </section>
  );
}