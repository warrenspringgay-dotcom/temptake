'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setEmail(s?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!email) {
    return (
      <a
        href="/login"
        className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Sign in
      </a>
    );
  }

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.replace('/login');
      }}
      className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      title={email}
    >
      Sign out
    </button>
  );
}
