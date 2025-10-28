// src/app/(protected)/settings/page.tsx
import AuthGate from "@/components/AuthGate";

export default function SettingsPage() {
  return (
    <AuthGate>
      <div className="space-y-4 rounded-2xl border bg-white p-4">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p>Coming soon — org details, preferences, and notifications.</p>
      </div>
    </AuthGate>
  );
}
