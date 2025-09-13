// src/components/ThemeClient.tsx
"use client";

import { useEffect } from "react";

export default function ThemeClient() {
  useEffect(() => {
    // pick up saved theme/lang or defaults
    const theme = (localStorage.getItem("theme") || "light").toLowerCase();
    const lang = (localStorage.getItem("lang") || "en").toLowerCase();

    // apply to <html>
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("lang", lang);
  }, []);

  return null;
}
