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
     <main className="w-full px-0 md:mx-auto md:max-w-6xl md:px-4">
  {children}
</main>

      
    </>
  );
}
