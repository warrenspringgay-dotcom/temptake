// src/app/HeaderShell.tsx
"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import OrgName from "@/components/OrgName";
import LocationSwitcher from "@/components/LocationSwitcher";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

type HeaderShellProps = {
  user: any;
};

export default function HeaderShell({ user }: HeaderShellProps) {
  const pathname = usePathname();
  const { hasValid } = useSubscriptionStatus();

  // Remove '/app' from hideHeader
  const hideHeader =
    pathname === "/" ||
    pathname.startsWith("/launch") ||
    pathname.startsWith("/demo-wall");

  if (hideHeader) return null;

  const showNavAndLocation = hasValid;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-12 items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" width={24} height={24} alt="TempTake" />
            <span className="font-semibold">TempTake</span>
          </Link>

          <div className="flex-1 md:hidden">
            <OrgName className="block truncate text-center text-xs font-semibold" />
          </div>

          <div className="mx-auto hidden md:block">
            {showNavAndLocation && <NavTabs />}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {showNavAndLocation && (
              <div className="max-w-[180px] flex-1 md:max-w-[220px]">
                <LocationSwitcher />
              </div>
            )}

            <div className="hidden md:block">
              <UserMenu />
            </div>

            <div className="md:hidden">
              <MobileMenu user={user} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
