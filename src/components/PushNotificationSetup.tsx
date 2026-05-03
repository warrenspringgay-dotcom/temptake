"use client";

import React, { useState } from "react";
import { useActiveLocation } from "@/hooks/useActiveLocation";

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
  const { orgId, locationId, loading } = useActiveLocation();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function enablePush() {
    setBusy(true);
    setStatus(null);

    try {
      if (!orgId) throw new Error("No organisation found.");
      if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers.");
      if (!("PushManager" in window)) throw new Error("This browser does not support push notifications.");

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
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message || "Failed to enable push notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="text-sm font-extrabold text-slate-900">Push notifications</div>
      <p className="mt-1 text-xs text-slate-600">
        Enable closing-time reminders when today has not been signed off.
      </p>

      <button
        type="button"
        onClick={enablePush}
        disabled={busy || loading}
        className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {busy ? "Enabling…" : "Enable push notifications"}
      </button>

      {status ? <div className="mt-2 text-xs font-medium text-slate-700">{status}</div> : null}
    </div>
  );
}