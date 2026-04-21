import type { Metadata } from "next";
import SectorLandingPage from "@/components/marketing/SectorLandingPage";
import { sectorPages } from "@/lib/sectorLandingPages";

const content = sectorPages.takeaway;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.metaDescription,
};

export default function TakeawayFoodSafetyPage() {
  return <SectorLandingPage content={content} />;
}