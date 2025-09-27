// src/app/login/page.tsx
// Server Component (no "use client")

import Link from "next/link";

type LoginPageProps = {
  // Next.js 15 may pass this as a Promise during streaming
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: "Login – TempTake",
};

export default async function Page(props: LoginPageProps) {
  const sp = props.searchParams ? await props.searchParams : {};
  const message = (Array.isArray(sp?.message) ? sp.message[0] : sp?.message) ?? null;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>

      {message ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </div>
      ) : null}

      {/* Replace this with your real auth UI if you have one */}
      <div className="rounded-xl border p-4">
        <p className="text-sm text-gray-600">
          This is a placeholder login page. If you use Supabase Auth UI or a custom form, render it here.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/"
            className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-900"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
