"use client";
/*
 * V3. Les écrans de l'onboarding et du studio.
 * Téléphone : une colonne crème, bouton en bas. Ordinateur : la question à gauche, la scène dans un panneau de couleur douce à droite.
 */
import { Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { Logo } from "@/components/marque/Logo";

const COULEURS = ["jaune", "rose", "turquoise", "orange"] as const;

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
  const couleur = COULEURS.find((c) => fond.includes(c));
  return (
    <main
      className={`v3 relative mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-x-clip px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] lg:grid lg:min-h-[max(100dvh,620px)] lg:max-w-[1800px] lg:grid-rows-[auto_minmax(16px,1fr)_auto_auto_minmax(32px,1fr)] lg:gap-x-[4vw] lg:py-[min(28px,3vh)] lg:pl-[4vw] lg:pr-7 ${
        large ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]"
      }`}
    >
      <div className="relative z-20 lg:col-start-1 lg:row-start-1 lg:flex lg:items-center lg:gap-6">
        {marque && (
          <span className="hidden lg:block">
            <Logo taille={34} />
          </span>
        )}
        <div className="lg:min-w-0 lg:flex-1">{entete}</div>
      </div>
      <div key={cle} className="mt-5 flex flex-1 flex-col lg:contents">
        <div className="contents lg:relative lg:z-20 lg:col-start-1 lg:row-start-3 lg:flex lg:min-w-0 lg:flex-col [&>*]:max-lg:relative [&>*]:max-lg:z-20">{gauche}</div>
        <div
          className={`contents lg:relative lg:col-start-2 lg:row-span-full lg:row-start-1 lg:mb-2 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col ${couleur ? "lg:rounded-[36px] lg:bg-(--panneau) lg:p-[clamp(24px,2.6vw,48px)]" : ""}`}
          style={{ "--panneau": couleur ? `var(--p-${couleur})` : undefined } as React.CSSProperties}
        >
          {droite}
        </div>
      </div>
      {action && <div className="relative z-20 pt-6 lg:col-start-1 lg:row-start-4 lg:pt-[min(40px,4.4vh)] lg:[&_.bouton]:h-[min(68px,8.4vh)] lg:[&_.bouton]:max-w-[420px] lg:[&_.bouton]:rounded-[18px] lg:[&_.bouton]:text-[21px]">{action}</div>}
      {pied && <div className="relative z-20 lg:col-start-1 lg:row-start-5 lg:self-end [&_p]:lg:text-left [&_p]:lg:text-[13px]">{pied}</div>}
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
      <h1 className="titre text-[32px] lg:text-[clamp(42px,min(4.8vw,8.4vh),96px)]">
        <Mots>{children}</Mots>
      </h1>
      {sous && <p className="mt-2 text-[14px] text-encre2 lg:mt-[min(24px,2.8vh)] lg:text-[clamp(18px,1.5vw,26px)] lg:leading-snug">{sous}</p>}
    </div>
  );
}
