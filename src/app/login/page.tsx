// src/app/login/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabaseServer";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in · TempTake",
};

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawNext = searchParams?.next;
  const nextParam =
    typeof rawNext === "string"
      ? rawNext
      : Array.isArray(rawNext)
      ? rawNext[0]
      : undefined;

  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  // 🔒 Already logged in? Don’t even show the login screen.
  if (user) {
    redirect(safeNext);
  }

  // Not logged in → render client login form
  return <LoginClient initialNext={safeNext} />;
}
