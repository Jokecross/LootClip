"use client";
/*
 * Un écran du parcours (onboarding et studio), dans l'univers de l'accueil V4.
 * Une couleur pleine, une barre d'XP en haut, un sol en bas avec le bouton.
 * Le robot pose la question. Téléphone : une colonne. Ordinateur : la question à gauche, la réponse à droite.
 */
import "@/app/accueil.css";
import "./parcours.css";
import { createContext, isValidElement, useContext, type ReactNode } from "react";
import { Robot } from "@/components/accueil/Robot";
import { Logo } from "@/components/marque/Logo";

const COULEURS = ["jaune", "rose", "turquoise", "orange"] as const;
const Avance = createContext(1);

export function Duo({
  cle,
  entete,
  gauche,
  droite,
  action,
  pied,
  fond = "",
  marque = false,
  large = false,
  centre = false,
}: {
  /** Change à chaque écran : relance l'animation d'entrée. */
  cle: string | number;
  entete: ReactNode;
  gauche: ReactNode;
  droite: ReactNode;
  action?: ReactNode;
  pied?: ReactNode;
  /** Couleur de l'écran : jaune, rose, turquoise ou orange. Vide : crème. */
  fond?: string;
  /** Affiche le logo à côté de la progression, sur ordinateur. */
  marque?: boolean;
  /** La réponse prend plus de place. */
  large?: boolean;
  /** Tout au milieu, la scène posée sur le sol. */
  centre?: boolean;
}) {
  const couleur = COULEURS.find((c) => fond.includes(c));
  const p = isValidElement<{ n?: number; total?: number }>(entete) ? entete.props : {};
  return (
    <Avance.Provider value={p.n && p.total ? p.n / p.total : 1}>
      <main className={`v4 v3 etape ${large ? "etape-large" : ""} ${centre ? "etape-centre" : ""}`} style={{ "--page": couleur ? `var(--color-${couleur})` : "var(--color-fond)" } as React.CSSProperties}>
        <div className="etape-tete">
          {marque && (
            <span className="hidden lg:block">
              <Logo taille={36} />
            </span>
          )}
          <div className="min-w-0 flex-1">{entete}</div>
        </div>
        <div key={cle} className="etape-corps">
          <div className="etape-gauche">{gauche}</div>
          <div className="etape-droite">{droite}</div>
        </div>
        <div className={`etape-sol ${action ? "" : "etape-sol-mince"}`}>
          {action && <div className="etape-action">{action}</div>}
          {pied && <div className="etape-pied">{pied}</div>}
        </div>
      </main>
    </Avance.Provider>
  );
}

/** Un titre qui arrive d'un bloc. */
export function Mots({ children }: { children: ReactNode }) {
  return <span className="arrivee block">{children}</span>;
}

/** La question, dite par le robot. `plus` : ce qui va dans la bulle, sous le texte. */
export function Titre({ children, sous, plus }: { children: ReactNode; sous?: string; plus?: ReactNode }) {
  const xp = useContext(Avance);
  return (
    <div className="dit">
      <div className="bulle arrivee">
        <h1 className="titre">{children}</h1>
        {sous && <p>{sous}</p>}
        {plus && <div className="plus">{plus}</div>}
      </div>
      <Robot xp={xp} className="saute" />
    </div>
  );
}
