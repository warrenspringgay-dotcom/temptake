// src/app/settings/page.tsx
export default function SettingsPage() {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h1 className="text-xl font-semibold mb-3">Settings</h1>
      <div className="grid max-w-xl gap-4">
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Business name</span>
          <input className="h-10 w-full rounded-xl border px-3" placeholder="e.g., Springgays Limited" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Default location</span>
          <input className="h-10 w-full rounded-xl border px-3" placeholder="Kitchen" />
        </label>
      </div>
    </div>
  );
}
