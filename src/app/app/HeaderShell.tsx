// src/app/HeaderShell.tsx
"use client";

import { usePathname } from "next/navigation";
import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import UserMenu, { UserInfo } from "@/components/UserMenu";
import OrgName from "@/components/OrgName";
import LocationSwitcher from "@/components/LocationSwitcher";
import TempFab from "@/components/QuickActionsFab";

type Props = {
  user: any | null;            // whatever you already had
  initialUser: UserInfo | null;
};

export default function HeaderShell({ user, initialUser }: Props) {
  const pathname = usePathname();
  const hideChrome = pathname === "/" || pathname.startsWith("/launch");

  if (hideChrome) return null;

  return (
    <>
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <OrgName />
            <LocationSwitcher />
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <NavTabs />
            <UserMenu initialUser={initialUser} />
          </div>

          {/* Mobile menu can also use initialUser if you want */}
          <div className="flex md:hidden items-center gap-2">
            <MobileMenu user={user} />
          </div>
        </div>
      </header>

      <TempFab />
    </>
  );
}
