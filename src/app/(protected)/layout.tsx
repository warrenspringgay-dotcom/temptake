// src/app/(protected)/layout.tsx
import React from "react";
import WelcomeGate from "@/components/WelcomeGate";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* global chrome (nav, whatever) */}
      {children}
      {/* welcome modal lives here */}
      <WelcomeGate />
    </>
  );
}
