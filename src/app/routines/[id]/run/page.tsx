import { notFound } from "next/navigation";
import { getRoutineById } from "@/app/actions/routines";
import RunRoutineClient from "./RunRoutineClient";

// ✅ params is now a Promise – await it first.
export default async function RunRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const routine = await getRoutineById(id).catch(() => null);
  if (!routine) return notFound();

  return (
    <div className="mx-auto my-6 w-[min(980px,94vw)] rounded-2xl border bg-white p-4 shadow-sm">
      <h1 className="mb-4 text-lg font-semibold">Run routine: {routine.name}</h1>
      <RunRoutineClient routine={routine} />
    </div>
  );
}
