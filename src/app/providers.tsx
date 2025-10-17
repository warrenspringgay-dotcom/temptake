"use client";
import { SettingsProvider } from "@/contexts/SettingsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Add more providers here if needed (Theme, QueryClient, etc.)
  return <SettingsProvider>{children}</SettingsProvider>;
}
