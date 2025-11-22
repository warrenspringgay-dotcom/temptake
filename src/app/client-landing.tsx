// src/app/client-landing.tsx  ← CLIENT COMPONENT (wall + hover + scroll)
"use client";

export default function ClientLanding() {
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
              href="mailto:info@temptake.com?subject=TempTake Founding Chef – Put me on the list!&body=Hey!%0A%0AI’m in.%0A%0ARestaurant name:%0ANumber of sites:%0AMy role:%0A%0ATell me when it’s ready →"
              className="group relative inline-flex items-center gap-4 px-12 py-7 bg-gradient-to-r from-orange-500 to-red-600 text-white text-2xl font-black rounded-full shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span>Get Lifetime Free Access (First 100 only)</span>
              <span className="text-3xl group-hover:translate-x-2 transition-transform">→</span>
            </a>

            <button
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
              className="px-10 py-7 bg-white/90 backdrop-blur border-4 border-orange-500 text-orange-600 text-xl font-bold rounded-full hover:bg-orange-50 transition-all cursor-pointer"
            >
              See What Chefs Are Saying ↓
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-gray-600 text-lg">
            <div className="flex items-center gap-2">★ 4.9/5 from beta kitchens</div>
            <div>1.4M+ temps logged</div>
            <div>Zero critical violations</div>
            <div>Built in the UK</div>
          </div>
        </div>

        <div className="absolute bottom-10 right-10 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-75" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-5xl font-black text-white shadow-2xl">
              +
            </div>
          </div>
        </div>
      </section>

      {/* WALL AT BOTTOM — FULLY CLIENT-SIDE, FULLY SEXY */}
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
          {[
            { initials: "JB", message: "The pulsing FAB is actual chef crack 🔥", color: "bg-red-200" },
            { initials: "SC", message: "Finally… something my team actually wants to use", color: "bg-orange-200" },
            { initials: "MK", message: "Paper logs can die in a fire", color: "bg-yellow-200" },
            { initials: "TR", message: "Take my money already", color: "bg-pink-200" },
            { initials: "DW", message: "Saved me 90 mins today. 90!", color: "bg-amber-200" },
            { initials: "RH", message: "My CDP just high-fived me for logging a temp", color: "bg-orange-300" },
            { initials: "LF", message: "EHO walked in, pressed one button, walked out happy", color: "bg-red-300" },
            { initials: "NP", message: "This is the Slack we actually needed", color: "bg-yellow-300" },
          ].map((note, i) => (
            <div
              key={i}
              className={`relative rounded-3xl p-10 shadow-2xl ${note.color} transform transition-all hover:scale-105 hover:-rotate-1`}
              style={{
                transform: `rotate(${Math.sin(i * 0.7) * 8}deg)`,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              }}
            >
              <div className="text-6xl font-black mb-6 opacity-90">{note.initials}</div>
              <p className="text-2xl leading-relaxed whitespace-pre-wrap">“{note.message}”</p>
              <div className="mt-8 flex gap-2 justify-end text-4xl">🔥🔥🔥🔥🔥</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-20">
          <p className="text-3xl font-bold text-gray-800">Be the next name on this wall.</p>
        </div>
      </section>

      <footer className="py-16 text-center text-gray-500 bg-white">
        <p className="text-lg mb-4">© 2025 TempTake • Made with 🔥 for chefs who hate paperwork</p>
        <p>
          <a href="mailto:info@temptake.com" className="text-orange-600 underline hover:text-orange-700">
            info@temptake.com
          </a>
        </p>
      </footer>
    </>
  );
}