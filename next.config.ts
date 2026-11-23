import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dossier personnel contient un autre package-lock.json : on fixe la racine ici.
  turbopack: { root: __dirname },
  // Autorise le téléphone (même Wi-Fi) à charger le serveur de dev.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  devIndicators: false,
  poweredByHeader: false,
  // Le moteur est copié dans la machine de montage au moment du lancement (src/lib/atelier.ts).
  outputFileTracingIncludes: { "/api/montage": ["./moteur/*.mjs", "./moteur/bac.sh", "./moteur/package*.json", "./moteur/polices/*"] },
  headers: async () => [
    {
      source: "/:chemin*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    // Fichier demandé par Apple pour afficher Apple Pay sur le site.
    { source: "/.well-known/apple-developer-merchantid-domain-association", headers: [{ key: "Content-Type", value: "text/plain" }] },
    // Le service worker doit toujours être relu, sinon une vieille version reste collée.
    { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
  ],
};

export default nextConfig;
