import { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://temptake.com";

const now = new Date();

/* ================= CORE ================= */

const corePages: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${SITE_URL}/sectors`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.95,
  },
  {
    url: `${SITE_URL}/demo`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/food-hygiene-app`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/pricing`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  },
];

/* ================= SECTORS ================= */

const sectorSlugs = [
  "takeaway-food-safety-app",
  "cafe-food-safety-app",
  "restaurant-food-safety-app",
  "pub-food-safety-app",
  "fish-and-chip-shop-food-safety-app",
  "mobile-catering-food-safety-app",
];

const sectorPages: MetadataRoute.Sitemap = sectorSlugs.map((slug) => ({
  url: `${SITE_URL}/${slug}`,
  lastModified: now,
  changeFrequency: "weekly" as const,
  priority: 0.9,
}));

/* ================= GUIDES ================= */

const guideSlugs = [
  "food-hygiene-temperature-logs-uk",
  "kitchen-cleaning-rota-uk",
  "allergen-matrix-uk",
  "food-hygiene-training-expiry-uk",
  "safer-food-better-business-logs",
];

const guidesPages: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/guides`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  },
  ...guideSlugs.map((slug) => ({
    url: `${SITE_URL}/guides/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
];

/* ================= TEMPLATES ================= */

const templateSlugs = [
  "fridge-temperature-log",
  "freezer-temperature-log",
  "hot-holding-temperature-log",
  "cooking-temperature-log",
  "food-delivery-temperature-log",
  "food-temperature-record-sheet",
];

const templatePages: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/templates`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  },
  ...templateSlugs.map((slug) => ({
    url: `${SITE_URL}/templates/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
];

/* ================= EXPORT ================= */

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...corePages,
    ...sectorPages,
    ...guidesPages,
    ...templatePages,
  ];
}