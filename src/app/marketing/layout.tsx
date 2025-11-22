// src/app/marketing/layout.tsx  ← PUBLIC MARKETING LAYOUT
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "TempTake • Food Safety That Doesn’t Suck",
  description: "Log temps in 3 seconds. The HACCP app your chefs will actually love.",
  metadataBase: new URL("https://temptake.com"),
  openGraph: {
    title: "TempTake",
    description: "The food-safety app chefs actually fight to use",
    url: "https://temptake.com",
    images: ["/og.png"],
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white">{children}</body>
    </html>
  );
}