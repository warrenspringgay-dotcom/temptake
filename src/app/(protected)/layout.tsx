// src/app/(protected)/layout.tsx
import { requireUser } from "@/app/actions/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login?redirect=… if unauthenticated
  await requireUser("/");
  return <>{children}</>;
}
