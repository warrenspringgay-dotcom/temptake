// src/app/login/page.tsx
import LoginClient from "./LoginClient";

type RawSearchParams = {
  redirect?: string | string[]; // Next can give string or string[]
};

export default async function LoginPage({
  searchParams,
}: {
  // In Next 15, this is a Promise
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const redirect =
    typeof params.redirect === "string"
      ? params.redirect
      : Array.isArray(params.redirect)
      ? params.redirect[0]
      : "/";

  return <LoginClient redirectTo={redirect ?? "/"} />;
}
