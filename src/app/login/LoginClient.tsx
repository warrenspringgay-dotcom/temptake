"use client";

import React, { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInAction, type AuthResult } from "@/app/actions/auth";

const initialState: AuthResult = { ok: false };

export default function LoginClient({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    signInAction,
    initialState
  );

  useEffect(() => {
    if (!state.ok || !state.redirect) return;
    router.refresh();
    router.push(state.redirect);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full rounded border px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        className="w-full rounded border px-3 py-2"
      />
      <input type="hidden" name="next" value={next} />

      {state.message && <div className="text-sm text-red-600">{state.message}</div>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-white"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-[11px] text-slate-500">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
