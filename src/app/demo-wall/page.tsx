// src/app/demo-wall/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import Script from "next/script";

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

export default function DemoWallPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 md:flex-row md:items-start md:justify-between">
        <div className="mb-2 text-center md:mb-0 md:text-left">
          <h1 className="mb-4 text-5xl font-black text-gray-900 md:text-7xl">
            Chefs are already losing their minds
          </h1>
          <p className="text-2xl text-gray-600">
            (Real reactions from the first kitchens testing TempTake)
          </p>
        </div>
<Script src="https://tally.so/widgets/embed.js" async />
<Link
  href="/"
  className="absolute right-4 top-4 rounded-full bg-black/40 backdrop-blur px-3 py-1 text-sm text-slate-200 hover:bg-black/60"
>
  ✕ Back
</Link>


        {/* CTA strip on the right */}
        <div className="flex flex-col items-center justify-center gap-2 text-xs md:items-end">
          <Link
            href="/app"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            View demo dashboard
          </Link>
          <button
                type="button"
                data-tally-open="obb4vX"
                data-tally-layout="modal"
                data-tally-emoji-text="👋"
                data-tally-emoji-animation="wave"
                data-tally-auto-close="0"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
              >
                Join the early access list
              </button>
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-2 lg:grid-cols-3">
        {fakeNotes.map((note, i) => (
          <div
            key={i}
            className={`relative transform rounded-3xl p-10 shadow-2xl ${note.color} transition-all hover:-rotate-1 hover:scale-105`}
            style={{
              transform: `rotate(${Math.sin(i * 0.7) * 8}deg)`,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <div className="mb-6 text-6xl font-black opacity-90">
              {note.initials}
            </div>
            <p className="text-2xl leading-relaxed whitespace-pre-wrap">
              “{note.message}”
            </p>
            <div className="mt-8 flex justify-end gap-2 text-4xl">
              🔥🔥🔥🔥🔥
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-20 max-w-4xl px-6 text-center">
        <p className="text-3xl font-bold text-gray-800">
          Be the next name on this wall.
        </p>
        <p className="mt-3 text-sm text-gray-600">
          This is a demo view only. To put your own team on the wall,{" "}
          <Link
            href="/launch#waitlist"
            className="font-semibold text-orange-700 underline underline-offset-2"
          >
            join the early access list
          </Link>{" "}
          and we&apos;ll invite you to a live TempTake account.
        </p>
      </div>
    </main>
  );
}
