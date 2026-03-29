import React from "react";
import ProtectedAppChrome from "@/components/ProtectedAppChrome";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProtectedAppChrome />

      {/* Single app content area used by ALL protected pages */}
      <main className="w-full px-0 md:mx-auto md:max-w-screen-2xl">
        {children}
      </main>
    </>
  );
}