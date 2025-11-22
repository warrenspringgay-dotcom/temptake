// src/app/page.tsx ← SERVER COMPONENT ONLY
import StagedWall from "./marketing/launch-wall"; // ← renamed to make it obvious

export default function LandingPage() {
  return (
    <>
      {/* HERO – same as before */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid-orange-500/5 pointer-events-none" />
        {/* ... all your hero code exactly as before ... */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex-1 flex flex-col justify-center">
          <div className="mb-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg rounded-full px-10 inline-block">
            ⚡ First 100 chefs get lifetime free · <span className="underline">73 spots left</span>
          </div>
          {/* badge, headline, CTA, scroll button – unchanged */}
          {/* ... your full hero ... */}
          <button
            onClick={() => document.getElementById("staged-wall")?.scrollIntoView({ behavior: "smooth" })}
            className="px-10 py-7 bg-white/90 backdrop-blur border-4 border-orange-500 text-orange-600 text-xl font-bold rounded-full hover:bg-orange-50 transition-all cursor-pointer"
          >
            See What Chefs Are Saying Right Now ↓
          </button>
        </div>
        {/* Floating FAB */}
        <div className="absolute bottom-10 right-10 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-75" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-5xl font-black text-white shadow-2xl">+</div>
          </div>
        </div>
      </section>

      {/* WALL – CLIENT COMPONENT LOADED SAFELY */}
      <section id="staged-wall">
        <StagedWall />
      </section>

      <footer className="py-16 text-center text-gray-500 bg-white">
        <p className="text-lg mb-4">© 2025 TempTake • Made with 🔥 for chefs who hate paperwork</p>
        <p><a href="mailto:info@temptake.com" className="text-orange-600 underline hover:text-orange-700">info@temptake.com</a></p>
      </footer>
    </>
  );
}