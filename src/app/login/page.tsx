// src/app/login/page.tsx
import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in – TempTake",
};

export default function LoginPage() {
  return <LoginClient />;
}
