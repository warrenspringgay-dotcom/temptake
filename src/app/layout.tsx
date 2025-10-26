// src/app/layout.tsx
import "./globals.css";
import NavTabs from "@/components/NavTabs";
import SignOutButton from "@/components/SignOutButton";
import Image from "next/image";
import Link from "next/link";
import { getUserOrNull } from "@/app/actions/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();

  return (
    <html lang="en">
      <body>
        <header className="border-b">
          <div className="mx-auto max-w-5xl px-4 h-12 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" width={24} height={24} alt="TempTake" />
              <span className="font-semibold">TempTake</span>
            </Link>
            <div className="mx-auto">
              <NavTabs />
            </div>
            {user ? <SignOutButton /> : <Link href="/login" className="text-sm">Login</Link>}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
