// src/app/(protected)/routines/[id]/run/page.tsx
import { notFound } from "next/navigation";
import { getRoutineById } from "@/app/actions/routines";
import RunRoutineClient from "./RunRoutineClient";

export default async function RunRoutinePage({ params }: { params: any }) {
  const p = await Promise.resolve(params);
  const id = String(p?.id ?? "");
  if (!id) notFound();

  const routine = await getRoutineById(id);
  if (!routine) notFound();

  return <RunRoutineClient routine={routine} />;
}
