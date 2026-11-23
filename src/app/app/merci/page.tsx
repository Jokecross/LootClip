"use client";
/* Retour d'une vérification bancaire faite hors du site. Whop ajoute ?payment=pay_…&status=… à l'adresse. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { confirmer } from "@/lib/abonnement";
import { OFFRES_PAYANTES } from "@/lib/config";
import { useEtat } from "@/lib/etat";

export default function Merci() {
  const etat = useEtat();
  const [vue, setVue] = useState<"attente" | "ok" | "lent" | "echec">("attente");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const statut = p.get("status");
    const paiement = p.get("payment") ?? p.get("payment_id");
    if (statut === "failed" || statut === "canceled") return setVue("echec");
    if (!paiement) return setVue("lent");
    confirmer(paiement).then((ok) => setVue(ok ? "ok" : "lent"));
  }, []);

  const offre = etat.compte?.offre ?? "gratuit";
  const actif = vue === "ok" || (vue === "lent" && offre !== "gratuit");
  const titre = actif ? `Tu es ${offre === "gratuit" ? "abonné" : OFFRES_PAYANTES[offre].nom}.` : vue === "echec" ? "Paiement annulé." : vue === "lent" ? "Encore un instant." : "On ouvre ton offre.";
  const texte = actif
    ? "Ton offre est ouverte. Bon montage."
    : vue === "echec"
      ? "Rien n'a été prélevé. Tu peux réessayer."
      : vue === "lent"
        ? "Ton offre s'ouvre dès que le paiement est confirmé."
        : "Ça prend quelques secondes.";

  return (
    <div className="entree lg:mx-auto lg:max-w-[720px]">
      <h1 className="titre text-[32px] lg:text-[48px]">{titre}</h1>
      <p className="mt-2 text-[15px] text-encre2">{texte}</p>
      {vue !== "attente" && (
        <Link href={vue === "echec" ? "/app/creer" : etat.videos.length ? "/app/creer" : "/commencer?e=8"} className="bouton bouton-rose mt-6 w-full lg:max-w-[320px]">
          {vue === "echec" ? "Revoir les offres" : etat.videos.length ? "Créer une vidéo" : "Déposer mes clips"}
        </Link>
      )}
    </div>
  );
}
