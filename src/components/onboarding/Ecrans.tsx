"use client";
/*
 * Les écrans à réponses de l'onboarding. Servis par /commencer et par le studio de tournage (/studio).
 */
import { useEffect, useRef, useState } from "react";
import { Options } from "@/components/ui/Parcours";
import { Roulette } from "@/components/ui/Roulette";
import { ONBOARDING } from "@/lib/config";
import type { Profil } from "@/lib/etat";
import { nombre, videos, vuesLisibles } from "@/lib/format";
import { plan, videosPourHeures, type Reponses } from "@/lib/onboarding";
import { bravo, cran } from "@/lib/sons";

type Props = { r: Reponses; repondre: (x: Reponses) => void };

export const REPERE_HEURES = "Notre repère : une vidéo par heure de jeu. Trois par jour maximum.";

/** L'étiquette sous le montant choisi. */
function palier(objectif: number) {
  if (objectif < 250) return { texte: "Un premier palier", fond: "bg-turquoise" };
  if (objectif < 1000) return { texte: "Un vrai complément", fond: "bg-jaune" };
  if (objectif < 4000) return { texte: "Un deuxième salaire", fond: "bg-orange" };
  return { texte: "Le niveau des gros comptes", fond: "bg-rose" };
}

export function EcranConsole({ r, repondre }: Props) {
  return (
        <>
          <Titre sous="Le tutoriel s'adapte à ta console.">Tu joues sur quoi ?</Titre>
          <Options
            label="Ta console"
            options={[
              { valeur: "ps5", libelle: "PS5", indice: "PlayStation 5" },
              { valeur: "xbox", libelle: "Xbox", indice: "Series X ou S" },
            ]}
            valeur={r.plateforme}
            choisir={(v) => repondre({ plateforme: v as Profil["plateforme"] })}
          />
        </>
      );
}

export function EcranTiktok({ r, repondre }: Props) {
  return (
        <>
          <Titre sous="Aucun souci si tu pars de zéro.">Tu as déjà une page TikTok ?</Titre>
          <Options
            label="Ta page TikTok"
            options={[
              { valeur: "abonnes", libelle: "Oui, avec des abonnés" },
              { valeur: "vide", libelle: "Oui, mais elle est vide" },
              { valeur: "non", libelle: "Non, pas encore" },
            ]}
            valeur={r.tiktok}
            choisir={(v) => repondre({ tiktok: v as Profil["tiktok"] })}
          />
        </>
      );
}

export function EcranObjectif({ r, repondre }: Props) {
  const objectif = r.objectif ?? ONBOARDING.objectifParDefaut;
  return (
        <>
          <Titre sous="Lance la roue et cale ton objectif.">Tu vises combien par mois ?</Titre>
          <div className="my-auto flex flex-col items-center pb-4 lg:my-0">
            <Grand cle={objectif}>{nombre(objectif)}&nbsp;€</Grand>
            <span className={`pastille mt-2.5 ${palier(objectif).fond}`}>{palier(objectif).texte}</span>
          </div>
          <Roulette
            label="Objectif par mois"
            valeurs={ONBOARDING.objectifs}
            valeur={objectif}
            libelle={(v) => `${nombre(v)} €`}
            changer={(v) => repondre({ objectif: v })}
          />
        </>
      );
}

export function EcranHeures({ r, repondre }: Props) {
  const heures = r.heures ?? ONBOARDING.heuresParDefaut;
  const parSemaine = r.frequence ?? videosPourHeures(heures);
  return (
        <>
          <Titre sous="Plus tu joues, plus tu as de quoi poster.">Tu joues combien d&apos;heures par semaine ?</Titre>
          <div className="my-auto flex items-center justify-between gap-4 pb-4 lg:my-0">
            <div>
              <Grand cle={heures}>{heures}&nbsp;h</Grand>
              <p className="mt-2.5 text-[15px] font-bold leading-tight">
                {videos(parSemaine)}
                <span className="block text-[13px] font-normal text-encre2">par semaine</span>
              </p>
            </div>
            <Semaine n={parSemaine} />
          </div>
          <Roulette
            label="Heures de jeu par semaine"
            valeurs={ONBOARDING.heures}
            valeur={heures}
            libelle={(v) => `${v} h`}
            changer={(v) => repondre({ heures: v, frequence: videosPourHeures(v) })}
          />
        </>
      );
}

export function EcranPlan({ objectif, frequence }: { objectif: number; frequence: number }) {
  const p = plan(objectif, frequence);
  return (
          <>
            <span className="pastille w-fit bg-turquoise">Ton plan</span>
            <h1 className="titre mt-3 text-[28px]">
              Tu vises {nombre(objectif)}&nbsp;€. On te fixe la barre à <Compteur de={objectif} vers={p.booste} />&nbsp;€.
            </h1>
            <p className="mt-2 text-[14px] leading-snug text-encre2">On vise 6 % plus haut pour que tu passes ton objectif, pas juste que tu l&apos;approches.</p>

            <div className="carte-forte mt-5 bg-jaune p-4">
              <p className="text-[13px] font-bold">Vues à faire par mois</p>
              <p className="titre mt-1.5 text-[26px]">
                {vuesLisibles(p.vuesMin)} à {vuesLisibles(p.vuesMax)}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="carte p-3.5">
                <p className="text-[12px] font-bold">Ton rythme</p>
                <p className="titre mt-1 text-[20px]">{videos(frequence)}</p>
                <p className="text-[12px] text-encre2">par semaine</p>
              </div>
              <div className="carte p-3.5">
                <p className="text-[12px] font-bold">À viser par vidéo</p>
                <p className="titre mt-1 text-[20px]">
                  {vuesLisibles(p.vuesParVideoMin)} à {vuesLisibles(p.vuesParVideoMax)}
                </p>
                <p className="text-[12px] text-encre2">vues</p>
              </div>
            </div>

          </>
        );
}

export function Titre({ children, sous }: { children: React.ReactNode; sous?: string }) {
  return (
    <div className="mb-5">
      <h1 className="titre text-[30px] lg:text-[40px]">{children}</h1>
      {sous && <p className="mt-2 text-[14px] text-encre2">{sous}</p>}
    </div>
  );
}

/** Le gros chiffre au-dessus de la roue : il saute un peu à chaque cran. */
function Grand({ children, cle }: { children: React.ReactNode; cle: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.animate([{ transform: "scale(1.09)" }, { transform: "scale(1)" }], { duration: 160, easing: "ease-out" });
  }, [cle]);
  return (
    <p ref={ref} className="titre whitespace-nowrap text-[64px] tabular-nums [@media(min-height:780px)]:text-[min(84px,21vw)]" aria-live="off">
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
    <div className="grid grid-cols-7 gap-1" aria-hidden="true">
      {[2, 1, 0].map((rang) =>
        Array.from({ length: 7 }, (_, jour) => (
          <span
            key={`${rang}-${jour}`}
            className={`h-[31px] w-[19px] rounded-[5px] border-2 transition-[transform,background-color,border-color] duration-200 lg:h-[36px] lg:w-[22px] ${
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
