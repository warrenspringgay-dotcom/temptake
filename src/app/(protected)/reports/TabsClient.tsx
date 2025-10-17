// src/app/reports/TabsClient.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';

type Tab = 'instant' | 'custom';

export default function TabsClient() {
  const search = useSearchParams();
  const router = useRouter();

  const current: Tab = useMemo(() => {
    const t = (search.get('tab') || 'instant') as Tab;
    return t === 'custom' ? 'custom' : 'instant';
  }, [search]);

  function setTab(next: Tab) {
    const qs = new URLSearchParams(search.toString());
    if (next === 'instant') qs.delete('tab');
    else qs.set('tab', next);
    router.replace(`/reports?${qs.toString()}`, { scroll: false });
  }

  const base =
    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border transition';
  const active =
    'bg-black text-white border-black';
  const inactive =
    'bg-white text-gray-700 hover:bg-gray-50 border-gray-300';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`${base} ${current === 'instant' ? active : inactive}`}
        onClick={() => setTab('instant')}
      >
        Instant audit (90d)
      </button>
      <button
        type="button"
        className={`${base} ${current === 'custom' ? active : inactive}`}
        onClick={() => setTab('custom')}
      >
        Custom report
      </button>
    </div>
  );
}
