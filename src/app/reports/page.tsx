// src/app/reports/page.tsx
import React from "react";
import ReportsPageClient from "./ReportsPageClient";

export const metadata = {
  title: "Reports – TempTake",
};

export default function ReportsPage() {
  // Keep this server-only wrapper so metadata is allowed.
  return <ReportsPageClient />;
}
