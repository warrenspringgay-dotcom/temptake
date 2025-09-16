// src/app/team/page.tsx
import TeamManagerLocal from "@/components/TeamManagerLocal";

export const metadata = { title: "Team · TempTake" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <TeamManagerLocal />
    </div>
  );
}
