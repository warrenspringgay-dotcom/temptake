// src/components/UserMenu.tsx  (SERVER COMPONENT)
import Link from "next/link";
import { getSession, signOutAction } from "@/app/actions/auth";

export default async function UserMenu() {
  const { user, role } = await getSession();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-sm text-slate-600">
        {role ?? "staff"}
      </span>
      <form action={signOutAction}>
        <button className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100">
          Sign out
        </button>
      </form>
    </div>
  );
}
