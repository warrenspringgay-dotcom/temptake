import { MetadataRoute } from "next";

const SITE_URL = "https://temptake.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // Core marketing pages
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/app`,
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
    {
      url: `${SITE_URL}/demo-wall`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // Help & education (trust + relevance)
    {
      url: `${SITE_URL}/help`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // Guides hub
    {
      url: `${SITE_URL}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // Individual guides (ranking pages)
    {
      url: `${SITE_URL}/guides/food-hygiene-temperature-logs-uk`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/kitchen-cleaning-rota-uk`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/allergen-matrix-uk`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/food-hygiene-training-expiry-uk`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/safer-food-better-business-logs`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
  ];
}
