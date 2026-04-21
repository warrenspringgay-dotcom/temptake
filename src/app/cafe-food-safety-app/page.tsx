import type { Metadata } from "next";
import SectorLandingPage from "@/components/marketing/SectorLandingPage";
import { sectorPages } from "@/lib/sectorLandingPages";

const content = sectorPages.cafe;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.metaDescription,
};

export default function CafeFoodSafetyPage() {
  return <SectorLandingPage content={content} />;
}