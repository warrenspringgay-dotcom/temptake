"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import {
  HACCP_CATEGORY_LABELS,
  cloneDefaultHaccpProcedures,
  mergeProcedureOverrides,
  type HaccpDocumentMeta,
  type HaccpProcedure,
  type HaccpProcedureOverrideRow,
} from "@/lib/haccpProcedures";

type LocationRow = {
  name: string | null;
};

type HaccpDocumentRow = {
  title: string;
  version: string;
  reviewed_by: string | null;
  last_reviewed_at: string | null;
  next_review_due: string | null;
  review_interval_months: number | null;
  site_address: string | null;
  notes: string | null;
  status: "draft" | "published" | null;
  published_at: string | null;
  published_by: string | null;
};

type ExportMeta = HaccpDocumentMeta & {
  status: "draft" | "published";
  publishedAt: string | null;
  publishedBy: string | null;
};

function isoDateToDisplay(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB");
  } catch {
    return value;
  }
}

function isoDateTimeToDisplay(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-GB");
  } catch {
    return value;
  }
}

function todayPlusMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function defaultMeta(locationName: string): ExportMeta {
  return {
    title: `${locationName} HACCP Procedures`,
    version: "1.0",
    reviewedBy: null,
    lastReviewedAt: null,
    nextReviewDue: todayPlusMonths(12),
    reviewIntervalMonths: 12,
    siteAddress: locationName,
    notes: "",
    status: "draft",
    publishedAt: null,
    publishedBy: null,
  };
}

function getStatusLabel(meta: ExportMeta) {
  if (meta.status === "draft") return "Draft";

  if (meta.nextReviewDue) {
    const due = new Date(meta.nextReviewDue);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (due < today) return "Published · Overdue review";
  }

  return "Published";
}

function FieldList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="text-sm leading-6 text-slate-700">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProcedureExportCard({
  procedure,
  number,
}: {
  procedure: HaccpProcedure;
  number: number;
}) {
  return (
    <section className="print-break-avoid rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {HACCP_CATEGORY_LABELS[procedure.category]}
        </span>

        <span
          className={
            procedure.isCcp
              ? "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
              : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
          }
        >
          {procedure.isCcp ? "CCP" : "Control procedure"}
        </span>
      </div>

      <div className="mt-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {number}. {procedure.title}
        </h2>
        <p className="mt-2 text-base leading-7 text-slate-600">{procedure.summary}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Scope
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">{procedure.scope}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FieldList title="Hazards" items={procedure.hazards} />
        <FieldList title="Control measures" items={procedure.controlMeasures} />
        <FieldList title="Critical limits" items={procedure.criticalLimits} />
        <FieldList title="Monitoring" items={procedure.monitoring} />
        <FieldList title="Corrective actions" items={procedure.correctiveActions} />
        <FieldList title="Verification / review" items={procedure.verification} />
      </div>
    </section>
  );
}

export default function HaccpProceduresExportPage() {
  const [ready, setReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("Current site");
  const [meta, setMeta] = useState<ExportMeta>(defaultMeta("Current site"));
  const [procedures, setProcedures] = useState<HaccpProcedure[]>(cloneDefaultHaccpProcedures());

  const ccpCount = useMemo(
    () => procedures.filter((procedure) => procedure.isCcp).length,
    [procedures]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const locationId = orgId ? await getActiveLocationIdClient(orgId) : null;

        if (!orgId || !locationId) {
          if (!cancelled) {
            setLoadingError("No active organisation or location found.");
            setReady(true);
          }
          return;
        }

        const [locationRes, docRes, overrideRes] = await Promise.all([
          supabase.from("locations").select("name").eq("id", locationId).maybeSingle(),
          supabase
            .from("haccp_documents")
            .select(
              "title,version,reviewed_by,last_reviewed_at,next_review_due,review_interval_months,site_address,notes,status,published_at,published_by"
            )
            .eq("org_id", orgId)
            .eq("location_id", locationId)
            .maybeSingle(),
          supabase
            .from("haccp_procedure_overrides")
            .select(
              "procedure_key,title,summary,scope,hazards,control_measures,critical_limits,monitoring,corrective_actions,verification,is_ccp"
            )
            .eq("org_id", orgId)
            .eq("location_id", locationId),
        ]);

        if (cancelled) return;

        const locationRow = (locationRes.data ?? null) as LocationRow | null;
        const resolvedLocationName = locationRow?.name?.trim() || "Current site";
        setLocationName(resolvedLocationName);

        const docRow = (docRes.data ?? null) as HaccpDocumentRow | null;

        const nextMeta: ExportMeta = docRow
          ? {
              title: docRow.title,
              version: docRow.version,
              reviewedBy: docRow.reviewed_by,
              lastReviewedAt: docRow.last_reviewed_at,
              nextReviewDue: docRow.next_review_due,
              reviewIntervalMonths: docRow.review_interval_months ?? 12,
              siteAddress: docRow.site_address?.trim() || resolvedLocationName,
              notes: docRow.notes ?? "",
              status: docRow.status ?? "draft",
              publishedAt: docRow.published_at,
              publishedBy: docRow.published_by,
            }
          : defaultMeta(resolvedLocationName);

        setMeta(nextMeta);

        const defaults = cloneDefaultHaccpProcedures();
        const merged = mergeProcedureOverrides(
          defaults,
          (overrideRes.data ?? []) as HaccpProcedureOverrideRow[]
        );

        setProcedures(merged);
        setReady(true);

        setTimeout(() => {
          window.print();
        }, 150);
      } catch (error) {
        if (!cancelled) {
          setLoadingError(
            error instanceof Error ? error.message : "Failed to load HACCP export."
          );
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <style jsx global>{`
        @media print {
          html,
          body {
            background: white !important;
          }

          .print-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .screen-only {
            display: none !important;
          }
        }
      `}</style>

      <div className="screen-only sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">HACCP Export Preview</div>
            <div className="text-xs text-slate-500">
              This view is intended for print, save-as-PDF, or report pack inclusion.
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
        {!ready ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading HACCP export…
          </div>
        ) : loadingError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {loadingError}
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Food safety management system
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {meta.title}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Exportable HACCP procedures document for site review, print, PDF generation,
                and inclusion in compliance report packs.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={
                    meta.status === "published"
                      ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                  }
                >
                  {getStatusLabel(meta)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Site
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{locationName}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Address
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">
                    {meta.siteAddress || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Version
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{meta.version}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Procedures
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{procedures.length}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    CCPs
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{ccpCount}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reviewed by
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {meta.reviewedBy || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Last reviewed
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {isoDateTimeToDisplay(meta.lastReviewedAt)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Next review due
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {isoDateToDisplay(meta.nextReviewDue)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Published by
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {meta.publishedBy || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Published at
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {isoDateTimeToDisplay(meta.publishedAt)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Generated
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {new Date().toLocaleString("en-GB")}
                  </div>
                </div>
              </div>

              {meta.notes ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Document notes
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {meta.notes}
                  </p>
                </div>
              ) : null}
            </section>

            <div className="mt-6 space-y-6">
              {procedures.map((procedure, index) => (
                <ProcedureExportCard
                  key={procedure.id}
                  procedure={procedure}
                  number={index + 1}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}