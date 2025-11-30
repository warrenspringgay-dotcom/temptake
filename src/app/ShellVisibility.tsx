"use client";

import { usePathname } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import NavTabs from "@/components/NavTabs";

export default function ShellVisibility() {
  const pathname = usePathname();

  const hide =
    pathname === "/" || pathname.startsWith("/launch");

  if (hide) return null;

  return (
    <>
      <AppHeader />
      <NavTabs />
    </>
  );
}
