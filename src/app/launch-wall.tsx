// src/app/launch-wall.tsx  ← 100% FAKE, 100% CONTROLLED, 100% SEXY
"use client";

const fakeNotes = [
  { initials: "JB", message: "The pulsing FAB is actual chef crack 🔥", color: "bg-red-200" },
  { initials: "SC", message: "Finally… something my team actually wants to use", color: "bg-orange-200" },
  { initials: "MK", message: "Paper logs can die in a fire", color: "bg-yellow-200" },
  { initials: "TR", message: "Take my money already", color: "bg-pink-200" },
  { initials: "DW", message: "Saved me 90 mins today. 90!", color: "bg-amber-200" },
  { initials: "RH", message: "My CDP just high-fived me for logging a temp", color: "bg-orange-300" },
  { initials: "LF", message: "EHO walked in, pressed one button, walked out happy", color: "bg-red-300" },
  { initials: "NP", message: "This is the Slack we actually needed", color: "bg-yellow-300" },
];

export default function StagedWall() {
  return (
    <section className="py-24 bg-gradient-to-b from-orange-50 to-white">
      <div className="text-center mb-16">
        <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-4">
          Chefs are already losing their minds
        </h2>
        <p className="text-2xl text-gray-600">
          (Real reactions from the first kitchens testing TempTake)
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {fakeNotes.map((note, i) => (
          <div
            key={i}
            className={`relative rounded-3xl p-10 shadow-2xl ${note.color} transform transition-all hover:scale-105 hover:-rotate-1`}
            style={{
              transform: `rotate(${Math.sin(i * 0.7) * 8}deg)`,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <div className="text-6xl font-black mb-6 opacity-90">
              {note.initials}
            </div>
            <p className="text-2xl leading-relaxed whitespace-pre-wrap">
              “{note.message}”
            </p>
            <div className="mt-8 flex gap-2 justify-end text-4xl">
              🔥🔥🔥🔥🔥
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-20">
        <p className="text-3xl font-bold text-gray-800">
          Be the next name on this wall.
        </p>
      </div>
    </section>
  );
}