// src/app/layout.tsx
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Pwa from "@/components/Pwa";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import { getUserOrNull } from "@/app/actions/auth";
import HeaderShell from "./HeaderShell"; // 👈 fix path

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserOrNull();

  const initialUser = user
    ? {
        id: user.id,
        email: user.email,
        fullName: (user.user_metadata as any)?.full_name ?? null,
      }
    : null;

  return (
    <html lang="en">
      <head>{/* meta tags, title, etc. */}</head>

      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              {/* Header + NavTabs + UserMenu, hidden on / and /launch */}
              <HeaderShell user={user} initialUser={initialUser} />

              <Pwa />

              <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

              {/* Tally script for the whole app */}
              <script src="https://tally.so/widgets/embed.js" async />

              <ServiceWorkerRegister />
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>
        <Analytics />
      </body>
    </html>
  );
}
