// src/app/page.tsx
"use client";

import Link from "next/link";

import StagedWall from "./launch-wall";

{/* ...rest of your hero... */}

<StagedWall />


export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid-orange-500/5 pointer-events-none" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex-1 flex flex-col justify-center">
          {/* Scarcity banner */}
          <div className="mb-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg rounded-full px-8 inline-block">
            ⚡ First 100 chefs get lifetime free · <span className="underline">73 spots left</span>
          </div>

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-white/80 backdrop-blur px-6 py-3 shadow-lg">
            <span className="text-orange-600 font-bold">Launching 2025</span>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">Join 200+ kitchens on the waitlist</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 leading-tight">
            Log a fridge temp<br />
            in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">3 seconds</span>.
          </h1>

          <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto">
            No more clipboards. No more forgotten logs. No more EHO nightmares.<br />
            Just the food-safety app your chefs will actually <em>fight</em> to use.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <a
              href="mailto:info@temptake.com?subject=TempTake Founding Chef – Put me on the list!&body=Hey!%0A%0AI’m in.%0A%0ARestaurant name:%0ANumber of sites:%0AMy role:%0A%0ATell me when it’s ready →"
              className="group relative inline-flex items-center gap-4 px-12 py-7 bg-gradient-to-r from-orange-500 to-red-600 text-white text-2xl font-black rounded-full shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span>Get Lifetime Free Access (First 100 only)</span>
              <span className="text-3xl group-hover:translate-x-2 transition-transform">→</span>
            </a>

            <Link
              href="/wall"
              className="px-10 py-7 bg-white/90 backdrop-blur border-4 border-orange-500 text-orange-600 text-xl font-bold rounded-full hover:bg-orange-50 transition-all"
            >
              👀 Sneak Peek: The Kitchen Wall
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-gray-600 text-lg">
            <div className="flex items-center gap-2">★ 4.9/5 from beta kitchens</div>
            <div>1.4M+ temps logged</div>
            <div>Zero critical violations</div>
            <div>Built in the UK</div>
          </div>
        </div>

        {/* Floating FAB */}
        <div className="absolute bottom-10 right-10 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-75" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-5xl font-black text-white shadow-2xl">
              +
            </div>
          </div>
        </div>
      </section>

      {/* PUBLIC LAUNCH WALL */}
     import StagedWall from "./launch-wall";

{/* ...rest of your hero... */}

<StagedWall />

      {/* Footer */}
      <footer className="py-16 text-center text-gray-500 bg-white">
        <p className="text-lg mb-4">© 2025 TempTake • Made with 🔥 for chefs who hate paperwork</p>
        <p>
          <a
            href="mailto:info@temptake.com"
            className="text-orange-600 underline hover:text-orange-700"
          >
            info@temptake.com
          </a>
        </p>
      </footer>
    </>
  );
}