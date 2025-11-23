// src/app/client-landing.tsx  ← NOW 100% CRACK
"use client";

import { Plus } from "lucide-react";

export default function ClientLanding() {
  return (
    <>
      {/* HERO — PURE DOPAMINE */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-grid-orange-500/10 animate-pulse-slow pointer-events-none" />

        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          {/* Badge — now bounces and pulses */}
          <div className="mb-12 inline-flex items-center gap-4 rounded-full bg-white/95 backdrop-blur-xl px-8 py-5 shadow-2xl border-4 border-orange-300 animate-bounce-slow">
            <span className="text-2xl font-black text-orange-600">Launching 2025</span>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
              <div className="relative h-5 w-5 rounded-full bg-green-500" />
            </div>
            <span className="text-xl font-bold text-gray-700">200+ kitchens waiting</span>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-gray-900 mb-8 leading-none">
            Log a fridge temp<br />
            in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 drop-shadow-2xl animate-gradient-x">3 seconds flat</span>.
          </h1>

          <p className="text-2xl md:text-3xl text-gray-700 mb-16 max-w-4xl mx-auto leading-relaxed">
            No clipboards. No forgotten logs. No EHO heart attacks.<br />
            <span className="font-black text-orange-600">Just the app your chefs will fight to use.</span>
          </p>

          {/* BUTTONS — NOW IMPOSSIBLE TO IGNORE */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-20">
            {/* MAIN CTA — BIGGER, BOLDER, PULSING */}
            <a
              href="mailto:founders@temptake.com?subject=TempTake Founding Chef – I’m in!&body=Hey legends,%0A%0APut me down for lifetime free.%0A%0ARestaurant:%0ASites:%0ARole:%0A%0ACan’t wait →"
              className="group relative inline-flex items-center gap-6 px-16 py-10 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white text-3xl md:text-4xl font-black rounded-full shadow-3xl hover:shadow-orange-500/80 transform hover:scale-110 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              {/* Animated shine */}
              <div className="absolute inset-0 bg-white/20 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
              
              <span>Get Lifetime Free Access</span>
              <span className="text-5xl group-hover:translate-x-4 transition-transform duration-300">→</span>

              {/* Scarcity badge — now on the button */}
              <span className="absolute -top-4 -right-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-2xl font-black text-red-600 shadow-2xl animate-bounce">
                73 left
              </span>
            </a>

            {/* Secondary button — now sexier */}
            <button
              onClick={() => document.querySelector('#chef-wall')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-12 py-8 bg-white/95 backdrop-blur-xl border-8 border-orange-500 text-orange-600 text-2xl font-black rounded-full hover:bg-orange-50 hover:border-orange-600 transform hover:scale-105 transition-all duration-300 shadow-2xl flex items-center gap-4"
            >
              See What Chefs Are Saying
              <span className="text-4xl">↓</span>
            </button>
          </div>

          {/* Social proof — now with fire */}
          <div className="flex flex-wrap justify-center gap-12 text-2xl font-bold text-gray-700">
            <div className="flex items-center gap-3">★ 4.9/5 from beta kitchens</div>
            <div className="text-orange-600">1.4M+ temps logged</div>
            <div className="text-emerald-600">Zero critical violations</div>
            <div>Built in the UK</div>
          </div>
        </div>

        {/* INSANE PULSING FAB — THE FINAL BOSS */}
        <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
          <div className="relative">
            {/* Triple pulse rings */}
            <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-75" style={{ animationDuration: '1.8s' }} />
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" style={{ animationDuration: '2.2s', animationDelay: '0.3s' }} />
            <div className="absolute inset-0 rounded-full bg-orange-600 animate-ping opacity-40" style={{ animationDuration: '2.8s', animationDelay: '0.6s' }} />

            {/* Main button */}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 text-white shadow-3xl animate-pulse">
              <Plus className="h-16 w-16 animate-spin-slow" />
            </div>

            {/* Floating scarcity badge */}
            <div className="absolute -top-4 -right-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-2xl font-black text-red-600 shadow-2xl animate-bounce">
              73
            </div>
          </div>
        </div>
      </section>

      {/* CHEF WALL — NOW A DOPAMINE EXPLOSION */}
      <section id="chef-wall" className="py-32 bg-gradient-to-b from-orange-50 via-white to-orange-50">
        <div className="text-center mb-20">
          <h2 className="text-6xl md:text-8xl font-black text-gray-900 mb-6">
            Chefs are already <span className="text-orange-600">losing their minds</span>
          </h2>
          <p className="text-3xl text-gray-600 font-bold">
            Real reactions from the first 200 kitchens testing TempTake
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          {[
            { initials: "JB", message: "The wall is actual chef crack 🔥", color: "bg-red-300", emoji: "🤯" },
            { initials: "SC", message: "Finally… something my team actually wants to use", color: "bg-orange-300", emoji: "😭" },
            { initials: "MK", message: "Paper logs are So 2024", color: "bg-yellow-300", emoji: "🪦" },
            { initials: "TR", message: "Take my money already", color: "bg-pink-300", emoji: "🤑" },
            { initials: "DW", message: "Saved me 2 hours a day", color: "bg-amber-300", emoji: "⏰" },
            { initials: "RH", message: "My team love the gamification", color: "bg-orange-400", emoji: "🎮" },
            { initials: "LF", message: "EHO walked in, pressed one button, walked out happy", color: "bg-red-400", emoji: "😎" },
            { initials: "NP", message: "This is the app we actually needed", color: "bg-yellow-400", emoji: "💯" },
            { initials: "GM", message: "My CDP actually smiled today", color: "bg-purple-300", emoji: "🥹" },
          ].map((note, i) => (
            <div
              key={i}
              className={`relative rounded-3xl p-12 shadow-3xl ${note.color} transform transition-all duration-500 hover:scale-110 hover:-rotate-3 hover:z-10 group`}
              style={{
                transform: `rotate(${Math.sin(i * 0.8) * 12}deg) translateY(${Math.cos(i * 0.5) * 20}px)`,
                animation: `float ${6 + i * 0.5}s ease-in-out infinite`,
              }}
            >
              <div className="text-8xl font-black mb-8 opacity-90">{note.initials}</div>
              <p className="text-3xl leading-tight font-bold whitespace-pre-wrap">“{note.message}”</p>
              <div className="mt-10 text-6xl text-right">{note.emoji}</div>
              
              {/* Hidden fire on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          ))}
        </div>

        <div className="text-center mt-32">
          <p className="text-5xl md:text-7xl font-black text-gray-900">
            Be the next name on this wall.
          </p>
          <p className="text-3xl text-orange-600 mt-8 font-black animate-pulse">
            73 spots left → claim yours before they’re gone.
          </p>
        </div>
      </section>

      {/* Add these animations to your globals */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(var(--rotate, 0deg)); }
          50% { transform: translateY(-20px) rotate(var(--rotate, 0deg)); }
        }
        @keyframes animate-gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ping-slow {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: animate-gradient-x 4s ease infinite;
        }
        .animate-pulse-slow { animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-bounce-slow { animation: bounce-slow 3s infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
      `}</style>
    </>
  );
}