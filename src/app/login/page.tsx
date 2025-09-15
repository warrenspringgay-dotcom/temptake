// src/app/login/page.tsx
import { getSession } from "@/app/actions/auth";
import LoginClient from "./LoginClient";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const { user } = await getSession();
  if (user) redirect("/"); // already signed in

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <LoginClient />
      <p className="mt-6 text-sm text-gray-500">
        Trouble signing in? Check your credentials or contact an administrator.
      </p>
      <p className="mt-2">
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to home</Link>
      </p>
    </div>
  );
}
