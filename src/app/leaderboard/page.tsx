"use client";

import React from "react";
import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">
        Leaderboard
      </h1>
      <p className="mb-4 text-sm text-slate-600">
        See who’s topping the charts for completed cleaning tasks and logged
        temperatures.
      </p>
      <Leaderboard />
    </div>
  );
}
