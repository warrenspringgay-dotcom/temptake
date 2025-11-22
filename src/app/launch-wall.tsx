// src/app/launch-wall.tsx  ← 100% public, no auth
import { supabase } from "@/lib/supabaseBrowser";
import { useEffect, useState } from "react";

type Note = {
  id: string;
  message: string;
  initials: string;
  color: string;
};

const COLORS = [
  "bg-orange-200",
  "bg-yellow-200",
  "bg-pink-200",
  "bg-amber-200",
  "bg-red-200",
];

export default function LaunchWall() {
  const [notes, setNotes] = useState<Note[]>([]);

  use30secondRefresh(async () => {
    const { data } = await supabase
      .from("launch_wall")
      .select("*")
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }, []);

  return (
    <section className="py-20 bg-gradient-to-b from-white to-orange-50">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-4">
          Chefs are already losing their minds
        </h2>
        <p className="text-xl text-gray-600">
          Real reactions from the first kitchens testing TempTake
        </p>
      </div>

      <div className="grid gap-8 max-w-7xl mx-auto px-6 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note, i) => (
          <div
            key={note.id}
            className={`relative rounded-3xl p-10 shadow-2xl ${note.color} transform transition-all hover:scale-105 hover:shadow-3xl`}
            style={{
              transform: `rotate(${Math.sin(i * 0.8) * 6}deg)`,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <div className="text-5xl font-black mb-6 opacity-90">
              {note.initials}
            </div>
            <p className="text-2xl leading-relaxed whitespace-pre-wrap">
              {note.message}
            </p>
            <div className="mt-6 flex gap-2 justify-end">
              🔥🔥🔥🔥🔥
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Tiny helper to auto-refresh every 30s
function use30secondRefresh(cb: () => void, deps: any[] = []) {
  useEffect(() => {
    cb();
    const i = setInterval(cb, 30_000);
    return () => clearInterval(i);
  }, deps);
}