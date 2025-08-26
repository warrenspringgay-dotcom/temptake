"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";

export default function ThemeClient() {
  const { settings } = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    const lang = (settings.language || "en-GB").split(",")[0];
    root.setAttribute("lang", lang);

    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const effectiveDark = settings.theme === "dark" || (settings.theme === "system" && prefersDark);
    root.classList.toggle("dark", !!effectiveDark);
  }, [settings.theme, settings.language]);
  return null;
}
