// src/app/app/layout.tsx
import React from "react";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth / subscription checks here – /app is PUBLIC demo only
  return <>{children}</>;
}
