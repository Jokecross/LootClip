"use client";
/*
 * Les écrans à réponses de l'onboarding, en « look outil » (comme l'accueil V6). Servis par /commencer et par /studio.
 * Parcours « lien → clips » : activité, réseaux, genre de clips, aperçu, rythme, objectif, plan.
 * Les écrans de l'ancien parcours (console, heures de jeu) restent pour le studio de tournage.
 */
import "./onboarding.css";
import { useEffect, useRef, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { Objet } from "@/components/objets/Objet";
import { Question } from "@/components/onboarding/Cadre";
import { AvantApres } from "@/components/onboarding/AvantApres";
import { Vitrine } from "@/components/onboarding/Vitrine";
import { Titre } from "@/components/ui/Duo";
import { Coche } from "@/components/ui/Parcours";
import { Roulette } from "@/components/ui/Roulette";
import { ONBOARDING } from "@/lib/config";
import type { Profil } from "@/lib/etat";
import { nombre, videos, vuesLisibles } from "@/lib/format";
import { clipsPourLongues, CLIPS_SEMAINE, CLIPS_SEMAINE_DEFAUT, LONGUES, LONGUES_DEFAUT, plan, videosPourHeures, type Activite, type Destination, type Reponses, type StyleClips } from "@/lib/onboarding";
import { bravo, cran, pop } from "@/lib/sons";

type Props = { r: Reponses; repondre: (x: Reponses) => void };

export const REPERE_HEURES = "Notre repère : une vidéo par heure de jeu. Trois par jour maximum.";
export const REPERE_RYTHME = "Une vidéo longue donne plusieurs clips. Trois par jour maximum.";

const clips = (n: number) => `${nombre(n)} clip${n >= 2 ? "s" : ""}`;

/** L'étiquette sous le montant choisi. */
function palier(objectif: number) {
  if (objectif < 250) return { texte: "Un premier palier", fond: "bg-turquoise" };
  if (objectif < 1000) return { texte: "Un vrai complément", fond: "bg-jaune" };
  if (objectif < 4000) return { texte: "Un deuxième salaire", fond: "bg-orange" };
  return { texte: "Le niveau des gros comptes", fond: "bg-rose" };
}

/*
 * Chaque écran rend sa partie gauche (la question) et sa partie droite (la réponse),
 * posées par <Cadre> : l'une sous l'autre sur téléphone, côte à côte sur ordinateur.
 */
export type Parties = { gauche: React.ReactNode; droite: React.ReactNode; fond?: string; large?: boolean; centre?: boolean };

export const MENTION_PRINCIPE = "Tout dépend de tes vues. Aucun revenu n'est garanti.";

function Valide({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="currentColor" strokeWidth="3.200" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** L'accroche : la promesse, et une petite interface XPclip qui tourne. */
export function ecranAccroche(): Parties {
  return {
    gauche: (
      <div className="ob-accroche arrivee">
        <p className="ob-sur">
          <i aria-hidden="true" />
          Clips IA pour streamers, podcasts et créateurs
        </p>
        <h1 className="titre">
          Une vidéo longue. <span className="ob-surligne">Des clips prêts</span> à poster.
        </h1>
        <p className="ob-sous">Tu colles le lien. XPclip coupe, cadre et sous-titre.</p>
        <ul className="ob-atouts">
          {["Moments forts notés sur 100", "Sous-titres mot à mot", "Cadrage vertical automatique"].map((t) => (
            <li key={t}>
              <Valide className="ob-atout-coche" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    ),
    droite: <Vitrine />,
    fond: "jaune",
  };
}

/** Le principe, pour les débutants : la vidéo longue, puis les vrais clips qui en sortent. */
export function ecranPrincipe(): Parties {
  return {
    gauche: (
      <Question avant="Comment ça marche" sous="Tu colles le lien. XPclip fait tout le reste.">
        Une vidéo longue devient plusieurs clips.
      </Question>
    ),
    droite: <AvantApres />,
    fond: "turquoise",
    large: true,
  };
}

/* ---------- Petits pictos des tuiles (traits encre, sans logo de marque) ---------- */
const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const PICTOS: Record<string, React.ReactNode> = {
  stream: (
    <svg viewBox="0 0 48 48" {...trait}>
      <rect x="6" y="10" width="36" height="24" rx="5" />
      <path d="M18 40h12M24 34v6" />
      <circle cx="15" cy="18" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
  debut: (
    <svg viewBox="0 0 48 48" {...trait}>
      <path d="M24 8l4.500 9.500L38 19l-7 7 1.700 10L24 31.300 15.300 36 17 26l-7-7 9.500-1.500z" />
    </svg>
  ),
  podcast: (
    <svg viewBox="0 0 48 48" {...trait}>
      <rect x="17" y="6" width="14" height="24" rx="7" />
      <path d="M11 22a13 13 0 0 0 26 0M24 35v7M17 42h14" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 48 48" {...trait}>
      <rect x="5" y="11" width="38" height="26" rx="8" />
      <path d="M21 18v12l10-6z" fill="currentColor" />
    </svg>
  ),
  clippeur: (
    <svg viewBox="0 0 48 48" {...trait}>
      <circle cx="13" cy="34" r="6" />
      <circle cx="35" cy="34" r="6" />
      <path d="M17 30 34 8M31 30 14 8" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 48 48" {...trait}>
      <rect x="14" y="5" width="20" height="38" rx="5" />
      <path d="M21 38h6" />
      <path d="m21 18 8 5-8 5z" fill="currentColor" />
    </svg>
  ),
  shorts: (
    <svg viewBox="0 0 48 48" {...trait}>
      <rect x="14" y="5" width="20" height="38" rx="5" />
      <path d="M19 12h10M19 36h10" />
      <path d="m21 19 8 5-8 5z" fill="currentColor" />
    </svg>
  ),
  reels: (
    <svg viewBox="0 0 48 48" {...trait}>
      <rect x="8" y="8" width="32" height="32" rx="9" />
      <path d="M8 17h32M16 8l5 9M26 8l5 9" />
      <path d="m21 23 8 5-8 5z" fill="currentColor" />
    </svg>
  ),
  auto: (
    <svg viewBox="0 0 48 48" {...trait}>
      <path d="m24 6 4.5 11.5L40 22l-11.5 4.5L24 38l-4.5-11.5L8 22l11.5-4.5z" />
    </svg>
  ),
  drole: (
    <svg viewBox="0 0 48 48" {...trait}>
      <circle cx="24" cy="24" r="17" />
      <path d="M15 27c2 6 16 6 18 0zM17 19l4 2M31 19l-4 2" />
    </svg>
  ),
  conseils: (
    <svg viewBox="0 0 48 48" {...trait}>
      <path d="M17 32c-5-4-6-8-6-11a13 13 0 0 1 26 0c0 3-1 7-6 11zM19 38h10M21 43h6" />
    </svg>
  ),
  reactions: (
    <svg viewBox="0 0 48 48" {...trait}>
      <path d="M26 5 12 27h11l-3 16 16-23H25z" />
    </svg>
  ),
  abonnes: (
    <svg viewBox="0 0 48 48" {...trait}>
      <circle cx="18" cy="17" r="6" />
      <path d="M7 38a11 11 0 0 1 22 0M31 12a6 6 0 0 1 0 11M35 30a10 10 0 0 1 6 8" />
    </svg>
  ),
  vide: (
    <svg viewBox="0 0 48 48" {...trait}>
      <rect x="14" y="5" width="20" height="38" rx="5" />
      <path d="M21 38h6" />
      <path d="M19 16h10M19 22h6" strokeDasharray="2 3" />
    </svg>
  ),
  non: (
    <svg viewBox="0 0 48 48" {...trait}>
      <circle cx="24" cy="24" r="17" strokeDasharray="5 4" />
      <path d="M24 16v16M16 24h16" />
    </svg>
  ),
  histoires: (
    <svg viewBox="0 0 48 48" {...trait}>
      <path d="M8 10c6-2 11-1 16 3 5-4 10-5 16-3v28c-6-2-11-1-16 3-5-4-10-5-16-3zM24 13v28" />
    </svg>
  ),
};


type Tuile = { valeur: string; libelle: string; indice?: string; fond: string };

/** Les choix, en lignes propres : le choix fait passe en jaune. `plusieurs` : on peut en cocher autant qu'on veut. */
function Tuiles({ tuiles, choisies, choisir, label, plusieurs = false }: { tuiles: Tuile[]; choisies: string[]; choisir: (v: string) => void; label: string; plusieurs?: boolean }) {
  return (
    <div className={`ob-tuiles ${tuiles.length <= 3 ? "ob-tuiles-trois" : ""} ${tuiles.length === 5 ? "ob-tuiles-cinq" : ""}`} role={plusieurs ? "group" : "radiogroup"} aria-label={label}>
      {tuiles.map((t, i) => {
        const actif = choisies.includes(t.valeur);
        return (
          <button
            key={t.valeur}
            type="button"
            role={plusieurs ? "checkbox" : "radio"}
            aria-checked={actif}
            onClick={() => {
              pop(0.4 + i * 0.18);
              choisir(t.valeur);
            }}
            style={{ "--d": `${i * 50}ms` } as React.CSSProperties}
            className="ob-tuile surgit"
          >
            <span className={`ob-tuile-picto ${t.fond}`} aria-hidden="true">
              {PICTOS[t.valeur]}
            </span>
            <span className="ob-tuile-texte">
              <span className="titre block">{t.libelle}</span>
              {t.indice && <small>{t.indice}</small>}
            </span>
            <span className={`ob-tuile-coche ${plusieurs ? "ob-tuile-carre" : ""}`} aria-hidden="true">
              <Valide />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ecranActivite({ r, repondre }: Props): Parties {
  return {
    gauche: (
      <Question avant="Ton profil" sous="Choisis ce qui te ressemble le plus.">
        Tu veux faire des clips avec quoi&nbsp;?
      </Question>
    ),
    droite: (
      <Tuiles
        label="Tes vidéos"
        tuiles={[
          { valeur: "stream", libelle: "Mes lives", indice: "Je streame sur Twitch, Kick ou YouTube", fond: "bg-rose" },
          { valeur: "youtube", libelle: "Mes vidéos YouTube", indice: "Vlogs, jeux, tutos, réactions", fond: "bg-jaune" },
          { valeur: "podcast", libelle: "Mon podcast", indice: "Ou des interviews filmées", fond: "bg-turquoise" },
          { valeur: "clippeur", libelle: "Les vidéos d'un créateur", indice: "Je fais des clips pour quelqu'un", fond: "bg-orange" },
          { valeur: "debut", libelle: "Je débute", indice: "Je n'ai pas encore de vidéos", fond: "bg-blanc" },
        ]}
        choisies={r.activite ? [r.activite] : []}
        choisir={(v) => repondre({ activite: v as Activite })}
      />
    ),
    fond: "orange",
    large: true,
  };
}

export function ecranDestinations({ r, repondre }: Props): Parties {
  const choisies = r.destinations ?? [];
  return {
    gauche: (
      <Question avant="Tes réseaux" sous="Coches-en autant que tu veux. Même format partout.">
        Tu veux poster où ?
      </Question>
    ),
    droite: (
      <Tuiles
        plusieurs
        label="Où poster tes clips"
        tuiles={[
          { valeur: "tiktok", libelle: "TikTok", indice: "Vertical 9:16", fond: "bg-rose" },
          { valeur: "shorts", libelle: "YouTube Shorts", indice: "Vertical 9:16", fond: "bg-orange" },
          { valeur: "reels", libelle: "Instagram Reels", indice: "Vertical 9:16", fond: "bg-turquoise" },
        ]}
        choisies={choisies}
        choisir={(v) => {
          const d = v as Destination;
          repondre({ destinations: choisies.includes(d) ? choisies.filter((x) => x !== d) : [...choisies, d] });
        }}
      />
    ),
    fond: "jaune",
    large: true,
  };
}

/** Les genres de clips. `clip` : le montage XPclip de Martin montré dans l'aperçu (accroche déjà dedans). */
export const GENRES: Record<StyleClips, { libelle: string; indice: string; fond: string; clip: string; mots: string[] }> = {
  auto: { libelle: "Les meilleurs moments", indice: "Je choisis pour toi", fond: "bg-jaune", clip: "defi", mots: ["REGARDE", "BIEN", "CE", "QUI", "ARRIVE", "LÀ"] },
  drole: { libelle: "Moments drôles", indice: "Fous rires et fails", fond: "bg-turquoise", clip: "drole", mots: ["NON", "MAIS", "ATTENDS", "IL", "A", "FAIT", "ÇA"] },
  conseils: { libelle: "Conseils et astuces", indice: "Ce qui apprend un truc", fond: "bg-orange", clip: "defi", mots: ["LE", "SECRET", "C'EST", "DE", "FAIRE", "ÇA"] },
  reactions: { libelle: "Réactions fortes", indice: "Cris, surprises, clashs", fond: "bg-rose", clip: "defi", mots: ["OH", "NON", "C'EST", "PAS", "POSSIBLE"] },
  histoires: { libelle: "Histoires racontées", indice: "Un début, une chute", fond: "bg-blanc", clip: "mission", mots: ["ET", "LÀ", "TU", "SAIS", "CE", "QU'IL", "FAIT"] },
};

export function ecranStyle({ r, repondre }: Props): Parties {
  const choisis = r.stylesClips ?? (r.styleClips ? [r.styleClips] : []);
  const basculer = (v: StyleClips) => {
    const liste = choisis.includes(v) ? choisis.filter((x) => x !== v) : [...choisis, v];
    repondre({ stylesClips: liste, styleClips: liste[0] });
  };
  return {
    gauche: (
      <Question avant="Type de clips" sous="Choisis-en autant que tu veux. Tu pourras changer.">
        Quels clips tu veux&nbsp;?
      </Question>
    ),
    droite: (
      <Tuiles
        label="Genre de clips"
        plusieurs
        tuiles={(Object.keys(GENRES) as StyleClips[]).map((k) => ({ valeur: k, libelle: GENRES[k].libelle, indice: GENRES[k].indice, fond: GENRES[k].fond }))}
        choisies={choisis}
        choisir={(v) => basculer(v as StyleClips)}
      />
    ),
    fond: "rose",
    large: true,
  };
}

export function ecranApercu({ r }: { r: Reponses }): Parties {
  const genre = GENRES[r.styleClips ?? "auto"];
  return {
    gauche: (
      <Question
        avant="Aperçu"
        sous="Cadrés en vertical, sous-titrés, avec une accroche. Prêts à poster."
        plus={
          <ul className="ob-atouts ob-atouts-bas">
            {["Les meilleurs moments", "Sous-titres mot à mot", "Accroche écrite", "Format TikTok, Shorts, Reels"].map((t) => (
              <li key={t}>
                <Valide className="ob-atout-coche" />
                {t}
              </li>
            ))}
          </ul>
        }
      >
        Tes clips ressembleront à ça.
      </Question>
    ),
    droite: <Apercu clip={genre.clip} mots={genre.mots} genre={genre.libelle} />,
    fond: "turquoise",
  };
}

function Apercu({ clip, mots, genre }: { clip: string; mots: string[]; genre: string }) {
  // Groupes de 3 mots maximum, le mot prononcé passe en jaune : comme le moteur.
  const groupes: string[][] = [];
  for (let i = 0; i < mots.length; i += 3) groupes.push(mots.slice(i, i + 3));
  const [k, setK] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setK((x) => (x + 1) % mots.length), 420);
    return () => clearInterval(id);
  }, [mots.length]);
  const g = Math.floor(k / 3);
  const reglages = [
    { nom: "Type", valeur: genre },
    { nom: "Couleur", valeur: "Jaune", pastille: "bg-jaune" },
    { nom: "Place", valeur: "Bas" },
    { nom: "Format", valeur: "Auto" },
  ];
  return (
    <div className="ob-apercu" aria-hidden="true">
      <div className="ob-apercu-tel">
        <div className="m-tel-ecran">
          <Boucle nom={`clips/${clip}`} />
          <span key={g} className="ob-st">
            {groupes[g].map((m, i) => (
              <b key={i} className={g * 3 + i === k ? "ob-st-actif" : ""}>
                {m}
              </b>
            ))}
          </span>
        </div>
      </div>
      <div className="ob-panneau">
        <p className="ob-panneau-titre">Tes réglages</p>
        <ul>
          {reglages.map((x) => (
            <li key={x.nom}>
              <span>{x.nom}</span>
              <b>
                {x.pastille && <i className={x.pastille} />}
                {x.valeur}
              </b>
            </li>
          ))}
        </ul>
        <p className="ob-panneau-note">Tout se change dans le studio.</p>
      </div>
    </div>
  );
}

/** Une réglette : le chiffre au milieu, moins et plus de chaque côté, un curseur dessous. */
function Reglette<T extends number>({ valeurs, valeur, changer, libelle, label, children }: { valeurs: readonly T[]; valeur: T; changer: (v: T) => void; libelle: (v: T) => string; label: string; children: React.ReactNode }) {
  const trouve = valeurs.indexOf(valeur);
  const i = trouve >= 0 ? trouve : 0;
  const dernier = valeurs.length - 1;
  const aller = (j: number) => {
    const k = Math.min(dernier, Math.max(0, j));
    if (k === i) return;
    cran(0.3 + (k / dernier) * 0.7);
    changer(valeurs[k]);
  };
  return (
    <div className="ob-reglette">
      <div className="ob-reglette-ligne">
        <button type="button" className="ob-pas" onClick={() => aller(i - 1)} disabled={i <= 0} aria-label="Moins">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12h12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <div className="ob-reglette-valeur">{children}</div>
        <button type="button" className="ob-pas" onClick={() => aller(i + 1)} disabled={i >= dernier} aria-label="Plus">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <input
        type="range"
        className="curseur ob-curseur"
        min={0}
        max={dernier}
        step={1}
        value={i}
        aria-label={label}
        aria-valuetext={libelle(valeurs[i])}
        style={{ "--p": `${(i / dernier) * 100}%` } as React.CSSProperties}
        onChange={(e) => aller(Number(e.target.value))}
      />
      <div className="ob-reglette-bornes">
        <span>{libelle(valeurs[0])}</span>
        <span>{libelle(valeurs[dernier])}</span>
      </div>
    </div>
  );
}

/** Le rythme : combien de vidéos longues par semaine, donc combien de clips à poster. */
export function ecranRythme({ r, repondre }: Props): Parties {
  const parSemaine = r.frequence ?? CLIPS_SEMAINE_DEFAUT;
  const libelle = (v: number) => clips(v);
  const rythme = parSemaine >= 14 ? `${Math.round(parSemaine / 7)} clips par jour` : parSemaine >= 7 ? "1 clip par jour" : parSemaine >= 3 ? "1 clip tous les 2 jours" : "Pour tester tranquillement";
  return {
    gauche: (
      <Question avant="Ton rythme" sous="Tu pourras changer quand tu veux.">
        Tu veux poster combien de clips par semaine&nbsp;?
      </Question>
    ),
    droite: (
      <div className="ob-carte surgit">
        <Reglette label="Clips par semaine" valeurs={CLIPS_SEMAINE} valeur={(CLIPS_SEMAINE as readonly number[]).includes(parSemaine) ? (parSemaine as (typeof CLIPS_SEMAINE)[number]) : CLIPS_SEMAINE_DEFAUT} libelle={libelle} changer={(v) => repondre({ frequence: v, longues: Math.max(1, Math.ceil(v / 3)) })}>
          <Grand cle={parSemaine}>{parSemaine}</Grand>
          <p className="ob-unite">{parSemaine > 1 ? "clips" : "clip"} par semaine</p>
        </Reglette>
        <div className="ob-resultat">
          <div>
            <p className="ob-resultat-nom">Ton rythme</p>
            <p className="titre ob-resultat-chiffre">{rythme}</p>
          </div>
          <Semaine n={parSemaine} />
        </div>
      </div>
    ),
    fond: "orange",
  };
}

export function ecranConsole({ r, repondre }: Props): Parties {
  return {
    gauche: <Titre sous="Le tutoriel s'adapte à ta console.">Tu joues sur quoi ?</Titre>,
    droite: (
      <Choix
        label="Ta console"
        options={[
          { valeur: "ps5", libelle: "PS5", indice: "PlayStation 5", fond: "bg-turquoise", scene: <Objet nom="manette" className="absolute inset-x-[7%] inset-y-[8%] lg:inset-x-[10%]" /> },
          { valeur: "xbox", libelle: "Xbox", indice: "Series X ou S", fond: "bg-rose", scene: <Objet nom="manette2" className="absolute inset-x-[7%] inset-y-[8%] lg:inset-x-[10%]" /> },
        ]}
        valeur={r.plateforme}
        choisir={(v) => repondre({ plateforme: v as Profil["plateforme"] })}
      />
    ),
    fond: "orange",
  };
}

export function ecranTiktok({ r, repondre }: Props): Parties {
  return {
    gauche: (
      <Question avant="Ta page" sous="Aucun souci si tu pars de zéro.">
        Tu as déjà une page TikTok ?
      </Question>
    ),
    droite: (
      <Tuiles
        label="Ta page TikTok"
        tuiles={[
          { valeur: "abonnes", libelle: "Oui, avec des abonnés", indice: "Tu postes déjà", fond: "bg-orange" },
          { valeur: "vide", libelle: "Oui, mais elle est vide", indice: "Tu n'as pas encore posté", fond: "bg-turquoise" },
          { valeur: "non", libelle: "Non, pas encore", indice: "On la crée ensemble", fond: "bg-jaune" },
        ]}
        choisies={r.tiktok ? [r.tiktok] : []}
        choisir={(v) => repondre({ tiktok: v as Profil["tiktok"] })}
      />
    ),
    fond: "rose",
    large: true,
  };
}

export function ecranObjectif({ r, repondre }: Props): Parties {
  const objectif = r.objectif ?? ONBOARDING.objectifParDefaut;
  const p = palier(objectif);
  return {
    gauche: (
      <Question avant="Ton objectif" sous="Fixe ton objectif. Tu pourras le changer.">
        Tu vises combien par mois ?
      </Question>
    ),
    droite: (
      <div className="ob-carte surgit">
        <Reglette label="Objectif par mois" valeurs={ONBOARDING.objectifs} valeur={objectif} libelle={(v) => `${nombre(v)} €`} changer={(v) => repondre({ objectif: v })}>
          <Grand cle={objectif}>{nombre(objectif)}&nbsp;€</Grand>
          <p className="ob-unite">objectif par mois</p>
        </Reglette>
        <p className="ob-palier">
          <span className={`pastille ${p.fond}`}>{p.texte}</span>
        </p>
      </div>
    ),
    fond: "orange",
  };
}

export function ecranHeures({ r, repondre }: Props): Parties {
  const heures = r.heures ?? ONBOARDING.heuresParDefaut;
  const parSemaine = r.frequence ?? videosPourHeures(heures);
  const part = heures / ONBOARDING.heures[ONBOARDING.heures.length - 1];
  return {
    gauche: (
      <>
        <Titre
          sous="Plus tu joues, plus tu as de quoi poster."
          plus={
            <div className="mt-6 hidden items-center gap-8 lg:flex">
              <Semaine n={parSemaine} />
              <p className="titre !mt-0 whitespace-nowrap !text-[clamp(28px,2.600vw,46px)] !text-encre">
                {videos(parSemaine)}
                <span className="mt-1 block text-[18px] font-medium tracking-normal [font-family:var(--font-texte)]">par semaine</span>
              </p>
            </div>
          }
        >
          Tu joues combien d&apos;heures par semaine&nbsp;?
        </Titre>
        <div className="my-auto flex items-center justify-between gap-4 py-3 lg:hidden">
          <div>
            <Grand cle={heures}>{heures}&nbsp;h</Grand>
            <p className="mt-2 text-[16px] font-bold leading-tight">
              {videos(parSemaine)}
              <span className="block text-[14px] font-medium">par semaine</span>
            </p>
          </div>
          <Semaine n={parSemaine} />
        </div>
      </>
    ),
    droite: (
      <>
        <Roulette
          nu
          label="Heures de jeu par semaine"
          valeurs={ONBOARDING.heures}
          valeur={heures}
          libelle={(v) => `${v} h`}
          changer={(v) => repondre({ heures: v, frequence: videosPourHeures(v) })}
          centre={
            <div className="pb-[8%]">
              <Grand cle={heures}>{heures}&nbsp;h</Grand>
            </div>
          }
        />
      </>
    ),
    fond: "turquoise",
  };
}

export function ecranPlan({ objectif, frequence }: { objectif: number; frequence: number }): Parties {
  const p = plan(objectif, frequence);
  const apparait = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
  return {
    gauche: (
      <Question avant="Ton plan" sous="On place la barre 6 % plus haut, pour dépasser ton objectif.">
        {`Voilà comment viser ${nombre(objectif)} € par mois.`}
      </Question>
    ),
    droite: (
      <div className="ob-plan">
        <div className="ob-plan-ligne">
          <div className="ob-stat surgit" style={apparait(120)}>
            <p className="ob-stat-nom">Tu postes</p>
            <p className="titre ob-stat-chiffre">{clips(p.parMois)}</p>
            <p className="ob-stat-note">par mois, {frequence} par semaine</p>
          </div>
          <span className="ob-signe surgit" style={apparait(220)} aria-label="fois">
            ×
          </span>
          <div className="ob-stat surgit" style={apparait(260)}>
            <p className="ob-stat-nom">Objectif par clip</p>
            <p className="titre ob-stat-chiffre">
              <span className="ob-stat-petit">environ </span>
              {euros(p.booste / p.parMois)}
            </p>
            <p className="ob-stat-note">
              avec {vuesLisibles(p.vuesParVideoMin)} à {vuesLisibles(p.vuesParVideoMax)} {p.vuesParVideoMax >= 1_000_000 ? "de vues" : "vues"}
            </p>
          </div>
        </div>
        <div className="ob-total surgit" style={apparait(420)}>
          <span className="ob-signe ob-signe-haut" aria-label="égale">
            =
          </span>
          <p className="ob-stat-nom">Ton objectif par mois</p>
          <p className="titre ob-total-chiffre">
            <Compteur de={objectif} vers={p.booste} attente={800} />
            &nbsp;€
          </p>
          <p className="ob-stat-note">
            avec {vuesLisibles(p.vuesMin)} à {vuesLisibles(p.vuesMax)} {p.vuesMax >= 1_000_000 ? "de vues" : "vues"} par mois
          </p>
        </div>
      </div>
    ),
    fond: "jaune",
    large: true,
  };
}

/** 75,7 → « 76 € » ; 1,4 → « 1,40 € » */
const euros = (n: number) => (n >= 10 ? `${nombre(Math.round(n))} €` : `${n.toFixed(2).replace(".", ",")} €`);

/** Cartes de choix : la carte choisie s'enfonce, comme une touche. */
function Choix({ options, valeur, choisir, label }: { options: { valeur: string; libelle: string; indice?: string; scene: React.ReactNode; fond: string }[]; valeur?: string; choisir: (v: string) => void; label: string }) {
  const trois = options.length > 2;
  return (
    <div className={`choix-liste ${trois ? "choix-trois" : ""}`} role="radiogroup" aria-label={label}>
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
            style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
            className="choix surgit"
          >
            <span className={`choix-vue ${o.fond}`}>{o.scene}</span>
            <span className="choix-nom">
              <span className="min-w-0 flex-1">
                <span className="titre block">{o.libelle}</span>
                {o.indice && <small>{o.indice}</small>}
              </span>
              <span className={`choix-rond ${actif ? "choix-rond-oui" : ""}`}>{actif && <Coche className="h-full w-full" />}</span>
            </span>
          </button>
        );
      })}
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
    <p ref={ref} className="titre whitespace-nowrap text-[64px] tabular-nums [@media(min-height:780px)]:text-[min(84px,21vw)] max-lg:[@media(max-height:720px)]:!text-[52px] lg:!text-[clamp(52px,min(5.200vw,9.400vh),88px)]" aria-live="off">
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
function Compteur({ de, vers, attente }: { de: number; vers: number; attente: number }) {
  const [v, setV] = useState(de);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(vers);
      return;
    }
    const duree = 1100;
    const t0 = performance.now() + attente;
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
  }, [de, vers, attente]);
  return <span className="tabular-nums">{nombre(v)}</span>;
}
