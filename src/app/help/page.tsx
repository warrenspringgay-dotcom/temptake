// src/app/(protected)/help/page.tsx
"use client";

import React from "react";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-xl font-semibold">Help</h1>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-base font-semibold">Quick start</div>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Add your team and supplier details.</li>
          <li>Build temperature routines, then run them daily.</li>
          <li>Maintain your allergen matrix and review regularly.</li>
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-base font-semibold">FAQ</div>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><strong>How do I import allergen data?</strong> Use “Import to Supabase (CSV)” in Allergen Matrix.</li>
            <li><strong>Why is a modal off screen?</strong> On mobile, all modals are scrollable; ensure browser zoom is 100%.</li>
            <li><strong>Where do failures show?</strong> In Temperature Logs; use filters and status badges.</li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-base font-semibold">Support</div>
          <p className="mb-2 text-sm text-gray-600">
            Need help? Email <a className="text-blue-600 underline" href="mailto:support@temptake.app">support@temptake.app</a>
          </p>
          <p className="text-sm text-gray-600">Mon–Fri, 9:00–17:00 (UK time).</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-base font-semibold">How-to videos (soon)</div>
        <p className="text-sm text-gray-600">We’ll add short clips covering routines, logs, allergens, and reports.</p>
      </div>
    </div>
  );
}
