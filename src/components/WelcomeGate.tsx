// src/components/WelcomeGate.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import WelcomePopup from "@/components/WelcomePopup";

export default function WelcomeGate() {
  const { user, ready } = useAuth();

  if (!ready || !user) return null;

  return <WelcomePopup user={user} />;
}
