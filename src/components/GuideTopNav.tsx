// src/components/GuideTopNav.tsx
import Link from "next/link";

export default function GuideTopNav() {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Link
        href="/guides"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white"
      >
        <span aria-hidden="true">←</span>
        Back to Guides
      </Link>

      <Link
        href="/guides"
        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        Guides index
      </Link>
    </div>
  );
}
