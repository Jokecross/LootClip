"use client";
/* Un écran d'attente ou d'erreur : le robot, sa bulle, et un bouton s'il le faut. */
import "@/app/accueil.css";
import { Titre } from "@/components/ui/Duo";
import { teinteDe, useTeinte, type Couleur } from "@/components/ui/teinte";

export function Seul({ couleur, titre, sous, travaille, children }: { couleur: Couleur; titre: string; sous?: string; travaille?: boolean; children?: React.ReactNode }) {
  useTeinte(couleur);
  return (
    <main className="appli appli-seul v4 v3" style={{ "--page": teinteDe(couleur) } as React.CSSProperties}>
      <div role={sous ? "alert" : "status"}>
        <Titre sous={sous} travaille={travaille} plus={children && <div className="pt-4">{children}</div>}>
          {titre}
        </Titre>
      </div>
    </main>
  );
}
