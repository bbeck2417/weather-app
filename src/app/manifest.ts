import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weatherly | Live Weather Forecasts",
    short_name: "Weatherly",
    description:
      "Live weather forecasts with current conditions, hourly outlooks, and five-day forecasts.",
    start_url: "/",
    display: "standalone",
    background_color: "#73D1F4",
    theme_color: "#73D1F4",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
