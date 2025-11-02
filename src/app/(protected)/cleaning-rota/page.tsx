// app/(protected)/cleaning-rota/page.tsx
"use client";

import dynamic from "next/dynamic";

// Force using the module's default export
const CleaningRota = dynamic(
  () => import("@/components/CleaningRota").then(m => m.default),
  { ssr: false }
);

export default function CleaningRotaPage() {
  // choose "manage" or "today"
  return <CleaningRota mode="manage" />;
}
