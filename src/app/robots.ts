import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",

        // Block all non-marketing / app areas
        disallow: [
          "/login",
          "/signup",
          "/demo/",        // block deep demo routes
          "/manager",
          "/dashboard",
          "/api",
        ],
      },
    ],
    sitemap: "https://temptake.com/sitemap.xml",
  };
}