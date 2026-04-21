import type { Metadata } from "next";
import SectorLandingPage from "@/components/marketing/SectorLandingPage";
import { sectorPages } from "@/lib/sectorLandingPages";

const content = sectorPages.restaurant;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.metaDescription,
};

export default function RestaurantFoodSafetyPage() {
  return <SectorLandingPage content={content} />;
}