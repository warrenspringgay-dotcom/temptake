import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/signup", "/dashboard"],
      },
    ],
    sitemap: "https://temptake.app/sitemap.xml",
  };
}
