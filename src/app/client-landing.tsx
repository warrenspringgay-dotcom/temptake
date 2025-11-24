// src/app/client-landing.tsx  ← FIXED + NUKED
"use client";

import { Plus, Flame } from "lucide-react";

export default function ClientLanding() {
  return (
    <>
      {/* HERO — FULLY MOBILE SAFE */}
      <section className="relative min-h-screen flex flex-col justify-center items-center px-6 py-24 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid-orange-500/10 animate-pulse-slow pointer-events-none" />

        <div className="relative z-10 w-full text-center max-w-6xl mx-auto space-y-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-4 rounded-full bg-white/95 backdrop-blur-xl px-8 py-5 shadow-2xl border-4 border-orange-300 animate-bounce">
            <span className="text-2xl font-black text-orange-600">Launching 2025</span>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
              <div className="relative h-5 w-5 rounded-full bg-green-500" />
            </div>
            <span className="text-xl font-bold text-gray-700">200+ kitchens waiting</span>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-gray-900 leading-tight">
            Log a fridge temp<br />
            in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 drop-shadow-2xl animate-gradient-x">3 seconds flat</span>.
          </h1>

          <p className="text-2xl md:text-3xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
            No clipboards. No forgotten logs. No EHO heart attacks.<br />
            <span className="font-black text-orange-600">Just the app your chefs will fight to use.</span>
          </p>

          {/* MAIN CTA — NOW 100% VISIBLE ON ALL DEVICES */}
          <div className="relative w-full max-w-4xl mx-auto">
            <a
              href="mailto:founders@temptake.com?subject=TempTake Founding Chef – I’m in!&body=Hey legends,%0A%0APut me down for lifetime free.%0A%0ARestaurant:%0ASites:%0ARole:%0A%0ACan’t wait →"
              className="group relative block w-full"
            >
              {/* Pulse rings — bigger, centered, never cropped */}
              <div className="absolute -inset-8 md:-inset-12 rounded-full bg-orange-500 animate-ping opacity-70" />
              <div className="absolute -inset-10 md:-inset-16 rounded-full bg-red-500 animate-ping opacity-50 delay-300" />

              {/* THE BUTTON — FULL WIDTH, NO OVERFLOW, PERFECT */}
              <div className="relative flex items-center justify-between px-12 py-16 md:py-20 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 rounded-full shadow-3xl transform transition-all duration-300 hover:scale-105 active:scale-95 overflow-visible">
                <div className="text-white text-4xl md:text-6xl font-black leading-tight text-left">
                  Get Lifetime<br />
                  <span className="text-5xl md:text-7xl">Free Access</span>
                </div>

                <div className="flex items-center gap-6">
                  <Flame className="h-16 w-16 md:h-20 md:w-20 text-yellow-400 animate-pulse" />
                  <span className="text-7xl md:text-9xl text-white font-black group-hover:translate-x-8 transition-transform duration-500">
                    →
                  </span>
                </div>

                {/* SCARCITY BADGE — ALWAYS VISIBLE */}
                <div className="absolute -top-10 -right-10 md:-top-14 md:-right-14 flex h-24 w-24 md:h-32 md:w-32 items-center justify-center rounded-full bg-yellow-400 shadow-3xl animate-bounce">
                  <div className="text-center">
                    <div className="text-5xl md:text-7xl font-black text-red-600 leading-none">73</div>
                    <div className="text-lg md:text-2xl font-black text-red-700">LEFT</div>
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* Secondary button */}
          <button
            onClick={() => document.querySelector('#chef-wall')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-12 py-10 bg-white/95 backdrop-blur-xl border-8 border-orange-500 text-orange-600 text-2xl md:text-3xl font-black rounded-full hover:bg-orange-50 hover:border-orange-600 transform hover:scale-105 transition-all duration-300 shadow-2xl"
          >
            See What Chefs Are Saying ↓
          </button>

          {/* Social proof */}
          <div className="flex flex-wrap justify-center gap-12 text-2xl font-bold text-gray-700 mt-16">
            <div className="flex items-center gap-3">★ 4.9/5 from beta kitchens</div>
            <div className="text-orange-600">1.4M+ temps logged</div>
            <div className="text-emerald-600">Zero critical violations</div>
            <div>Built in the UK</div>
          </div>
        </div>

        {/* FAB — NOW CLICKABLE + PERFECTLY PLACED */}
        <button
          onClick={() => window.location.href = "mailto:founders@temptake.com"}
          className="fixed bottom-8 right-8 z-50 group"
        >
          <div className="relative">
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-75" />
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60 delay-300" />

            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 shadow-3xl group-hover:scale-110 transition-all duration-300">
              <Plus className="h-16 w-16 text-white" />
            </div>

            <div className="absolute -top-6 -right-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 shadow-2xl animate-bounce">
              <span className="text-4xl font-black text-red-600">73</span>
            </div>
          </div>
        </button>
      </section>

      {/* CHEF WALL — UNTOUCHED & PERFECT */}
      <section id="chef-wall" className="py-32 bg-gradient-to-b from-orange-50 via-white to-orange-50">
        {/* ... your existing chef wall code — it's already fire ... */}
      </section>

      {/* ANIMATIONS */}
      <style jsx global>{`
        @keyframes animate-gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: animate-gradient-x 4s ease infinite;
        }
        .animate-pulse-slow { animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </>
  );
}