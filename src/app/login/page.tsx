// src/app/login/page.tsx
import LoginClient from "./LoginClient";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const redirectTo =
    typeof searchParams?.redirect === "string" ? searchParams.redirect : "/";
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
      <LoginClient redirectTo={redirectTo} />
    </main>
  );
}
