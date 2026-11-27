"use client";
/*
 * Le cadre des écrans de l'onboarding, en « look outil » (comme l'accueil V6) :
 * fond crème quadrillé, barre du haut avec la progression, la question à gauche, la réponse à droite,
 * le bouton dans une barre blanche en bas. Pas de robot, pas d'XP.
 * Mêmes propriétés que <Duo>, pour garder les écrans interchangeables.
 */
import "@/app/accueil.css";
import "@/components/ui/parcours.css";
import "./onboarding.css";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/marque/Logo";
import { useTeinte } from "@/components/ui/teinte";

const ACCENTS = ["jaune", "rose", "turquoise", "orange"] as const;

export function Cadre({
  cle,
  entete,
  gauche,
  droite,
  action,
  pied,
  fond = "",
  large = false,
  centre = false,
}: {
  cle: string | number;
  entete: ReactNode;
  gauche: ReactNode;
  droite: ReactNode;
  action?: ReactNode;
  pied?: ReactNode;
  /** Couleur d'accent de l'écran (pastille, picto). Le fond reste crème. */
  fond?: string;
  marque?: boolean;
  large?: boolean;
  centre?: boolean;
}) {
  useTeinte("");
  const accent = ACCENTS.find((c) => fond.includes(c)) ?? "rose";
  return (
    <main className={`v4 v3 ob ${large ? "ob-large" : ""} ${centre ? "ob-centre" : ""}`} style={{ "--accent": `var(--color-${accent})` } as React.CSSProperties}>
      <div className="ob-tete">{entete}</div>
      <div key={cle} className="ob-corps">
        <div className="ob-gauche">{gauche}</div>
        <div className="ob-droite">{droite}</div>
      </div>
      {(action || pied) && (
        <div className="ob-sol">
          {action && <div className="ob-action">{action}</div>}
          {pied && <div className="ob-pied">{pied}</div>}
        </div>
      )}
    </main>
  );
}

/** La question : une pastille au-dessus, le titre, une phrase dessous. `plus` : ce qui suit le texte. */
export function Question({ children, sous, plus, avant, id }: { children: ReactNode; sous?: ReactNode; plus?: ReactNode; avant?: string; id?: string }) {
  return (
    <div className="ob-question arrivee">
      {avant && (
        <p className="ob-sur">
          <i aria-hidden="true" />
          {avant}
        </p>
      )}
      <h1 id={id} className="titre">
        {children}
      </h1>
      {sous && <p className="ob-sous">{sous}</p>}
      {plus && <div className="ob-plus">{plus}</div>}
    </div>
  );
}

let dernierN = 0;

/** La barre du haut : retour, logo, étape et progression. */
export function Progression({ n, total, retour }: { n: number; total: number; retour?: () => void }) {
  const [large, setLarge] = useState(((Math.min(dernierN, n) || n) / total) * 100);
  useEffect(() => {
    dernierN = n;
    const id = setTimeout(() => setLarge((n / total) * 100), 60);
    return () => clearTimeout(id);
  }, [n, total]);
  return (
    <div className="ob-progression">
      {retour ? (
        <button type="button" onClick={retour} className="ob-retour" aria-label="Retour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.500 6l-6 6 6 6" />
          </svg>
        </button>
      ) : null}
      <span className="ob-logo">
        <Logo taille={30} />
      </span>
      <div className="ob-barre-boite">
        <span className="ob-etape">
          Étape {n} sur {total}
        </span>
        <div className="ob-barre" role="progressbar" aria-valuenow={n} aria-valuemin={1} aria-valuemax={total} aria-label={`Étape ${n} sur ${total}`}>
          <span style={{ transform: `scaleX(${large / 100})` }} />
        </div>
      </div>
    </div>
  );
}

/** L'en-tête du premier écran : le logo seul. */
export function EnteteMarque() {
  return (
    <div className="ob-progression">
      <Logo taille={32} />
      <span className="ob-tete-note">Prêt en 2 minutes</span>
    </div>
  );
}
