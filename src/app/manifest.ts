// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TempTake",
    short_name: "TempTake",
    description: "Simple food temperature logs, cleaning rota and allergens.",
    start_url: "/dashboard",
    display: "standalone",
    theme_color: "#111111",
    background_color: "#ffffff",
    icons: [
      {
        src: "/icon-192.png",   // 192×192 TempTake logo
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",   // 512×512 TempTake logo
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
