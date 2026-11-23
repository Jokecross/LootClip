"use client";

import { useEffect } from "react";

// Le service worker rend l'appli installable sur l'écran d'accueil.
// En dev, on ne l'installe pas : il garderait d'anciens fichiers en cache.
export function EnregistrerSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
