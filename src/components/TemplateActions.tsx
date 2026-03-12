// src/components/TemplateActions.tsx
"use client";

import React from "react";

type TemplateActionsProps = {
  pdfHref: string;
  printHref: string;
};

export default function TemplateActions({
  pdfHref,
  printHref,
}: TemplateActionsProps) {
  const handlePrint = () => {
    if (typeof window === "undefined") return;

    const printUrl = `${printHref}?autoprint=1`;
    const popup = window.open(printUrl, "_blank", "noopener,noreferrer");

    if (!popup) {
      window.location.href = printUrl;
    }
  };

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <a
        href={pdfHref}
        download
        className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Download PDF
      </a>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Print template
      </button>
    </div>
  );
}