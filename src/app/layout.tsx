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
        <header className="border-b">
          {/* WIDTH CHANGED HERE */}
          <div className="mx-auto max-w-[1200px] px-4 h-12 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="TempTake"
                width={24}
                height={24}
                priority
              />
              <span className="font-semibold">TempTake</span>
            </Link>
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

        {/* WIDTH CHANGED HERE */}
        <main className="mx-auto max-w-[1200px] px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
