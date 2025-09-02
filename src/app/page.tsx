// src/app/page.tsx
import React from "react";
import Providers from "../components/Providers";
import FoodTempLogger from "@/components/FoodTempLogger";


export default function Home() {
  return (
    // Redundant extra wrap to guarantee context on the home page.
    <Providers>
      
      <FoodTempLogger />
    </Providers>
  );
}
