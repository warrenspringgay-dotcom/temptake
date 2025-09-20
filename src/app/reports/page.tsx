// src/app/reports/page.tsx
import { Suspense } from 'react';
import PrintButton from './PrintButton';
import TabsClient from './TabsClient';
import { getInstantAudit90d } from '@/app/actions/reports';

export const dynamic = 'force-dynamic';

function SectionPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    temps: 'Temps',
  };
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
      {map[s] ?? s}
    </span>
  );
}

async function InstantAuditTable() {
  const { rows, range } = await getInstantAudit90d();

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <p className="text-sm text-gray-600">
          Range: {new Date(range.from).toLocaleDateString()} –{' '}
          {new Date(range.to).toLocaleDateString()}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Nothing recorded in the last 90 days.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(r.at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <SectionPill s={r.section} />
                  </td>
                  <td className="px-4 py-2 text-gray-900">{r.title}</td>
                  <td className="px-4 py-2 text-gray-700">{r.details ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default async function ReportsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <TabsClient />
        <PrintButton />
      </div>

      {/* Instant audit view (default). If you later add a custom report,
          read the search param on the **client** and show the other view */}
      <Suspense
        fallback={
          <div className="rounded-lg border border-gray-200 p-6 text-sm text-gray-600">
            Loading…
          </div>
        }
      >
        <InstantAuditTable />
      </Suspense>
    </div>
  );
}
