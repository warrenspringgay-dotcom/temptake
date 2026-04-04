import { MetadataRoute } from "next";

// Use the canonical public domain. Can be overridden via env for previews.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://temptake.com";

const lastModified = new Date("2026-04-04");

const corePages: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/`,
    lastModified,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${SITE_URL}/demo`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.95,
  },
  {
    url: `${SITE_URL}/food-hygiene-app`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.95,
  },
  {
    url: `${SITE_URL}/pricing`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    url: `${SITE_URL}/demo-wall`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/help`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  },
];

const guideSlugs = [
  "food-hygiene-temperature-logs-uk",
  "kitchen-cleaning-rota-uk",
  "allergen-matrix-uk",
  "food-hygiene-training-expiry-uk",
  "safer-food-better-business-logs",
];

const templateSlugs = [
  "fridge-temperature-log",
  "freezer-temperature-log",
  "hot-holding-temperature-log",
  "cooking-temperature-log",
  "food-delivery-temperature-log",
  "food-temperature-record-sheet",
];

const guidesPages: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/guides`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  ...guideSlugs.map((slug) => ({
    url: `${SITE_URL}/guides/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  })),
];

const templatePages: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/templates`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  ...templateSlugs.map((slug) => ({
    url: `${SITE_URL}/templates/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...corePages, ...guidesPages, ...templatePages];
}