import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Numéro de version, pour recharger une appli restée ouverte depuis longtemps (EnregistrerSW).
  env: { NEXT_PUBLIC_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" },
  // Le dossier personnel contient un autre package-lock.json : on fixe la racine ici.
  turbopack: { root: __dirname },
  // Autorise le téléphone (même Wi-Fi) à charger le serveur de dev.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  devIndicators: false,
  poweredByHeader: false,
  // Le moteur est copié dans la machine de montage au moment du lancement (src/lib/atelier.ts).
  outputFileTracingIncludes: { "/api/montage": ["./moteur/*.mjs", "./moteur/bac.sh", "./moteur/package*.json", "./moteur/polices/*"] },
  // Retour de TikTok ou d'Instagram, après avoir relié un compte (src/app/relier).
  redirects: async () => [{ source: "/app/comptes", has: [{ type: "query", key: "isSuccess" }], destination: "/relier", permanent: false }],
  // Appareil de l'équipe prêt à filmer : l'accueil ouvre le tournage, sans changer d'adresse (lib/tournage.ts).
  rewrites: async () => ({
    beforeFiles: [{ source: "/", has: [{ type: "cookie", key: "xp_tournage", value: "1" }], destination: "/tournage" }],
    afterFiles: [],
    fallback: [],
  }),
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
