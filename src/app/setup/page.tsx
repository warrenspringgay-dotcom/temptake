// src/app/setup/page.tsx
import SetupClient from "./setupClient";

export default function SetupPage() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Finish setup</h1>
        <p className="mt-1 text-sm text-gray-600">
          Just need your business name to create your workspace.
        </p>
        <div className="mt-4">
          <SetupClient />
        </div>
      </div>
    </div>
  );
}
