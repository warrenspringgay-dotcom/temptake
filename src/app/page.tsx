// src/app/page.tsx  ← FINAL, NO-ERROR, BEAUTIFUL LANDING PAGE
import Link from "next/link";

export const metadata = {
  title: "TempTake • Food Safety That Doesn’t Suck",
  description: "Log temps in 3 seconds. The HACCP app your chefs will actually love.",
};

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid-orange-500/5 pointer-events-none" />
        
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
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
              href="mailto:info@temptake.com?subject=TempTake Waitlist – Put me first!&body=Hey! I want in before everyone else.%0A%0ARestaurant name:%0ANumber of locations:%0AMy role:"
              className="group relative inline-flex items-center gap-4 px-12 py-7 bg-gradient-to-r from-orange-500 to-red-600 text-white text-2xl font-black rounded-full shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span>Get Early Access – Free Forever for First 2025</span>
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

        {/* Floating FAB preview with slow pulse */}
        <div className="absolute bottom-10 right-10 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-75" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-5xl font-black text-white shadow-2xl">
              +
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-gray-500">
        <p className="text-lg mb-4">© 2025 TempTake • Made with 🔥 for chefs who hate paperwork</p>
        <p>
          <a href="mailto:hello@temptake.com" className="underline hover:text-orange-600">
            info@temptake.com
          </a>
        </p>
      </footer>
    </>
  );
}