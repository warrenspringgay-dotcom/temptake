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
     <main className="w-full -mx-3 px-3 sm:mx-0 sm:px-4 md:mx-auto md:max-w-6xl">
        {children}
      </main>
    </>
  );
}
