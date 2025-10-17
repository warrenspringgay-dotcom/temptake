"use client";

import { useRouter } from "next/navigation";

export default function TryAgainButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
    >
      Try again
    </button>
  );
}
