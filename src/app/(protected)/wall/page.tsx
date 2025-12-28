// src/app/wall/page.tsx
import KitchenWall from "@/components/KitchenNoticeboard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Kitchen Wall • TempTake",
};

export default function KitchenWallPage() {
  return (
    <>
      {/* Professional Header */}
      <header className=" top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kitchen Wall</h1>
              <p className="text-sm text-gray-500">Team notices, shout-outs & quick updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              🧡
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-32">
        <KitchenWall />
      </main>
    </>
  );
}