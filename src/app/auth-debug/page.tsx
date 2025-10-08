// src/app/auth-debug/page.tsx
import { getSession } from "@/lib/auth-helpers";
import { createServerClient } from "@/lib/supabaseServer";

export default async function AuthDebug() {
  const { user } = await getSession();

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-lg font-semibold mb-3">Auth Debug</h1>
      <pre className="rounded-lg border border-gray-200 bg-white p-3 text-sm overflow-auto">
        {JSON.stringify({ user }, null, 2)}
      </pre>
    </div>
  );
}
