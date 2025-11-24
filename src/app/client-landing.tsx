// src/app/client-landing.tsx  ← TALLY INTEGRATED. EMAILS INCOMING.
"use client";

import { Plus, Flame } from "lucide-react";

export default function ClientLanding() {
  return (
    <>
      {/* TALLY SCRIPT — ADD THIS ONCE IN layout.tsx <head> */}
      {/* <script src="https://tally.so/widgets/embed.js" async></script> */}

      {/* HERO — NOW CAPTURES REAL EMAILS */}
      <section className="relative min-h-screen flex flex-col items-center justify-between px-6 pt-20 pb-32 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-200/20 to-transparent pointer-events-none" />

        <div className="w-full max-w-md text-center space-y-10 z-10">
          {/* Launch Badge */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 rounded-full bg-white px-8 py-5 shadow-2xl border-4 border-orange-400">
            <span className="text-2xl font-black text-orange-600">Launching 2026</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
                <div className="relative h-4 w-4 rounded-full bg-green-500" />
              </div>
              <span className="text-lg font-bold text-gray-700">200+ kitchens waiting</span>
            </div>
          </div>

          <h1 className="text-6xl font-black leading-tight text-gray-900">
            Log a fridge temp<br />
            in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 text-7xl">
              3 seconds flat
            </span>
          </h1>

          <p className="text-xl text-gray-700 font-medium">
            No clipboards. No stress.<br />
            <span className="font-black text-orange-600">Just pure chef joy.</span>
          </p>

          {/* MAIN CTA — NOW OPENS YOUR TALLY FORM */}
          <button
            data-tally-open="obb4vX"
            data-tally-layout="modal"
            data-tally-emoji-text="🔥👋"
            data-tally-emoji-animation="wave"
            data-tally-auto-close="5000"
            className="group relative block w-full max-w-sm mx-auto"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-60" />
              
              <div className="relative px-12 py-16 bg-white rounded-full border-[14px] border-orange-500 shadow-2xl overflow-visible">
                <div className="text-orange-600 text-4xl font-black leading-tight">
                  Lifetime Free Access
                </div>
                <Flame className="absolute top-4 right-8 h-12 w-12 text-orange-500 animate-pulse" />
              </div>

              <div className="absolute -top-8 -right-8 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-2xl animate-bounce border-4 border-white">
                <span className="text-5xl font-black text-red-600">73</span>
              </div>
            </div>
          </button>

          {/* Secondary button */}
          <button
            onClick={() => document.querySelector('#chef-wall')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full max-w-lg mx-auto px-10 py-12 bg-white rounded-full border-8 border-orange-500 text-orange-600 text-2xl font-black shadow-xl hover:bg-orange-50 transition-all"
          >
            What Chefs Are Saying ↓
          </button>

          {/* Social proof */}
          <div className="space-y-4 text-center text-lg font-bold">
            <div className="text-gray-800">★ 4.9/5 from beta kitchens</div>
            <div className="text-orange-600">1.4M+ temps logged</div>
            <div className="text-emerald-600 Garrett">Zero critical violations</div>
            <div className="text-gray-700">Built in the UK</div>
          </div>
        </div>

        {/* FAB — NOW ALSO OPENS TALLY */}
        <button
          data-tally-open="obb4vX"
          data-tally-layout="modal"
          data-tally-emoji-text="🔥"
          data-tally-emoji-animation="wave"
          data-tally-auto-close="5000"
          className="fixed bottom-8 right-6 z-50"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-orange-600 animate-ping opacity-70" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-600 to-red-600 shadow-2xl hover:scale-110 transition-all">
              <Plus className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-4 -right-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 shadow-xl animate-bounce border-4 border-white">
              <span className="text-4xl font-black text-red-600">73</span>
            </div>
          </div>
        </button>
      </section>

      {/* CHEF WALL — UNCHANGED & STILL FIRE */}
      <section id="chef-wall" className="py-24 px-6 bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-4">
            Chefs are already <span className="text-orange-600">losing their minds</span>
          </h2>
          <p className="text-2xl text-gray-600 font-bold">
            Real reactions from the first kitchens testing TempTake
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            { initials: "JB", message: "The wall is actual chef crack 🔥", color: "bg-red-300" },
            { initials: "SC", message: "Finally… something my team actually wants to use", color: "bg-orange-300" },
            { initials: "MK", message: "Paper logs are So 2024", color: "bg-yellow-300" },
            { initials: "TR", message: "Take my money already", color: "bg-pink-300" },
            { initials: "DW", message: "Saved me 2 hours a day", color: "bg-amber-300" },
            { initials: "RH", message: "My team love the gamification", color: "bg-orange-400" },
            { initials: "LF", message: "EHO walked in, pressed one button, walked out happy", color: "bg-red-400" },
            { initials: "NP", message: "This is the app we actually needed", color: "bg-yellow-400" },
            { initials: "GM", message: "My CDP actually smiled today", color: "bg-purple-300" },
          ].map((note, i) => (
            <div
              key={i}
              className={`relative rounded-3xl p-10 shadow-2xl ${note.color} transform transition-all hover:scale-105 hover:-rotate-2 hover:z-10`}
              style={{ transform: `rotate(${Math.sin(i * 0.8) * 10}deg)` }}
            >
              <div className="text-7xl font-black mb-6 opacity-90">{note.initials}</div>
              <p className="text-2xl font-bold leading-tight">“{note.message}”</p>
              <div className="mt-6 text-5xl text-right">{"🔥".repeat(Math.floor(Math.random() * 3) + 3)}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-20">
          <p className="text-4xl md:text-6xl font-black text-gray-900">
            Be the next name on this wall.
          </p>
          <p className="text-2xl text-orange-600 mt-6 font-black animate-pulse">
            Only 73 lifetime free spots left →
          </p>
        </div>
      </section>
    </>
  );
}