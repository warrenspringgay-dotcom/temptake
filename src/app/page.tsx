// src/app/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import Dashboard from "@/components/FoodTempLogger"; // or your dashboard component

export default async function Page() {
  const { user } = await getSession();
  if (!user) redirect("/login?redirect=/");
  return <Dashboard />;
}
