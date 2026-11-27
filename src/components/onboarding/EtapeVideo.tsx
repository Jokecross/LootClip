"use client";
/*
 * L'étape « ta vidéo », juste avant les offres : le lien, une courte préparation, puis l'aperçu.
 * Tout ce qui s'affiche est vrai : sa vraie vidéo (titre et miniature, sans la télécharger), ses réglages,
 * des clips SOUS CADENAS (rien n'est encore fabriqué), et la semaine que XPclip pourra programmer.
 * Les clips se lancent pour de vrai après le paiement, avec ce lien (gardé dans la session).
 */
import { useEffect, useState } from "react";
import { DUREES_CLIP, TYPES_CLIP } from "@/lib/clips-options";
import type { Reponses } from "@/lib/onboarding";

export type Apercu = { plateforme: string; titre: string | null; miniature: string | null; auteur: string | null };
export type PhaseVideo = "saisie" | "analyse" | "resultat";

export const RE_LIEN_VIDEO = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;
const PLATEFORMES = ["YouTube", "Twitch", "Kick", "X"];
const NOMS_RESEAUX: Record<string, string> = { tiktok: "TikTok", shorts: "Shorts", reels: "Reels" };

/** Les infos publiques de la vidéo (titre, miniature), lues par le serveur. */
export async function lireApercu(lien: string): Promise<Apercu | null> {
  const r = await fetch(`/api/apercu?url=${encodeURIComponent(lien)}`).catch(() => null);
  return r?.ok ? r.json() : null;
}

export function SaisieVideo({ lien, changer, faux }: { lien: string; changer: (v: string) => void; faux: boolean }) {
  return (
    <div className="ob-carte surgit">
      <label htmlFor="lien-video" className="ob-label">
        Lien de ta vidéo
      </label>
      <div className="ob-champ-lien" data-faux={faux}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400l-1 1M14 10a4.500 4.500 0 00-6.400 0l-3 3a4.500 4.500 0 006.400 6.400l1-1" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" />
        </svg>
        <input id="lien-video" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://www.youtube.com/watch?v=…" value={lien} aria-invalid={faux} onChange={(e) => changer(e.target.value)} />
      </div>
      {faux ? (
        <p role="alert" className="ob-erreur">
          Ce lien ne marche pas. Vérifie-le.
        </p>
      ) : (
        <ul className="ob-plateformes" aria-label="Liens acceptés">
          {PLATEFORMES.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <p className="ob-astuce">Une vidéo où quelqu&apos;un parle donne les meilleurs clips.</p>
    </div>
  );
}

/** La préparation : chaque étape cochée est vraie (lien reconnu, vidéo trouvée, réglages prêts). */
export function AnalyseVideo({ apercu, r, fini }: { apercu: Apercu | null | undefined; r: Reponses; fini: () => void }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 100);
    return () => clearInterval(id);
  }, []);
  const secondes = t / 10;
  // La vidéo est « trouvée » quand le serveur a répondu (au plus tôt à 2,5 s, pour qu'on la voie arriver).
  const trouvee = apercu !== undefined && secondes >= 2.5;
  const etapes = [
    { nom: "Lien reconnu", fait: secondes >= 1 },
    { nom: apercu?.titre ? "Vidéo trouvée" : "Vidéo reconnue", fait: trouvee },
    { nom: `Réglages prêts : ${TYPES_CLIP[typeDe(r)].nom}, ${DUREES_CLIP[dureeDe(r)].nom.toLowerCase()}`, fait: trouvee && secondes >= 6 },
    { nom: "Ton studio est prêt", fait: trouvee && secondes >= 9.5 },
  ];
  const faites = etapes.filter((e) => e.fait).length;
  useEffect(() => {
    if (faites === etapes.length) {
      const id = setTimeout(fini, 900);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faites]);
  return (
    <div className="ob-carte surgit">
      <div className="flex items-end justify-between">
        <span className="ob-label">On prépare ton studio…</span>
        <span className="titre text-[30px] tabular-nums">{Math.round((faites / etapes.length) * 100)} %</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full border-2 border-encre bg-beige">
        <span className="block h-full origin-left bg-rose transition-transform duration-700" style={{ transform: `scaleX(${Math.max(0.04, faites / etapes.length)})` }} />
      </div>
      <ol className="flex flex-col gap-2">
        {etapes.map((e, i) => (
          <li key={i} className={`flex items-center gap-2.5 text-[15px] font-bold transition-opacity ${e.fait || i === faites ? "" : "opacity-40"}`}>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-encre text-[12px] ${e.fait ? "bg-turquoise" : i === faites ? "bg-jaune" : "bg-blanc"}`}>{e.fait ? "✓" : ""}</span>
            {e.nom}
          </li>
        ))}
      </ol>
      {trouvee && <CarteVideo apercu={apercu} />}
    </div>
  );
}

function CarteVideo({ apercu }: { apercu: Apercu | null | undefined }) {
  return (
    <div className="vd-video surgit">
      {apercu?.miniature ? <img src={apercu.miniature} alt="" referrerPolicy="no-referrer" /> : <span className="vd-video-vide titre">{apercu?.plateforme ?? "Vidéo"}</span>}
      <div className="min-w-0">
        <p className="vd-titre">{apercu?.titre ?? "Ta vidéo"}</p>
        <p className="vd-auteur">
          {apercu?.plateforme ?? "Lien"}
          {apercu?.auteur ? ` · ${apercu.auteur}` : ""}
        </p>
      </div>
    </div>
  );
}

const typeDe = (r: Reponses) => {
  const s = r.stylesClips?.[0] ?? r.styleClips;
  return s === "drole" || s === "conseils" || s === "reactions" || s === "histoires" ? s : "meilleur";
};
const dureeDe = (r: Reponses) => (!r.destinations?.length || r.destinations.includes("tiktok") || r.destinations.includes("shorts") ? "courte" : "moyenne");

/** Le résultat : sa vidéo, des clips sous cadenas, et la semaine que XPclip programmera. */
export function ResultatVideo({ apercu, r }: { apercu: Apercu | null | undefined; r: Reponses }) {
  const reseaux = (r.destinations?.length ? r.destinations : ["tiktok"]).map((d) => NOMS_RESEAUX[d] ?? d);
  const parSemaine = Math.min(7, Math.max(1, r.frequence ?? 7));
  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  // Les jours de publication, répartis dans la semaine.
  const pris = new Set(Array.from({ length: parSemaine }, (_, i) => Math.floor(((i + 0.5) * 7) / parSemaine)));
  return (
    <div className="ob-carte surgit !gap-3">
      <CarteVideo apercu={apercu} />

      <div>
        <p className="vd-sous-titre">Tes clips</p>
        <ul className="vd-clips">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="vd-clip" style={{ "--i": n } as React.CSSProperties}>
              <span className="vd-clip-fond" style={apercu?.miniature ? { backgroundImage: `url(${apercu.miniature})` } : undefined} />
              <span className="vd-cadenas" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 11V8a5 5 0 0110 0v3M6 11h12v10H6z" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="vd-clip-nom">Clip {n}</span>
              <span className="vd-clip-note">??/100</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="vd-sous-titre">Ta semaine, programmée par XPclip</p>
        <ul className="vd-semaine">
          {jours.map((j, i) => (
            <li key={j} data-pris={pris.has(i)}>
              <span className="vd-jour">{j}</span>
              {pris.has(i) ? (
                <span className="vd-creneau">
                  <b>19h</b>
                  {reseaux.slice(0, 2).map((x) => (
                    <i key={x}>{x}</i>
                  ))}
                </span>
              ) : (
                <span className="vd-libre" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
