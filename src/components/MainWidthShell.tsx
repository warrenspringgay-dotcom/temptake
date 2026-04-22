"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function MainWidthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";

  const isFullWidthMarketing =
    pathname === "/" ||
    pathname.startsWith("/launch") ||
    pathname.startsWith("/sectors") ||
    pathname === "/takeaway-food-safety-app" ||
    pathname === "/cafe-food-safety-app" ||
    pathname === "/restaurant-food-safety-app" ||
    pathname === "/fish-and-chip-shop-food-safety-app" ||
    pathname === "/pub-food-safety-app" ||
    pathname === "/mobile-catering-food-safety-app";

  if (isFullWidthMarketing) {
    return <>{children}</>;
  }

  return (
    <div className="w-full px-0 sm:px-4 md:mx-auto md:max-w-6xl">
      {children}
    </div>
  );
}