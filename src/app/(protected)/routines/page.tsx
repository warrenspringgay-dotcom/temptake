// src/app/(protected)/routines/page.tsx
import type { Metadata } from "next";
import RoutinesManager from "@/components/RoutinesManager";

export const metadata: Metadata = { title: "Routines · TempTake" };

export default function RoutinesPage() {
  return <RoutinesManager />;
}
