"use client";

import { useEffect } from "react";

const ABSENCE = 60_000;

// Le service worker rend l'appli installable sur l'écran d'accueil.
// En dev, on ne l'installe pas : il garderait d'anciens fichiers en cache.
export function EnregistrerSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Un téléphone garde l'appli ouverte des jours : au retour, on recharge si une nouvelle version est sortie.
    let cache = 0;
    const occupe = () =>
      // Dépôt de clips ou paiement en cours : on ne coupe rien.
      /^\/app\/(creer|merci)/.test(location.pathname) || !!document.querySelector("[data-paiement]");
    const verifier = async () => {
      try {
        const { version } = await (await fetch("/api/version", { cache: "no-store" })).json();
        if (version && version !== process.env.NEXT_PUBLIC_VERSION && !occupe()) location.reload();
      } catch {}
    };
    const change = () => {
      if (document.visibilityState === "hidden") cache = Date.now();
      else if (cache && Date.now() - cache > ABSENCE) verifier();
    };
    const revenu = (e: PageTransitionEvent) => {
      if (e.persisted) verifier();
    };
    document.addEventListener("visibilitychange", change);
    window.addEventListener("pageshow", revenu);
    return () => {
      document.removeEventListener("visibilitychange", change);
      window.removeEventListener("pageshow", revenu);
    };
  }, []);
  return null;
}
