// src/app/client-landing.tsx  ← MOBILE GOD MODE ACTIVATED
"use client";

import { Plus, Flame } from "lucide-react";

export default function ClientLanding() {
  return (
    <>
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-32 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 overflow-x-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid-orange-500/5 pointer-events-none" />

        <div className="relative z-10 w-full max-w-md text-center space-y-10">
          {/* LAUNCH BADGE — PERFECTLY CENTERED, NO OVERFLOW */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 rounded-full bg-white shadow-2xl px-8 py-5 border-4 border-orange-300">
            <span className="text-2xl font-black text-orange-600">Launching 2025</span>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
                <div className="relative h-4 w-4 rounded-full bg-green-500" />
              </div>
              <span className="text-lg font-bold text-gray-700">200+ kitchens waiting</span>
            </div>
          </div>

          {/* H1 — CLEAN & CENTERED */}
          <h1 className="text-6xl font-black text-gray-900 leading-tight">
            Log a fridge temp<br />
            in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 text-7xl">
              3 seconds flat
            </span>
          </h1>

          <p className="text-xl text-gray-700 font-medium">
            No clipboards. No stress.<br />
            <span className="font-black text-orange-600">Just chef joy.</span>
          </p>

          {/* MAIN CTA — FULLY VISIBLE, PERFECT BORDER, NO CROPPING */}
          <a
            href="mailto:founders@temptake.com?subject=Founding Chef – Lock me in&body=Name:%0ARestaurant:%0ASites:%0ARole:%0A%0AI’m ready for lifetime free."
            className="group relative block w-full"
          >
            <div className="relative mx-auto w-full max-w-xs">
              {/* Pulse glow */}
              <div className="absolute -inset-6 rounded-full bg-orange-500/50 animate-ping" />
              
              {/* Main button — clean border, full visibility */}
              <div className="relative flex items-center justify-center gap-6 px-10 py-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-full shadow-2xl border-8 border-orange-300 overflow-visible">
                <div className="text-white text-4xl font-black leading-tight text-center">
                  Lifetime<br />
                  <span className="text-5xl">Free Access</span>
                </div>
                <Flame className="h-16 w-16 text-yellow-300 animate-pulse" />
              </div>

              {/* Scarcity badge — perfectly placed, never cropped */}
              <div className="absolute -top-8 right-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-2xl animate-bounce border-4 border-white">
                <span className="text-4xl font-black text-red-600">73</span>
              </div>
            </div>
          </a>

          {/* Secondary button */}
          <button
            onClick={() => document.querySelector('#chef-wall')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full max-w-xs mx-auto px-8 py-12 bg-white rounded-full border-8 border-orange-500 text-orange-600 text-2xl font-black shadow-xl hover:bg-orange-50 transition-all"
          >
            See What Chefs Are Saying ↓
          </button>

          {/* Social proof — tight & clean */}
          <div className="space-y-4 text-lg font-bold">
            <div className="text-gray-800">★ 4.9/5 from beta kitchens</div>
            <div className="text-orange-600">1.4M+ temps logged</div>
            <div className="text-emerald-600">Zero critical violations</div>
            <div className="text-gray-700">Built in the UK</div>
          </div>
        </div>

        {/* FAB — 100% VISIBLE, CLICKABLE, NEVER CROPPED */}
        <button
          onClick={() => window.location.href = "mailto:founders@temptake.com"}
          className="fixed bottom-8 right-6 z-50"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-70" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-600 to-red-600 shadow-2xl">
              <Plus className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 shadow-xl animate-bounce border-4 border-white">
              <span className="text-3xl font-black text-red-600">73</span>
            </div>
          </div>
        </button>
      </section>

      {/* Keep your chef wall — it's perfect */}
      <section id="chef-wall" className="py-32 bg-white">
        {/* ... your existing chef wall ... */}
      </section>
    </>
  );
}