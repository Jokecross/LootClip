"use client";
/*
 * Les écrans à réponses de l'onboarding. Servis par /commencer et par le studio de tournage (/studio).
 */
import { useEffect, useRef, useState } from "react";
import { Titre } from "@/components/ui/Duo";
import { Coche } from "@/components/ui/Parcours";
import { Roulette } from "@/components/ui/Roulette";
import { ONBOARDING } from "@/lib/config";
import type { Profil } from "@/lib/etat";
import { nombre, videos, vuesLisibles } from "@/lib/format";
import { plan, videosPourHeures, type Reponses } from "@/lib/onboarding";
import { bravo, cran, pop } from "@/lib/sons";

type Props = { r: Reponses; repondre: (x: Reponses) => void };

export const REPERE_HEURES = "Notre repère : une vidéo par heure de jeu. Trois par jour maximum.";

/** L'étiquette sous le montant choisi. */
function palier(objectif: number) {
  if (objectif < 250) return { texte: "Un premier palier", fond: "bg-turquoise" };
  if (objectif < 1000) return { texte: "Un vrai complément", fond: "bg-jaune" };
  if (objectif < 4000) return { texte: "Un deuxième salaire", fond: "bg-orange" };
  return { texte: "Le niveau des gros comptes", fond: "bg-rose" };
}

/*
 * Chaque écran rend sa partie gauche (la question) et sa partie droite (la réponse),
 * posées par <Duo> : l'une sous l'autre sur téléphone, côte à côte sur ordinateur.
 */
type Parties = { gauche: React.ReactNode; droite: React.ReactNode; fond?: string };

export function ecranConsole({ r, repondre }: Props): Parties {
  return {
    gauche: <Titre sous="Le tutoriel s'adapte à ta console.">Tu joues sur quoi ?</Titre>,
    droite: (
      <Choix
        label="Ta console"
        cote
        options={[
          { valeur: "ps5", libelle: "PS5", indice: "PlayStation 5", image: <Manette sticks="bas" /> },
          { valeur: "xbox", libelle: "Xbox", indice: "Series X ou S", image: <Manette sticks="decales" /> },
        ]}
        valeur={r.plateforme}
        choisir={(v) => repondre({ plateforme: v as Profil["plateforme"] })}
      />
    ),
    fond: "lg:bg-turquoise",
  };
}

export function ecranTiktok({ r, repondre }: Props): Parties {
  return {
    gauche: <Titre sous="Aucun souci si tu pars de zéro.">Tu as déjà une page TikTok ?</Titre>,
    droite: (
      <Choix
        label="Ta page TikTok"
        options={[
          { valeur: "abonnes", libelle: "Oui, avec des abonnés", image: <Page etat="abonnes" /> },
          { valeur: "vide", libelle: "Oui, mais elle est vide", image: <Page etat="vide" /> },
          { valeur: "non", libelle: "Non, pas encore", image: <Page etat="non" /> },
        ]}
        valeur={r.tiktok}
        choisir={(v) => repondre({ tiktok: v as Profil["tiktok"] })}
      />
    ),
    fond: "lg:bg-rose",
  };
}

export function ecranObjectif({ r, repondre }: Props): Parties {
  const objectif = r.objectif ?? ONBOARDING.objectifParDefaut;
  const montant = <Grand cle={objectif}>{nombre(objectif)}&nbsp;€</Grand>;
  const etiquette = <span className={`pastille mt-2.5 lg:min-h-9 lg:px-4 lg:text-[16px] ${palier(objectif).fond}`}>{palier(objectif).texte}</span>;
  return {
    gauche: (
      <>
        <Titre sous="Lance la roue et cale ton objectif.">Tu vises combien par mois ?</Titre>
        <div className="my-auto flex flex-col items-center pb-4 lg:hidden">
          {montant}
          {etiquette}
        </div>
      </>
    ),
    droite: (
      <Roulette
        label="Objectif par mois"
        valeurs={ONBOARDING.objectifs}
        valeur={objectif}
        libelle={(v) => `${nombre(v)} €`}
        changer={(v) => repondre({ objectif: v })}
        centre={
          <>
            {montant}
            {etiquette}
          </>
        }
      />
    ),
  };
}

export function ecranHeures({ r, repondre }: Props): Parties {
  const heures = r.heures ?? ONBOARDING.heuresParDefaut;
  const parSemaine = r.frequence ?? videosPourHeures(heures);
  return {
    gauche: (
      <>
        <Titre sous="Plus tu joues, plus tu as de quoi poster.">Tu joues combien d&apos;heures par semaine ?</Titre>
        <div className="my-auto flex items-center justify-between gap-4 pb-4 lg:mt-[min(40px,4.4vh)] lg:mb-0 lg:justify-start lg:gap-10 lg:pb-0">
          <div>
            <div className="lg:hidden">
              <Grand cle={heures}>{heures}&nbsp;h</Grand>
            </div>
            <p className="mt-2.5 text-[15px] font-bold leading-tight lg:mt-0 lg:whitespace-nowrap lg:text-[clamp(26px,2.4vw,42px)] lg:[font-family:var(--font-titre)] lg:font-extrabold lg:tracking-[-0.03em]">
              {videos(parSemaine)}
              <span className="block text-[13px] font-normal text-encre2 lg:mt-1 lg:text-[18px] lg:tracking-normal lg:[font-family:var(--font-texte)]">par semaine</span>
            </p>
          </div>
          <Semaine n={parSemaine} />
        </div>
      </>
    ),
    droite: (
      <Roulette
        label="Heures de jeu par semaine"
        valeurs={ONBOARDING.heures}
        valeur={heures}
        libelle={(v) => `${v} h`}
        changer={(v) => repondre({ heures: v, frequence: videosPourHeures(v) })}
        centre={<Grand cle={heures}>{heures}&nbsp;h</Grand>}
      />
    ),
  };
}

export function ecranPlan({ objectif, frequence }: { objectif: number; frequence: number }): Parties {
  const p = plan(objectif, frequence);
  return {
    gauche: (
      <>
        <span className="pastille w-fit bg-turquoise lg:min-h-9 lg:px-4 lg:text-[16px]">Ton plan</span>
        <h1 className="titre mt-3 text-[28px] lg:mt-6 lg:text-[clamp(38px,min(4.1vw,7vh),76px)]">
          Tu vises {nombre(objectif)}&nbsp;€. On te fixe la barre à <Compteur de={objectif} vers={p.booste} />&nbsp;€.
        </h1>
        <p className="mt-2 text-[14px] leading-snug text-encre2 lg:mt-6 lg:max-w-[34ch] lg:text-[clamp(17px,1.4vw,24px)]">On vise 6 % plus haut pour que tu passes ton objectif, pas juste que tu l&apos;approches.</p>
      </>
    ),
    droite: (
      <div className="contents lg:flex lg:flex-1 lg:flex-col lg:gap-6">
        <div className="carte-forte mt-5 bg-jaune p-4 lg:mt-0 lg:flex lg:flex-[1.25] lg:flex-col lg:justify-end lg:rounded-3xl lg:bg-blanc lg:p-10">
          <p className="text-[13px] font-bold lg:text-[20px]">Vues à faire par mois</p>
          <p className="titre mt-1.5 text-[26px] lg:mt-3 lg:text-[clamp(44px,4.6vw,88px)]">
            {vuesLisibles(p.vuesMin)} à {vuesLisibles(p.vuesMax)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:mt-0 lg:flex-1 lg:gap-6">
          <div className="carte p-3.5 lg:flex lg:flex-col lg:justify-end lg:rounded-3xl lg:bg-turquoise lg:p-8 lg:shadow-[0_4px_0_var(--color-encre)]">
            <p className="text-[12px] font-bold lg:text-[18px]">Ton rythme</p>
            <p className="titre mt-1 text-[20px] lg:mt-2 lg:text-[clamp(30px,3vw,56px)]">{videos(frequence)}</p>
            <p className="text-[12px] text-encre2 lg:mt-1 lg:text-[17px] lg:text-encre">par semaine</p>
          </div>
          <div className="carte p-3.5 lg:flex lg:flex-col lg:justify-end lg:rounded-3xl lg:bg-rose lg:p-8 lg:shadow-[0_4px_0_var(--color-encre)]">
            <p className="text-[12px] font-bold lg:text-[18px]">À viser par vidéo</p>
            <p className="titre mt-1 text-[20px] lg:mt-2 lg:text-[clamp(28px,2.6vw,50px)]">
              {vuesLisibles(p.vuesParVideoMin)} à {vuesLisibles(p.vuesParVideoMax)}
            </p>
            <p className="text-[12px] text-encre2 lg:mt-1 lg:text-[17px] lg:text-encre">vues</p>
          </div>
        </div>
      </div>
    ),
    fond: "lg:bg-jaune",
  };
}

/** Cartes de choix : liste simple sur téléphone, grandes cartes illustrées sur ordinateur. */
function Choix({
  options,
  valeur,
  choisir,
  label,
  cote = false,
}: {
  options: { valeur: string; libelle: string; indice?: string; image: React.ReactNode }[];
  valeur?: string;
  choisir: (v: string) => void;
  label: string;
  /** Cartes côte à côte sur ordinateur. */
  cote?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2.5 lg:flex-1 lg:gap-6 ${cote ? "lg:flex-row" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o, i) => {
        const actif = valeur === o.valeur;
        return (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => {
              pop(0.4 + i * 0.25);
              choisir(o.valeur);
            }}
            className={`option lg:relative lg:min-h-0 lg:flex-1 lg:rounded-3xl lg:shadow-[0_6px_0_var(--color-encre)] lg:hover:-translate-y-1 lg:active:translate-y-1 lg:active:shadow-none ${
              cote ? "lg:flex-col lg:items-start lg:justify-end lg:p-8" : "lg:justify-start lg:gap-8 lg:px-10"
            }`}
          >
            <span className={`hidden shrink-0 lg:block ${cote ? "m-auto w-full max-w-[300px]" : "w-[clamp(84px,8.5vw,150px)]"}`}>{o.image}</span>
            <span>
              <span className={`titre block text-[18px] font-bold tracking-[-0.01em] lg:font-extrabold lg:tracking-[-0.03em] ${cote ? "lg:text-[clamp(44px,4.4vw,80px)]" : "lg:text-[clamp(26px,2.4vw,42px)]"}`}>{o.libelle}</span>
              {o.indice && <span className="mt-2 hidden text-[18px] text-encre2 lg:block">{o.indice}</span>}
            </span>
            {actif ? <Coche className="h-6 w-6 shrink-0 lg:absolute lg:right-7 lg:top-7 lg:h-11 lg:w-11" /> : o.indice ? <span className="text-right text-[12px] text-encre2 lg:hidden">{o.indice}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Une manette dessinée par nous, sans marque. Seule la place des sticks change. */
function Manette({ sticks }: { sticks: "bas" | "decales" }) {
  const t = { stroke: "var(--color-encre)", strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const [gx, gy, cx, cy] = sticks === "bas" ? [92, 104, 62, 72] : [62, 70, 92, 104];
  return (
    <svg viewBox="0 0 240 180" className="block w-full" aria-hidden="true">
      <path d="M62 34h116c24 0 34 18 41 46 8 31 12 62-8 70-19 7-30-10-43-29H72c-13 19-24 36-43 29-20-8-16-39-8-70 7-28 17-46 41-46z" fill="var(--color-encre)" transform="translate(0 8)" />
      <path d="M62 34h116c24 0 34 18 41 46 8 31 12 62-8 70-19 7-30-10-43-29H72c-13 19-24 36-43 29-20-8-16-39-8-70 7-28 17-46 41-46z" fill={sticks === "bas" ? "var(--color-fond)" : "var(--color-orange)"} {...t} />
      <path d="M52 34c2-10 10-14 20-14h12c7 0 10 5 10 14M188 34c-2-10-10-14-20-14h-12c-7 0-10 5-10 14" fill="var(--color-encre)" {...t} />
      {sticks === "bas" ? <rect x="96" y="48" width="48" height="30" rx="7" fill="var(--color-turquoise)" {...t} /> : <circle cx="120" cy="56" r="10" fill="var(--color-jaune)" {...t} />}
      <path d={`M${cx - 5} ${cy - 15}h10v10h10v10h-10v10h-10v-10h-10v-10h10z`} fill="var(--color-encre)" {...t} strokeWidth={3} />
      {[[gx, gy], [148, 104]].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="17" fill="var(--color-encre)" />
          <circle cx={x} cy={y} r="9" fill="var(--color-rose)" />
        </g>
      ))}
      {[[180, 56, "jaune"], [196, 72, "rose"], [180, 88, "turquoise"], [164, 72, "blanc"]].map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill={`var(--color-${c})`} {...t} strokeWidth={3} />
      ))}
    </svg>
  );
}

/** Une page de profil en miniature : remplie, vide, ou à créer. */
function Page({ etat }: { etat: "abonnes" | "vide" | "non" }) {
  const t = { stroke: "var(--color-encre)", strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const couleurs = ["rose", "jaune", "turquoise", "orange", "rose", "jaune"];
  return (
    <svg viewBox="0 0 120 120" className="block h-auto max-h-[16dvh] w-full" aria-hidden="true">
      <rect x="22" y="10" width="76" height="106" rx="14" fill="var(--color-encre)" />
      <rect x="22" y="4" width="76" height="106" rx="14" fill="var(--color-fond)" {...t} strokeDasharray={etat === "non" ? "9 9" : undefined} />
      {etat === "non" ? (
        <path d="M60 40v34M43 57h34" fill="none" {...t} strokeWidth={8} />
      ) : (
        <>
          <circle cx="60" cy="26" r="10" fill={etat === "abonnes" ? "var(--color-turquoise)" : "var(--color-beige)"} {...t} strokeWidth={3} />
          <path d={etat === "abonnes" ? "M40 45h40" : "M50 45h20"} {...t} strokeWidth={5} />
          {couleurs.map((c, i) => (
            <rect key={i} x={30 + (i % 3) * 21} y={54 + Math.floor(i / 3) * 26} width="18" height="23" rx="4" fill={etat === "abonnes" ? `var(--color-${c})` : "var(--color-beige)"} stroke={etat === "abonnes" ? "var(--color-encre)" : "none"} strokeWidth="3" />
          ))}
        </>
      )}
    </svg>
  );
}

/** Le gros chiffre au-dessus de la roue : il saute un peu à chaque cran. */
function Grand({ children, cle }: { children: React.ReactNode; cle: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.animate([{ transform: "scale(1.09)" }, { transform: "scale(1)" }], { duration: 160, easing: "ease-out" });
  }, [cle]);
  return (
    <p ref={ref} className="titre whitespace-nowrap text-[64px] tabular-nums [@media(min-height:780px)]:text-[min(84px,21vw)] lg:!text-[clamp(64px,7vw,132px)]" aria-live="off">
      {children}
    </p>
  );
}

/** La semaine en petites vidéos verticales : 7 jours, 3 par jour maximum. */
function Semaine({ n }: { n: number }) {
  const plein = (jour: number, rang: number) => {
    const entiers = Math.floor(n / 7);
    if (rang < entiers) return true;
    if (rang > entiers) return false;
    const reste = n % 7;
    // Le reste est réparti dans la semaine, pas collé au lundi.
    return Array.from({ length: reste }, (_, i) => Math.floor(((i + 0.5) * 7) / reste)).includes(jour);
  };
  const couleurs = ["bg-rose", "bg-jaune", "bg-turquoise"];
  return (
    <div className="grid grid-cols-7 gap-1 lg:gap-1.5" aria-hidden="true">
      {[2, 1, 0].map((rang) =>
        Array.from({ length: 7 }, (_, jour) => (
          <span
            key={`${rang}-${jour}`}
            className={`h-[31px] w-[19px] rounded-[5px] border-2 transition-[transform,background-color,border-color] duration-200 lg:h-[clamp(34px,min(3.4vw,5vh),60px)] lg:w-[clamp(22px,2.1vw,37px)] ${
              plein(jour, rang) ? `${couleurs[rang]} scale-100 border-encre` : "scale-90 border-beige bg-transparent"
            }`}
          />
        )),
      )}
      {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
        <span key={i} className="text-center text-[11px] font-bold text-encre2">
          {j}
        </span>
      ))}
    </div>
  );
}

/** Le montant qui grimpe de l'objectif choisi à la barre fixée, avec les crans de la roue. */
function Compteur({ de, vers }: { de: number; vers: number }) {
  const [v, setV] = useState(de);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(vers);
      return;
    }
    const duree = 1100;
    const t0 = performance.now() + 500;
    let image = 0;
    let dernier = de;
    const tic = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / duree));
      const x = Math.round(de + (vers - de) * (1 - (1 - k) ** 3));
      if (x !== dernier) {
        dernier = x;
        setV(x);
        cran(k);
      }
      if (k < 1) image = requestAnimationFrame(tic);
      else bravo();
    };
    image = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(image);
  }, [de, vers]);
  return <span className="tabular-nums">{nombre(v)}</span>;
}
