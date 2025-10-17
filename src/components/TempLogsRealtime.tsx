// src/components/TempLogsRealtime.tsx
"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
 // your existing client

export function useTempLogsRealtime(onChange: () => void) {
  useEffect(() => {
    const ch = supabase
      .channel("rt-temps")
      .on("postgres_changes", { event: "*", schema: "public", table: "food_temp_logs" }, () => onChange())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [onChange]);
}
