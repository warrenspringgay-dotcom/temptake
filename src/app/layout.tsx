// src/app/layout.tsx
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import NavTabs from "@/components/NavTabs";

export const metadata = {
  title: "TempTake",
  description: "Simple food safety logging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AppHeader />
        <NavTabs />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
