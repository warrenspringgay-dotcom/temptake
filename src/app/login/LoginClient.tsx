"use client";

import { useActionState, useEffect, useRef } from "react";
import { signInAction } from "@/app/actions/auth";

type AuthResult = { ok: boolean; message?: string; redirect?: string };

const initialState: AuthResult = { ok: false };

export default function LoginClient({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    signInAction,
    initialState
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && (state.redirect || redirectTo)) {
      window.location.assign(state.redirect || redirectTo);
    }
  }, [state, redirectTo]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input name="email" type="email" placeholder="Email" required className="input" />
      <input name="password" type="password" placeholder="Password" required className="input" />
      <button disabled={pending} className="btn">{pending ? "Signing in..." : "Sign in"}</button>
      {state?.message && <p className="text-red-600 text-sm">{state.message}</p>}
    </form>
  );
}
