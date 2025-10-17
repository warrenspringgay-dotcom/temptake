// src/app/layout.tsx
import "./globals.css";
import NavTabs from "@/components/NavTabs";
import { getSession } from "@/app/actions/auth";
import SignOutButton from "@/components/SignOutButton";
import Image from "next/image";
import Link from "next/link";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session?.user ?? null;

  return (
    <html lang="en">
      <body>
        {/* example header using user */}
        <header className="border-b">
          <div className="mx-auto max-w-5xl px-4 h-12 flex items-center gap-3">
            <Link href="/" className="font-semibold">TempTake</Link>
            <div className="mx-auto">
              <NavTabs />
            </div>
            {user ? (
              <SignOutButton />
            ) : (
              <Link href="/login" className="text-sm">Login</Link>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
