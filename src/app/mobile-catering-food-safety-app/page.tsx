import type { Metadata } from "next";
import SectorLandingPage from "@/components/marketing/SectorLandingPage";
import { sectorPages } from "@/lib/sectorLandingPages";

const content = sectorPages.mobileCatering;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.metaDescription,
};

export default function MobileCateringFoodSafetyPage() {
  return <SectorLandingPage content={content} />;
}