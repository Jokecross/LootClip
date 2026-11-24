"use client";
/*
 * V2. Les écrans de l'onboarding et du studio : toute la page prend la couleur de l'écran, les objets 3D se posent dessus.
 * Téléphone : une colonne, bouton en bas. Ordinateur : grand titre et bouton à gauche, la scène à droite.
 */
import { Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { Logo } from "@/components/marque/Logo";
import { Decor, type Couleur } from "@/components/monde/Decor";

const COULEURS: Couleur[] = ["jaune", "rose", "turquoise", "orange", "fond", "nuit2"];

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
}: {
  /** Change à chaque écran : relance l'animation d'entrée. */
  cle: string | number;
  entete: React.ReactNode;
  gauche: React.ReactNode;
  droite: React.ReactNode;
  action?: React.ReactNode;
  pied?: React.ReactNode;
  /** Couleur de l'écran (« lg:bg-jaune » ou « jaune »). Vide : orange. */
  fond?: string;
  /** Affiche le logo à côté de la progression, sur ordinateur. */
  marque?: boolean;
  /** La scène prend plus de place. */
  large?: boolean;
}) {
  const couleur = COULEURS.find((c) => fond.includes(c)) ?? "orange";
  return (
    <main data-fond={couleur} className="v2 relative min-h-dvh">
      <Decor couleur={couleur} />
      <div
        className={`relative mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-x-clip px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] lg:grid lg:min-h-[max(100dvh,620px)] lg:max-w-[1920px] lg:grid-rows-[auto_minmax(16px,1fr)_auto_auto_minmax(32px,1fr)] lg:gap-x-[3vw] lg:py-[min(30px,3.4vh)] lg:pl-[4.5vw] lg:pr-[3vw] ${
          large ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]"
        }`}
      >
        <div className="relative z-20 lg:col-start-1 lg:row-start-1 lg:flex lg:items-center lg:gap-6">
          {marque && (
            <span className="hidden lg:block">
              <Logo taille={36} />
            </span>
          )}
          <div className="lg:min-w-0 lg:flex-1">{entete}</div>
        </div>
        <div key={cle} className="mt-5 flex flex-1 flex-col lg:contents">
          <div className="contents lg:relative lg:z-20 lg:col-start-1 lg:row-start-3 lg:flex lg:min-w-0 lg:flex-col [&>*]:max-lg:relative [&>*]:max-lg:z-20">{gauche}</div>
          <div className="contents lg:relative lg:col-start-2 lg:row-span-full lg:row-start-1 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col">{droite}</div>
        </div>
        {action && <div className="relative z-20 pt-6 lg:col-start-1 lg:row-start-4 lg:pt-[min(48px,5vh)] lg:[&_.bouton]:h-[min(84px,9.6vh)] lg:[&_.bouton]:max-w-[480px] lg:[&_.bouton]:rounded-[22px] lg:[&_.bouton]:text-[clamp(20px,1.7vw,28px)] lg:[&_.bouton]:font-extrabold">{action}</div>}
        {pied && <div className="relative z-20 lg:col-start-1 lg:row-start-5 lg:self-end [&_p]:lg:text-left [&_p]:lg:text-[14px]">{pied}</div>}
      </div>
    </main>
  );
}

/** Découpe un texte en mots qui jaillissent l'un après l'autre. */
export function Mots({ children }: { children: ReactNode }) {
  let i = 0;
  const passer = (n: ReactNode, cle: string): ReactNode => {
    if (typeof n === "number" || typeof n === "string")
      return String(n)
        .split(/([ \n]+)/)
        .map((m, k) =>
          m.trim() ? (
            <span key={`${cle}-${k}`} className="mot" style={{ "--i": i++ } as React.CSSProperties}>
              {m}
            </span>
          ) : (
            m && " "
          ),
        );
    if (Array.isArray(n)) return n.map((x, k) => <Fragment key={k}>{passer(x, `${cle}-${k}`)}</Fragment>);
    if (isValidElement(n)) {
      const e = n as ReactElement<{ children?: ReactNode }>;
      if (e.type === Fragment) return passer(e.props.children, cle);
    }
    return n;
  };
  return <>{passer(children, "m")}</>;
}

/** Le grand titre d'un écran. */
export function Titre({ children, sous }: { children: React.ReactNode; sous?: string }) {
  return (
    <div className="mb-5 lg:mb-0">
      <h1 className="titre text-[36px] leading-[0.95] lg:text-[clamp(48px,min(5.7vw,10vh),124px)]">
        <Mots>{children}</Mots>
      </h1>
      {sous && <p className="mt-2.5 text-[15px] font-medium text-encre2 lg:mt-[min(26px,3vh)] lg:text-[clamp(19px,1.6vw,28px)] lg:leading-snug">{sous}</p>}
    </div>
  );
}
