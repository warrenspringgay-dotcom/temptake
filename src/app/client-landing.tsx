// src/app/client-landing.tsx  ← THIS IS CRACK FOR CHEFS
"use client";

import { Plus, Flame, Zap, Crown } from "lucide-react";

export default function ClientLanding() {
  return (
    <>
      {/* HERO — CHEF DOPAMINE OVERLOAD */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-red-50 to-amber-50 overflow-hidden">
        {/* Animated fire grid */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-red-600/20 to-orange-600/20 animate-pulse" />
          <div className="absolute inset-0 bg-grid-orange-900/20 animate-pulse-slow" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-7xl mx-auto">
          {/* TOP BADGE — NOW ON FIRE */}
          <div className="mb-12 inline-flex items-center gap-6 rounded-full bg-black/90 backdrop-blur-2xl px-10 py-6 shadow-2xl border-4 border-orange-500 animate-bounce">
            <Flame className="h-10 w-10 text-orange-500 animate-pulse" />
            <span className="text-3xl font-black text-white">LAUNCHING 2025</span>
            <Zap className="h-10 w-10 text-yellow-400 animate-ping" />
            <span className="text-2xl font-black text-orange-400">200+ kitchens locked in</span>
            <Crown className="h-10 w-10 text-yellow-400" />
          </div>

          <h1 className="text-7xl md:text-9xl lg:text-[10rem] font-black text-gray-900 mb-8 leading-none tracking-tighter">
            LOG A TEMP<br />
            IN <span className="relative inline-block">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-orange-700 drop-shadow-2xl animate-gradient-x">
                3 SECONDS
              </span>
              <span className="absolute inset-0 text-orange-600 blur-xl opacity-70 animate-pulse">3 SECONDS</span>
            </span>
            <br />
            <span className="text-5xl md:text-7xl text-orange-600">AND YOUR CHEFS WILL LOVE YOU</span>
          </h1>

          <p className="text-3xl md:text-5xl text-gray-800 mb-20 max-w-5xl mx-auto leading-tight font-bold">
            No clipboards. No drama. No EHO nightmares.<br />
            <span className="text-red-600">Just pure, unfiltered chef joy.</span>
          </p>

          {/* CTA SECTION — IMPOSSIBLE TO MISS */}
          <div className="relative">
            {/* MAIN BUTTON — THE FINAL BOSS OF CTAS */}
            <a
              href="mailto:founders@temptake.com?subject=I NEED THIS NOW&body=Put me down for lifetime free.%0A%0AName:%0ARestaurant:%0ASites:%0ARole:%0A%0AI’m ready to ditch paper forever."
              className="group relative inline-flex items-center gap-8 px-24 py-16 bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 text-white text-5xl md:text-7xl font-black rounded-full shadow-4xl hover:shadow-orange-600/80 transform hover:scale-110 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              {/* Triple shine sweep */}
              <div className="absolute inset-0 bg-white/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1200" />
              <div className="absolute inset-0 bg-white/20 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1500 delay-100" />
              <div className="absolute inset-0 bg-white/10 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-2000 delay-200" />

              <span className="relative z-10 drop-shadow-2xl">CLAIM LIFETIME FREE</span>
              <Flame className="h-20 w-20 text-yellow-400 animate-pulse" />
              <span className="text-8xl group-hover:translate-x-8 transition-transform duration-300">→</span>

              {/* SCARCITY BOMB — CAN’T LOOK AWAY */}
              <div className="absolute -top-8 -right-8 flex h-32 w-32 items-center justify-center rounded-full bg-yellow-400 shadow-2xl animate-bounce">
                <div className="text-center">
                  <div className="text-6xl font-black text-red-600 leading-none">73</div>
                  <div className="text-2xl font-black text-red-700">LEFT</div>
                </div>
              </div>
            </a>

            {/* Secondary button */}
            <button
              onClick={() => document.querySelector('#chef-wall')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-12 px-16 py-10 bg-white/95 backdrop-blur-xl border-8 border-orange-600 text-orange-600 text-4xl font-black rounded-full hover:bg-orange-50 transform hover:scale-105 transition-all duration-300 shadow-3xl flex items-center gap-6 mx-auto"
            >
              <span>See The Chef Wall</span>
              <Zap className="h-16 w-16 text-yellow-500 animate-pulse" />
              <span className="text-7xl">↓</span>
            </button>
          </div>

          {/* Social proof — now with fire */}
          <div className="mt-24 flex flex-wrap justify-center gap-16 text-3xl font-black text-gray-800">
            <div className="flex items-center gap-4"><span className="text-5xl">★</span> 4.9/5 beta kitchens</div>
            <div className="text-orange-600 flex items-center gap-4"><Flame className="h-12 w-12" /> 1.4M+ temps logged</div>
            <div className="text-emerald-600">Zero critical violations</div>
            <div className="flex items-center gap-4"><span className="text-5xl">🇬🇧</span> Built in the UK</div>
          </div>
        </div>

        {/* INSANE PULSING FAB — THE ONE THAT BROKE THE INTERNET */}
        <div className="fixed bottom-8 right-8 z-50">
          <div className="relative">
            {/* Nuclear pulse rings */}
            {[1, 1.4, 1.8].map((scale, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full bg-orange-500 animate-ping"
                style={{
                  animationDuration: `${1.5 + i * 0.5}s`,
                  animationDelay: `${i * 0.2}s`,
                  transform: `scale(${scale})`,
                  opacity: 0.8 - i * 0.3,
                }}
              />
            ))}

            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 shadow-4xl animate-pulse">
              <Plus className="h-20 w-20 text-white animate-spin-slow" />
            </div>

            <div className="absolute -top-6 -right-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-2xl animate-bounce">
              <span className="text-5xl font-black text-red-600">73</span>
            </div>
          </div>
        </div>
      </section>

      {/* CHEF WALL — PURE CHEF CRACK */}
      <section id="chef-wall" className="py-40 bg-gradient-to-b from-orange-100 via-red-50 to-orange-100 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-red-600/30 to-orange-600/30 animate-pulse" />
        </div>

        <div className="text-center mb-32 relative z-10">
          <h2 className="text-7xl md:text-9xl font-black text-gray-900 mb-8 leading-none">
            CHEFS ARE LOSING<br />
            THEIR <span className="text-red-600 animate-pulse">FUCKING MINDS</span>
          </h2>
          <p className="text-4xl md:text-6xl font-black text-orange-600">
            Real quotes from the first 200 kitchens
          </p>
        </div>

        <div className="max-w-8xl mx-auto px-8 grid gap-16 md:grid-cols-2 lg:grid-cols-3">
          {[
            { initials: "JB", message: "This is chef crack. Actual crack.", emoji: "🤯🤯🤯", color: "bg-red-500 text-white" },
            { initials: "SC", message: "My team fights to log temps now", emoji: "⚔️", color: "bg-orange-500 text-white" },
            { initials: "MK", message: "Paper logs are dead. Bury them.", emoji: "🪦", color: "bg-yellow-500" },
            { initials: "TR", message: "Shut up and take my soul", emoji: "😈", color: "bg-pink-600 text-white" },
            { initials: "DW", message: "EHO came in. Pressed one button. Left happy.", emoji: "😎", color: "bg-emerald-600 text-white" },
            { initials: "RH", message: "My CDP smiled. I cried.", emoji: "🥹", color: "bg-purple-600 text-white" },
            { initials: "LF", message: "This app owes me nothing. I owe it everything.", emoji: "🙏", color: "bg-blue-600 text-white" },
            { initials: "NP", message: "I would die for this app", emoji: "☠️", color: "bg-black text-white" },
          ].map((note, i) => (
            <div
              key={i}
              className={`relative rounded-3xl p-16 shadow-4xl ${note.color} transform transition-all duration-700 hover:scale-125 hover:rotate-12 hover:z-50 group cursor-pointer`}
              style={{
                transform: `rotate(${Math.sin(i * 0.9) * 15}deg) translateY(${Math.cos(i * 0.6) * 40}px)`,
                animation: `float ${5 + i * 0.8}s ease-in-out infinite`,
              }}
            >
              <div className="text-9xl font-black mb-8 opacity-90">{note.initials}</div>
              <p className="text-5xl leading-tight font-black">“{note.message}”</p>
              <div className="mt-12 text-9xl text-right">{note.emoji}</div>
              
              {/* Fire overlay on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-600/50 to-red-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          ))}
        </div>

        <div className="text-center mt-40">
          <p className="text-7xl md:text-9xl font-black text-gray-900">
            YOUR NAME<br />
            GOES HERE
          </p>
          <p className="text-5xl text-red-600 mt-12 font-black animate-pulse">
            73 SPOTS LEFT → CLAIM BEFORE THEY’RE GONE
          </p>
        </div>
      </section>

      {/* Global animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--tw-rotate, 0deg)); }
          50% { transform: translateY(-40px) rotate(var(--tw-rotate, 0deg)); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 6s ease infinite;
        }
      `}</style>
    </>
  );
}