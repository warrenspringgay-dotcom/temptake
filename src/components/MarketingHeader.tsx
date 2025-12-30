"use client";

import React from "react";
import { useAuth } from "@/components/AuthProvider";
import MarketingNav from "@/components/MarketingNav";

export default function MarketingHeader() {
  const { user } = useAuth();
  return <MarketingNav signedIn={!!user} />;
}
