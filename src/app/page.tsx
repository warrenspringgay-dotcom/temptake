// src/app/page.tsx
import Link from "next/link";
import FoodTempLoggerServer from "@/components/FoodTempLoggerServer";
import { supabaseServer } from "@/lib/supabaseServer";

export const metadata = { title: "Dashboard – TempTake" };

export default async function Page() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If signed out, show a simple “please log in” panel
  if (!user) {
    return (
      <main className="p-4">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Welcome to TempTake</h1>
          <p className="mt-2 text-sm text-gray-600">
            You’re signed out. Please log in to start logging temperatures and viewing KPIs.
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-900"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Signed in — render the dashboard logger
  return (
    <main className="p-4">
      <FoodTempLoggerServer />
    </main>
  );
}
