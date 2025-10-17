// src/app/routines/[id]/run/page.tsx
import { notFound } from "next/navigation";
import { getRoutineById } from "@/app/actions/routines";
import RoutineRunnerClient, { type RoutineForRun } from "./RunRoutineClient";

export default async function RunRoutinePage(
  props: { params: Promise<{ id: string }> } // Next 15 dynamic params must be awaited
) {
  const { id } = await props.params;

  const routine = await getRoutineById(id).catch(() => null);
  if (!routine) return notFound();

  // 🔧 Normalize to the strict client shape
  const normalized: RoutineForRun = {
    id: String(routine.id),
    name: routine.name ?? "Routine",
    items: (routine.items ?? []).map((it, idx) => ({
      id: String(it.id ?? `${routine.id}-${idx}`),
      position: Number(it.position ?? idx),
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: it.target_key ?? "chill",
    })),
  };

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Run routine: {normalized.name}</h1>
      <RoutineRunnerClient routine={normalized} />
    </main>
  );
}
