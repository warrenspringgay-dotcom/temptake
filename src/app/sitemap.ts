import { MetadataRoute } from "next";

// Use the canonical public domain. Can be overridden via env for previews.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://temptake.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-03-01");

  return [
    // Core marketing pages
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/app`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/demo-wall`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // Help & education
    {
      url: `${SITE_URL}/help`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // Guides hub
    {
      url: `${SITE_URL}/guides`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // Individual guides
    {
      url: `${SITE_URL}/guides/food-hygiene-temperature-logs-uk`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/kitchen-cleaning-rota-uk`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/allergen-matrix-uk`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/food-hygiene-training-expiry-uk`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/guides/safer-food-better-business-logs`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },

    // Templates hub
    {
      url: `${SITE_URL}/templates`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // Template pages (SEO magnets)
    {
      url: `${SITE_URL}/templates/fridge-temperature-log`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/templates/freezer-temperature-log`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/templates/hot-holding-temperature-log`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/templates/cooking-temperature-log`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/templates/food-delivery-temperature-log`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/templates/food-temperature-record-sheet`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
  ];
}