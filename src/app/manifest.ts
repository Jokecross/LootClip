import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "XPclip",
    short_name: "XPclip",
    description: "Tes clips. Ton loot.",
    lang: "fr",
    start_url: "/app/creer",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDF5EA",
    theme_color: "#FDF5EA",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
