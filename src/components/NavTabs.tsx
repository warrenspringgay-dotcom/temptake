// src/components/NavTabs.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function NavTabs({
  brandName = "TempTake",
  brandAccent = "#F59E0B",
  logoUrl = "/temptake-192.png",
}: {
  brandName?: string;
  brandAccent?: string;
  logoUrl?: string;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Dashboard" },
    { href: "/allergens", label: "Allergens" },
    { href: "/suppliers", label: "Suppliers" },
    { href: "/team", label: "Team" },
    { href: "/reports", label: "Reports" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="flex w-full items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <Image src={logoUrl} alt={brandName} width={24} height={24} />
        <span className="text-lg font-semibold" style={{ color: brandAccent }}>
          {brandName}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 text-sm font-medium">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded px-2 py-1 ${
                active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
