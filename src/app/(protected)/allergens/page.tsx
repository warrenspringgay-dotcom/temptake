// src/app/(protected)/allergens/page.tsx
"use client";
import React from "react";
import AllergenMatrix from "@/components/AllergenMatrix";

export default function AllergenPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-3 sm:px-4 py-4">
      <AllergenMatrix />
    </div>
  );
}
