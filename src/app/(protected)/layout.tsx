// src/app/(protected)/layout.tsx
import React from "react";


export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
     

      {/* Single app content area used by ALL protected pages */}
      <main className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        {children}
      </main>
    </>
  );
}
