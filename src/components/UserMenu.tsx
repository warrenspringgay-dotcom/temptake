// src/components/UserMenu.tsx (SERVER COMPONENT)
import Link from "next/link";
import { getSession, signOutAction } from "@/app/actions/auth";

export default async function UserMenu() {
  const { user } = await getSession();

  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">{user.email}</span>
      <form action={signOutAction}>
        <button className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          Sign out
        </button>
      </form>
    </div>
  );
}
