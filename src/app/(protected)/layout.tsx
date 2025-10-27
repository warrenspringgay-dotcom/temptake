// app/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { getUserOrNull } from "@/app/actions/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();
  if (!user) redirect("/login");
  return <>{children}</>;
}
