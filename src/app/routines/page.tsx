// src/app/routines/page.tsx
import { Suspense } from "react";
import RoutinesClient from "./routines-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Temp Routines – TempTake" };

export default function Page() {
  return (
    <Suspense fallback={<div className="rounded-2xl border p-4">Loading routines…</div>}>
      <RoutinesClient />
    </Suspense>
  );
}
