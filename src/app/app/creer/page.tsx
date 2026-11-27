"use client";
/* Créer : le joueur colle le lien de sa vidéo (ou envoie le fichier) et récupère ses clips. */
import { useState } from "react";
import { Paywall } from "@/components/app/Paywall";
import { Studio } from "@/components/clips/Studio";
import { useEtat } from "@/lib/etat";

export default function Creer() {
  const etat = useEtat();
  const [paywall, setPaywall] = useState(false);
  const gratuit = (etat.compte?.offre ?? "gratuit") === "gratuit";
  return (
    <>
      <Studio
        appli
        avantLancer={() => {
          // Sur le Mac (essais en local), pas de paiement demandé
          const local = /^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname);
          if (gratuit && !local) {
            setPaywall(true);
            return false;
          }
          return true;
        }}
      />
      <Paywall ouvert={paywall} moment="deuxieme_video" fermer={() => setPaywall(false)} apresPaiement={() => setPaywall(false)} />
    </>
  );
}
