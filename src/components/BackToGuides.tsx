// src/components/BackToGuides.tsx
import Link from "next/link";

export default function BackToGuides() {
  return (
    <Link
      href="/guides"
      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
    >
      ← Back to guides
    </Link>
  );
}
