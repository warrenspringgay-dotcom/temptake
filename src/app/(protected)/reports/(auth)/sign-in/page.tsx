// src/app/reports/(auth)/sign-in/page.tsx
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign in – Reports – TempTake",
};

export default function ReportsSignInPage() {
  redirect("/login?next=/reports");
}
