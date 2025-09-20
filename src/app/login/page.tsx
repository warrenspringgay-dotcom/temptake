// src/app/login/page.tsx
import LoginClient from "./LoginClient";

type SP = Record<string, string | string[] | undefined>;

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const sp = (await searchParams) ?? {};
  const redirect =
    typeof sp.redirect === "string" && sp.redirect ? sp.redirect : "/";

  return <LoginClient redirectTo={redirect} />;
}
