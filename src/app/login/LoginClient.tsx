// src/app/login/LoginClient.tsx
"use client";

import { useActionState, useRef } from "react";
import { signInAction } from "@/app/actions/auth";

type State = { ok: boolean; message?: string } | null;

export default function LoginClient() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const res = await signInAction(formData);
      if (res.ok) {
        // full reload to pick up new server session
        window.location.href = "/";
        return { ok: true };
      }
      return { ok: false, message: res.message };
    },
    null
  );

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <label className="mb-1 block text-sm text-gray-600">Email</label>
        <input
          name="email"
          type="email"
          required
          className="h-10 w-full rounded-lg border border-gray-300 px-3"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">Password</label>
        <input
          name="password"
          type="password"
          required
          className="h-10 w-full rounded-lg border border-gray-300 px-3"
          placeholder="••••••••"
        />
      </div>

      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <button
        disabled={pending}
        className={`h-10 w-full rounded-xl text-white ${pending ? "bg-gray-400" : "bg-black hover:bg-gray-900"}`}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
