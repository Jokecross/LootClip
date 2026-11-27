"use client";
/*
 * Les écrans du studio de tournage qui n'existent pas tels quels sur le site :
 * la recommandation d'XPclip, les clips en grand avec leur note expliquée, la publication programmée.
 */
import "./studio.css";
import { useEffect, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { DEMO } from "@/components/onboarding/demo";
import { COULEURS_SOUS_TITRES, DUREES_CLIP, FORMATS, TYPES_CLIP, type OptionsClips } from "@/lib/clips-options";
import type { Reponses } from "@/lib/onboarding";
import { heure, jours } from "./Publier";

/* ---------- 1. XPclip recommande ---------- */

/** Les réglages conseillés, à partir des réponses de l'onboarding. */
export function recommander(r: Reponses): OptionsClips {
  const style = r.stylesClips?.[0] ?? r.styleClips;
  const type: OptionsClips["type"] = style === "drole" || style === "conseils" || style === "reactions" || style === "histoires" ? style : "meilleur";
  const courts = !r.destinations?.length || r.destinations.includes("tiktok") || r.destinations.includes("shorts");
  return { type, duree: courts ? "courte" : "moyenne", nombre: 4, format: "auto", couleur: "jaune", placement: "auto", accroche: true };
}

const PICTO = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Recommandation({ options: o, personnaliser }: { options: OptionsClips; personnaliser: () => void }) {
  const lignes = [
    { nom: "Type", valeur: TYPES_CLIP[o.type].nom, pourquoi: "Les passages qui font réagir, d'après ton profil.", fond: "bg-rose", d: "M12 3l2.400 5.600L20 9.300l-4.300 3.900L17 19l-5-3-5 3 1.300-5.800L4 9.300l5.600-.7z" },
    { nom: "Durée", valeur: `${DUREES_CLIP[o.duree].nom}, ${DUREES_CLIP[o.duree].detail}`, pourquoi: o.duree === "courte" ? "Le bon format pour TikTok et les Shorts." : "Assez long pour raconter une vraie histoire.", fond: "bg-jaune", d: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z" },
    { nom: "Format", valeur: FORMATS[o.format].nom, pourquoi: "Facecam en haut, le jeu en bas.", fond: "bg-turquoise", d: "M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM5 10h14" },
    { nom: "Sous-titres", valeur: `${COULEURS_SOUS_TITRES[o.couleur].nom}, mot à mot`, pourquoi: "Lisibles même sans le son.", fond: "bg-orange", d: "M4 7h16M4 12h10M4 17h13" },
    { nom: "Accroche", valeur: o.accroche ? "Oui, écrite par l'IA" : "Non", pourquoi: "Un titre qui retient dès la première seconde.", fond: "bg-rose", d: "M5 5h14v10H9l-4 4z" },
  ];
  return (
    <div className="ob-carte surgit !gap-3 lg:!gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="titre text-[20px] lg:text-[24px]">XPclip te recommande</p>
        <span className="shrink-0 rounded-full border-2 border-encre bg-jaune px-3 py-0.5 text-[13px] font-extrabold">{o.nombre} clips</span>
      </div>
      <ul className="flex flex-col gap-2">
        {lignes.map((l, i) => (
          <li key={l.nom} className="surgit flex items-center gap-3 rounded-2xl border-2 border-encre bg-fond px-3 py-2" style={{ "--d": `${120 + i * 90}ms` } as React.CSSProperties}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-encre ${l.fond}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" {...PICTO}>
                <path d={l.d} />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold text-encre2">{l.nom}</span>
              <span className="block text-[16px] font-extrabold leading-tight">{l.valeur}</span>
              <span className="block text-[12px] leading-snug text-encre2">{l.pourquoi}</span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={personnaliser} className="lien self-center py-1 text-[15px] font-bold">
        Personnaliser
      </button>
    </div>
  );
}

/* ---------- 2. Les clips en grand ---------- */

export function VitrineClips({ nombre }: { nombre: number }) {
  const clips = DEMO.clips.slice(0, Math.min(nombre, DEMO.clips.length));
  const [k, setK] = useState(0);
  const c = clips[k];
  return (
    <div className="studio-clips surgit">
      <div className="studio-tel">
        <Boucle key={c.nom} nom={c.nom} />
        <span className="studio-rang">Clip {k + 1} / {clips.length}</span>
      </div>

      <div className="studio-infos">
        <div className="studio-note" key={c.nom}>
          <span className="titre">{c.score}</span>
          <span>
            <b>/100</b>
            Note XPclip
          </span>
        </div>
        <p className="titre studio-titre">{c.titre}</p>
        <p className="studio-label">Pourquoi cette note</p>
        <p className="studio-pourquoi">{c.pourquoi}</p>
        <ul className="studio-forces">
          {c.forces.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="studio-choix" role="tablist" aria-label="Tes clips">
          {clips.map((x, i) => (
            <button key={x.nom} type="button" role="tab" aria-selected={i === k} onClick={() => setK(i)}>
              <img src={`/v4/${x.nom}.webp`} alt="" width={432} height={768} />
              <span>{x.score}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Publier ou programmer ---------- */

export type Publication = { reseaux: string[]; programme: boolean; jour: number; minutes: number };
export const PUBLICATION_DEFAUT: Publication = { reseaux: ["TikTok"], programme: false, jour: 1, minutes: 19 * 60 };
const RESEAUX = [
  { nom: "TikTok", fond: "bg-turquoise" },
  { nom: "YouTube Shorts", fond: "bg-rose" },
  { nom: "Instagram Reels", fond: "bg-orange" },
];
/** Les créneaux proposés ; 19 h 00 est mis en avant. */
const CRENEAUX = [12 * 60, 17 * 60 + 30, 19 * 60, 20 * 60 + 30, 22 * 60];

export function quand(p: Publication) {
  const j = jours()[p.jour];
  return `${p.jour === 0 ? "aujourd'hui" : p.jour === 1 ? "demain" : j.long} à ${heure(p.minutes)}`;
}

export function Programmation({ pseudo, pub, changer }: { pseudo: string; pub: Publication; changer: (x: Partial<Publication>) => void }) {
  const [liste, setListe] = useState<ReturnType<typeof jours>>([]);
  useEffect(() => setListe(jours()), []);
  return (
    <div className="ob-carte surgit !gap-3">
      <p className="text-[13px] font-bold text-encre2">Compte : @{pseudo}</p>
      <div className="grid grid-cols-3 gap-2">
        {RESEAUX.map((x) => {
          const oui = pub.reseaux.includes(x.nom);
          return (
            <button
              key={x.nom}
              type="button"
              role="checkbox"
              aria-checked={oui}
              onClick={() => changer({ reseaux: oui ? pub.reseaux.filter((y) => y !== x.nom) : [...pub.reseaux, x.nom] })}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-encre px-1 text-center text-[13px] font-extrabold leading-tight transition-transform active:scale-95 ${oui ? x.fond : "bg-blanc"}`}
            >
              {x.nom}
              <span className={`grid h-5 w-5 place-items-center rounded-md border-2 border-encre text-[11px] ${oui ? "bg-encre text-fond" : "bg-blanc"}`}>{oui ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border-2 border-encre bg-fond p-1" role="radiogroup" aria-label="Quand">
        {[
          [false, "Maintenant"],
          [true, "Programmer"],
        ].map(([v, nom]) => (
          <button key={String(v)} type="button" role="radio" aria-checked={pub.programme === v} onClick={() => changer({ programme: v as boolean })} className={`min-h-11 rounded-xl text-[15px] font-extrabold transition-colors ${pub.programme === v ? "bg-encre text-fond" : ""}`}>
            {nom as string}
          </button>
        ))}
      </div>

      {pub.programme && (
        <div className="surgit flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-[13px] font-extrabold">Jour</p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="Jour">
              {liste.map((j, i) => (
                <button key={i} type="button" role="radio" aria-checked={pub.jour === i} onClick={() => changer({ jour: i })} className={`flex min-h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-encre text-[11px] font-bold capitalize transition-transform active:scale-95 ${pub.jour === i ? "bg-rose shadow-[0_3px_0_var(--color-encre)]" : "bg-blanc"}`}>
                  {j.court}
                  <b className="titre text-[20px]">{j.num}</b>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-extrabold">Heure</p>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Heure">
              {CRENEAUX.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={pub.minutes === m} onClick={() => changer({ minutes: m })} className={`relative min-h-12 rounded-xl border-2 border-encre text-[13px] font-extrabold tabular-nums transition-transform active:scale-95 ${pub.minutes === m ? "bg-jaune shadow-[0_3px_0_var(--color-encre)]" : "bg-blanc"}`}>
                  {heure(m).replace(" h ", "h")}
                  {m === 19 * 60 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-encre bg-turquoise px-1.5 text-[9px] leading-[14px]">Conseillé</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="rounded-2xl border-2 border-encre bg-fond px-3 py-2.5 text-[14px] font-bold">
        {pub.programme ? `XPclip poste ${quand(pub)}.` : "Tes clips partent tout de suite."}
        <span className="block text-[12px] font-medium text-encre2">{pub.reseaux.length ? pub.reseaux.join(", ") : "Choisis au moins un réseau."}</span>
      </p>
    </div>
  );
}
