// src/app/login/LoginClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions/auth";

export default function LoginClient() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(formRef.current!);

    startTransition(async () => {
      try {
        await signInAction(fd);
        // redirect after successful login
        window.location.href = "/";
      } catch (err: any) {
        setError(err?.message ?? "Sign-in failed.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Sign in</h1>

      <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            name="email"
            type="email"
            className="w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            name="password"
            type="password"
            className="w-full rounded border px-3 py-2"
            placeholder="••••••••"
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>

        <div className="pt-2 text-sm text-gray-600">
          <Link href="/">Back to app</Link>
        </div>
      </form>
    </div>
  );
}
