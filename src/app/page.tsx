// src/app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button"; // or just use <a> if you don’t have shadcn

export const metadata = {
  title: "TempTake • Food Safety That Doesn’t Suck",
  description: "Log temps in 3 seconds. HACCP app chefs actually love.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* HERO */}
      <section className="px-6 py-24 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
          Log a fridge temp in <span className="text-orange-500">3 seconds</span>.
          <br />
          No clipboard. No bullshit.
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-2xl mx-auto">
          The food-safety app your chefs will fight over. Built for busy kitchens that hate paperwork.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="mailto:hello@temptake.com?subject=TempTake Waitlist">
            <button className="px-10 py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all">
              Start Free Trial – No Card Needed
            </button>
          </Link>
          <Link href="/wall">
            <button className="px-8 py-6 bg-white text-orange-600 border-4 border-orange-500 text-xl font-bold rounded-full hover:bg-orange-50 transition-all">
              See the Kitchen Wall →
            </button>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-gray-600">
          <div>★ 4.9/5 from 127 kitchens</div>
          <div>1.2M+ temps logged</div>
          <div>Zero critical violations</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-gray-500 text-sm">
        © 2025 TempTake • Built for chefs who hate paperwork •{" "}
        <a href="mailto:hello@temptake.com" className="underline">
          hello@temptake.com
        </a>
      </footer>
    </main>
  );
}