// src/lib/billingTiers.ts

export type BillingTierId = "single" | "up_to_3" | "up_to_5" | "enterprise";

export type BillingTierInfo = {
  id: BillingTierId;
  label: string;        // e.g. "Single site"
  priceLabel: string;   // e.g. "£9.99 / month"
  maxLocations: number | null; // null = no fixed cap (enterprise)
  summary: string;
};

export function getTierForLocationCount(count: number): BillingTierId {
  if (count <= 1) return "single";
  if (count <= 3) return "up_to_3";
  if (count <= 5) return "up_to_5";
  return "enterprise";
}

export function getTierInfo(tierId: BillingTierId): BillingTierInfo {
  switch (tierId) {
    case "single":
      return {
        id: "single",
        label: "Single site",
        priceLabel: "£9.99 / month",
        maxLocations: 1,
        summary: "Perfect for a single restaurant, café or takeaway.",
      };

    case "up_to_3":
      return {
        id: "up_to_3",
        label: "Up to 3 sites",
        priceLabel: "£19.99 / month",
        maxLocations: 3,
        summary: "Cover a small group – ideal for 2–3 sites.",
      };

    case "up_to_5":
      return {
        id: "up_to_5",
        label: "Up to 5 sites",
        priceLabel: "£29.99 / month",
        maxLocations: 5,
        summary: "For growing groups with up to 5 kitchens.",
      };

    case "enterprise":
    default:
      return {
        id: "enterprise",
        label: "6+ sites (custom)",
        priceLabel: "Custom pricing",
        maxLocations: null,
        summary: "Talk to us for a tailored multi-site package.",
      };
  }
}
