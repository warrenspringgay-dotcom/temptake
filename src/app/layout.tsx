import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food temperature logging and compliance",
  icons: [
    { rel: "icon", url: "/temptake-192.png" },
    { rel: "apple-touch-icon", url: "/temptake-192.png" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

