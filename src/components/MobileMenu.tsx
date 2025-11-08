"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function MobileMenu({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="relative">
      {/* Button */}
      <button
        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-md">
          <div className="flex flex-col text-sm">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="px-4 py-2 hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="px-4 py-2 hover:bg-gray-50"
            >
              Settings
            </Link>
            <Link
              href="/help"
              onClick={() => setOpen(false)}
              className="px-4 py-2 hover:bg-gray-50"
            >
              Help
            </Link>

            <hr className="my-1" />

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-left text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
