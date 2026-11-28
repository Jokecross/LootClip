"use client";
/*
 * Les écrans du studio de tournage qui n'existent pas tels quels sur le site :
 * la recommandation d'XPclip, les clips en grand avec leur note expliquée, la publication programmée.
 */
import "./studio.css";
import { useEffect, useState } from "react";
import { DEMO, type Demo } from "@/components/onboarding/demo";
import { COULEURS_SOUS_TITRES, DUREES_CLIP, FORMATS, TYPES_CLIP, type OptionsClips } from "@/lib/clips-options";
import { VUES_VISEES } from "@/lib/config";
import { gains } from "@/lib/format";
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

/* ---------- 2. Le montage réel, suivi en direct ---------- */

export type ClipVitrine = { url: string; poster?: string; titre: string; score: number; pourquoi?: string; forces?: string[] };

type EtatLot = {
  etape: "telechargement" | "transcription" | "choix" | "montage" | "fini";
  avancement: number;
  moments: { titre: string; score: number; pourquoi?: string; forces?: string[] }[];
  clips: { fichier: string; titre: string; score: number; url?: string }[];
  erreur: string | null;
};
const ETAPES_LOT = [
  { cle: "telechargement", libelle: "Vidéo récupérée", poids: [0, 0.25] },
  { cle: "transcription", libelle: "Transcription", poids: [0.25, 0.35] },
  { cle: "choix", libelle: "Moments forts", poids: [0.35, 0.45] },
  { cle: "montage", libelle: "Montage 9:16", poids: [0.45, 1] },
] as const;

export function MontageReel({ lot, fini, demo }: { lot: { id: string; erreur?: string }; fini: (clips: ClipVitrine[]) => void; demo: () => void }) {
  const [etat, setEtat] = useState<EtatLot | null>(null);
  const [erreur, setErreur] = useState(lot.erreur ?? "");
  const [debut] = useState(() => Date.now());
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => setErreur(lot.erreur ?? ""), [lot.erreur]);
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!lot.id) return;
    let fin = false;
    const suivre = async () => {
      if (fin) return;
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const rep = await fetch(`/api/clips/${lot.id}`, { cache: "no-store", headers: data.session ? { authorization: `Bearer ${data.session.access_token}` } : {} }).catch(() => null);
      const e: EtatLot | null = rep?.ok ? await rep.json().catch(() => null) : null;
      if (e) {
        setEtat(e);
        if (e.erreur) return setErreur(e.erreur);
        if (e.etape === "fini") {
          fin = true;
          const clips = e.clips.map((c, i) => ({
            url: c.url ?? `/api/clips/${lot.id}/${c.fichier}`,
            titre: c.titre,
            score: c.score,
            pourquoi: e.moments[i]?.pourquoi,
            forces: e.moments[i]?.forces,
          }));
          return setTimeout(() => fini(clips), 600);
        }
      }
      setTimeout(suivre, 2000);
    };
    suivre();
    return () => {
      fin = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot.id]);

  const i = Math.max(0, ETAPES_LOT.findIndex((x) => x.cle === etat?.etape));
  const [a, b] = etat?.etape === "fini" ? [1, 1] : ETAPES_LOT[i].poids;
  const t = etat ? a + (b - a) * Math.min(1, etat.avancement || 0) : 0.02;
  const secondes = Math.round((maintenant - debut) / 1000);

  if (erreur)
    return (
      <div className="ob-carte surgit">
        <p className="titre text-[22px]">L&apos;analyse n&apos;a pas marché.</p>
        <p className="text-[15px] font-semibold text-encre2">{erreur}</p>
        <p className="text-[13px] text-encre2">YouTube bloque souvent les serveurs en ligne. Essaie un lien Twitch, Kick ou X, ou lance le studio depuis ton Mac.</p>
        <button type="button" onClick={demo} className="bouton bouton-blanc w-full">
          Continuer avec la démo
        </button>
      </div>
    );

  return (
    <div className="ob-carte surgit">
      <div className="flex items-end justify-between">
        <span className="ob-label">{etat?.etape === "fini" ? "C'est prêt" : ETAPES_LOT[i].libelle}…</span>
        <span className="titre text-[34px] tabular-nums">{Math.round(t * 100)} %</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full border-2 border-encre bg-beige">
        <span className="block h-full origin-left bg-rose transition-transform duration-700" style={{ transform: `scaleX(${t})` }} />
      </div>
      <ol className="grid grid-cols-2 gap-2 text-[14px] font-bold">
        {ETAPES_LOT.map((e, k) => {
          const fait = etat?.etape === "fini" || k < i;
          return (
            <li key={e.cle} className={`flex items-center gap-2 ${k > i ? "opacity-40" : ""}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full border-2 border-encre ${fait ? "bg-turquoise" : k === i ? "bg-jaune" : "bg-blanc"}`}>{fait ? "✓" : ""}</span>
              {e.libelle}
            </li>
          );
        })}
      </ol>
      <ul className="flex flex-col gap-2">
        {(etat?.moments ?? []).map((m, k) => (
          <li key={k} className="surgit flex items-center justify-between gap-3 rounded-xl border-2 border-encre bg-fond px-3 py-2 text-[14px] font-bold">
            <span className="min-w-0 truncate">{m.titre}</span>
            <span className="rounded-lg border-2 border-encre bg-jaune px-2 text-[12px]">{m.score}/100</span>
          </li>
        ))}
      </ul>
      <p className="text-[12px] font-semibold text-encre2 tabular-nums">
        Analyse réelle · {Math.floor(secondes / 60)} min {String(secondes % 60).padStart(2, "0")} s
      </p>
    </div>
  );
}

/* ---------- 3. Les clips en grand ---------- */

/** Les vues visées par un clip (2 chiffres significatifs) et le revenu visé qui en découle, d'après sa note. */
function objectifClip(note: number) {
  const brut = VUES_VISEES.base * Math.pow(VUES_VISEES.facteur, note - 50);
  const pas = Math.pow(10, Math.max(0, Math.floor(Math.log10(brut)) - 1));
  const vues = Math.round(brut / pas) * pas;
  const arrondi = (x: number) => (x >= 100 ? Math.round(x / 10) * 10 : Math.max(1, Math.round(x)));
  const { bas, haut } = gains(vues);
  return { vues: vues >= 1000 ? `${new Intl.NumberFormat("fr-FR").format(Math.round(vues / 1000))} k` : String(vues), argent: `${arrondi(bas)} à ${arrondi(haut)} €` };
}

export function VitrineClips({ nombre, clips: vrais, demo = DEMO }: { nombre: number; clips?: ClipVitrine[]; /** La démo choisie dans la régie. */ demo?: Demo }) {
  const clips: ClipVitrine[] = vrais?.length
    ? vrais
    : demo.clips.slice(0, Math.min(nombre, demo.clips.length)).map((c) => ({ url: `/v4/${c.nom}.mp4`, poster: `/v4/${c.nom}.webp`, titre: c.titre, score: c.score, pourquoi: c.pourquoi, forces: c.forces }));
  const [k, setK] = useState(0);
  const c = clips[Math.min(k, clips.length - 1)];
  const objectif = objectifClip(c.score);
  return (
    <div className="studio-clips surgit">
      <div className="studio-tel">
        <video key={c.url} src={c.url} poster={c.poster} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        <span className="studio-rang">
          Clip {k + 1} / {clips.length}
        </span>
      </div>

      <div className="studio-infos">
        <div className="studio-note" key={c.url}>
          <span className="titre">{c.score}</span>
          <span>
            <b>/100</b>
            Note XPclip
          </span>
        </div>
        <p className="titre studio-titre">{c.titre}</p>
        <div className="studio-stats" key={`s-${c.url}`}>
          <p>
            <span>Vues visées</span>
            <b className="titre tabular-nums">{objectif.vues}</b>
          </p>
          <p className="studio-stat-argent">
            <span>Objectif de revenus</span>
            <b className="titre tabular-nums">{objectif.argent}</b>
          </p>
        </div>
      </div>

      <div className="studio-detail">
        {c.pourquoi && (
          <p className="studio-pourquoi">
            <span className="studio-label">Pourquoi cette note</span>
            {c.pourquoi}
          </p>
        )}
        {!!c.forces?.length && (
          <ul className="studio-forces">
            {c.forces.slice(0, 3).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <div className="studio-choix" role="tablist" aria-label="Tes clips">
          {clips.map((x, i) => (
            <button key={x.url} type="button" role="tab" aria-selected={i === k} onClick={() => setK(i)}>
              {x.poster ? <img src={x.poster} alt="" width={432} height={768} /> : <video src={`${x.url}#t=1.5`} muted playsInline preload="metadata" />}
              <span>{x.score}</span>
            </button>
          ))}
        </div>
        <p className="studio-mention">Objectifs fixés par XPclip, selon la note. Pas une promesse de gains.</p>
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
