import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dossier personnel contient un autre package-lock.json : on fixe la racine ici.
  turbopack: { root: __dirname },
  // Autorise le téléphone (même Wi-Fi) à charger le serveur de dev.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  devIndicators: false,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:chemin*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    // Le service worker doit toujours être relu, sinon une vieille version reste collée.
    { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
  ],
};

export default nextConfig;
