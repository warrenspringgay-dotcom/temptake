// src/app/login/LoginClient.tsx
"use client";

import { useActionState, useRef } from "react";
import { signInAction, signUpAction } from "@/app/actions/auth";

export default function LoginClient({ redirectTo = "/" }: { redirectTo?: string }) {
  const signInRef = useRef<HTMLFormElement>(null);
  const signUpRef = useRef<HTMLFormElement>(null);

  const [signInState, signInDispatch] = useActionState(async (_: any, form: FormData) => {
    if (!form.get("redirect")) form.set("redirect", redirectTo);
    return await signInAction(form);
  }, null);

  const [signUpState, signUpDispatch] = useActionState(async (_: any, form: FormData) => {
    if (!form.get("redirect")) form.set("redirect", redirectTo);
    return await signUpAction(form);
  }, null);

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <form ref={signInRef} action={signInDispatch} className="space-y-3">
        <input type="hidden" name="redirect" value={redirectTo} />
        <label className="block text-sm">Email</label>
        <input name="email" type="email" className="w-full border p-2 rounded" required />
        <label className="block text-sm mt-2">Password</label>
        <input name="password" type="password" className="w-full border p-2 rounded" required />
        <button className="w-full mt-3 rounded bg-black text-white py-2">Sign in</button>
        {signInState?.ok === false && <p className="text-red-500 text-sm">{signInState.message}</p>}
      </form>

      <hr className="my-4" />

      <form ref={signUpRef} action={signUpDispatch} className="space-y-3">
        <input type="hidden" name="redirect" value={redirectTo} />
        <label className="block text-sm">Email</label>
        <input name="email" type="email" className="w-full border p-2 rounded" required />
        <label className="block text-sm mt-2">Password</label>
        <input name="password" type="password" className="w-full border p-2 rounded" required />
        <button className="w-full mt-3 rounded bg-gray-700 text-white py-2">Create account</button>
        {signUpState?.ok === false && <p className="text-red-500 text-sm">{signUpState.message}</p>}
      </form>
    </div>
  );
}
