// src/hooks/useInitials.ts
"use client";

import { useEffect, useState } from "react";
import { getLoggedInUserInitials } from "@/lib/getMyInitials";

export function useInitials(allInitials: string[]) {
  const [preferred, setPreferred] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ini = await getLoggedInUserInitials();
      if (ini) setPreferred(ini);
    })();
  }, []);

  if (!preferred) return allInitials;

  // Move preferred initials to front
  return [preferred, ...allInitials.filter((i) => i !== preferred)];
}
