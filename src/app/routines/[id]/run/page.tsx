// src/app/routines/[id]/run/page.tsx
import { notFound } from "next/navigation";
import { getRoutineWithItems } from "@/app/actions/routines";
import RoutineRunner from "@/components/RoutineRunnerClient";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };

export default async function Page({
  params,
}: {
  params: Promise<RouteParams>; // <-- NOTE: Promise
}) {
  const { id } = await params;  // <-- await the params
  const routine = await getRoutineWithItems(id);
  if (!routine) return notFound();
  return <RoutineRunner routine={routine} />;
}
