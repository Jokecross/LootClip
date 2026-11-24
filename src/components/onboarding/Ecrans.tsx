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

export const MENTION_PRINCIPE = "Tout dépend de tes vues. Aucun revenu n'est garanti.";

/** Le principe, avant les questions : ce sont ses parties à lui, pas les vidéos des autres. */
export function ecranPrincipe(): Parties {
  const etapes = [
    { titre: "Tu joues à GTA 6", texte: "Sur ta PS5 ou ta Xbox.", fond: "bg-turquoise", image: <Manette sticks="bas" /> },
    { titre: "Tu gardes tes meilleurs moments", texte: "Un bouton sur ta manette.", fond: "bg-jaune", image: <Dessin nom="capture" /> },
    { titre: "XPclip monte tes vidéos", texte: "Prêtes en une minute environ.", fond: "bg-orange", image: <Dessin nom="montage" /> },
    { titre: "Tu postes, tes vues peuvent payer", texte: "Sur TikTok et Instagram.", fond: "bg-rose", image: <Dessin nom="vues" /> },
  ];
  return {
    gauche: (
      <>
        <span className="pastille w-fit bg-turquoise lg:min-h-9 lg:px-4 lg:text-[16px]">100 % tes propres clips</span>
        <div className="mt-3 lg:mt-6">
          <Titre sous="Pas de vidéo YouTube reprise. Que tes parties à toi.">
            Ton jeu. <br className="hidden lg:block" />
            Tes clips. <br className="hidden lg:block" />
            Ton argent.
          </Titre>
        </div>
      </>
    ),
    droite: (
      <ol className="flex flex-col gap-2.5 lg:min-h-0 lg:flex-1 lg:gap-5">
        {etapes.map((e, i) => (
          <li key={e.titre} className={`surgit carte-forte flex items-center gap-3.5 bg-blanc p-3 max-lg:[@media(max-height:720px)]:py-1.5 lg:min-h-0 lg:flex-1 lg:gap-7 lg:rounded-3xl lg:px-7 lg:py-3 lg:shadow-[0_6px_0_var(--color-encre)]`} style={{ "--d": `${250 + i * 420}ms` } as React.CSSProperties}>
            <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-encre p-2 max-lg:[@media(max-height:720px)]:h-12 max-lg:[@media(max-height:720px)]:w-12 max-lg:[@media(max-height:720px)]:rounded-xl max-lg:[@media(max-height:720px)]:p-1.5 lg:h-[min(13vh,128px)] lg:w-[min(13vh,128px)] lg:rounded-3xl lg:p-3 ${e.fond}`}>{e.image}</span>
            <span className="min-w-0">
              <span className="titre block text-[19px] lg:text-[clamp(26px,2.5vw,46px)]">
                {i + 1}. {e.titre}
              </span>
              <span className="mt-1 block text-[13px] text-encre2 lg:mt-2 lg:text-[clamp(16px,1.3vw,22px)]">{e.texte}</span>
            </span>
          </li>
        ))}
      </ol>
    ),
    fond: "lg:bg-nuit2",
  };
}

function Dessin({ nom }: { nom: "capture" | "montage" | "vues" }) {
  const t = { stroke: "var(--color-encre)", strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 100 100" className="block h-full w-full" aria-hidden="true">
      {nom === "capture" && (
        <>
          <path d="M12 30V12h18M70 12h18v18M88 70v18H70M30 88H12V70" fill="none" {...t} strokeWidth={7} />
          <circle cx="50" cy="50" r="21" fill="var(--color-rose)" {...t} />
        </>
      )}
      {nom === "montage" && (
        <>
          <rect x="28" y="6" width="44" height="88" rx="10" fill="var(--color-blanc)" {...t} />
          <path d="M42 36l20 14-20 14z" fill="var(--color-rose)" {...t} />
          <path d="M8 38v24M92 38v24" {...t} strokeWidth={8} />
        </>
      )}
      {nom === "vues" && (
        <>
          <rect x="10" y="60" width="20" height="30" rx="5" fill="var(--color-turquoise)" {...t} />
          <rect x="40" y="42" width="20" height="48" rx="5" fill="var(--color-jaune)" {...t} />
          <rect x="70" y="18" width="20" height="72" rx="5" fill="var(--color-blanc)" {...t} />
          <path d="M12 38L46 10M46 10H30M46 10v15" fill="none" {...t} strokeWidth={6} />
        </>
      )}
    </svg>
  );
}

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
  const apparait = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
  const signe = "surgit absolute -top-[19px] left-1/2 z-10 -ml-[18px] grid h-9 w-9 place-items-center rounded-full border-2 border-encre bg-fond text-[22px] font-extrabold leading-none lg:-top-[38px] lg:-ml-[26px] lg:h-[52px] lg:w-[52px] lg:text-[32px]";
  const carte = "surgit carte-forte relative flex flex-col justify-center px-4 py-3 lg:min-h-0 lg:rounded-3xl lg:px-9 lg:py-4 lg:shadow-[0_6px_0_var(--color-encre)]";
  const petit = "text-[12px] font-bold lg:text-[clamp(15px,1.3vw,22px)]";
  const gros = "titre mt-1 whitespace-nowrap text-[30px] tabular-nums lg:mt-[min(8px,1vh)] lg:text-[clamp(38px,min(4.4vw,7.4vh),84px)]";
  const note = "mt-1 text-[12px] leading-snug text-encre2 lg:mt-[min(8px,1vh)] lg:text-[clamp(15px,1.2vw,20px)] lg:text-encre";
  return {
    gauche: (
      <>
        <span className="pastille w-fit bg-turquoise lg:min-h-9 lg:px-4 lg:text-[16px]">Ton plan</span>
        <h1 className="titre mt-3 text-[28px] lg:mt-6 lg:text-[clamp(40px,min(4.5vw,7.6vh),84px)]">Voilà comment viser {nombre(objectif)}&nbsp;€ par mois.</h1>
        <p className="mt-2 text-[14px] leading-snug text-encre2 max-lg:[@media(max-height:720px)]:hidden lg:mt-6 lg:max-w-[34ch] lg:text-[clamp(17px,1.4vw,24px)]">On place la barre 6 % plus haut, pour dépasser ton objectif.</p>
      </>
    ),
    droite: (
      <div className="mt-5 flex flex-col gap-3.5 max-lg:[@media(max-height:720px)]:mt-3 lg:mt-0 lg:min-h-0 lg:flex-1 lg:gap-6">
        <div className={`${carte} bg-turquoise lg:flex-1`} style={apparait(250)}>
          <p className={petit}>Tu postes tes clips</p>
          <p className={gros}>{videos(p.parMois)}</p>
          <p className={note}>par mois, {frequence} par semaine</p>
        </div>

        <div className={`${carte} bg-blanc lg:flex-1`} style={apparait(800)}>
          <span className={signe} style={apparait(800)} aria-label="fois">
            ×
          </span>
          <p className={petit}>Objectif par vidéo</p>
          <p className={gros}>
            <span className="text-[0.5em] font-bold tracking-normal">environ </span>
            {euros(p.booste / p.parMois)}
          </p>
          <p className={note}>
            avec {vuesLisibles(p.vuesParVideoMin)} à {vuesLisibles(p.vuesParVideoMax)} {p.vuesParVideoMax >= 1_000_000 ? "de vues" : "vues"}
          </p>
        </div>

        <div className={`${carte} bg-rose py-4 lg:flex-[1.5]`} style={apparait(1350)}>
          <span className={signe} style={apparait(1350)} aria-label="égale">
            =
          </span>
          <p className={petit}>Ton objectif par mois</p>
          <p className="titre mt-1 whitespace-nowrap text-[52px] tabular-nums lg:mt-[min(10px,1.2vh)] lg:text-[clamp(60px,min(8.2vw,14vh),160px)]">
            <Compteur de={objectif} vers={p.booste} attente={1700} />&nbsp;€
          </p>
          <p className={`${note} !text-encre`}>
            avec {vuesLisibles(p.vuesMin)} à {vuesLisibles(p.vuesMax)} {p.vuesMax >= 1_000_000 ? "de vues" : "vues"}
          </p>
        </div>
      </div>
    ),
    fond: "lg:bg-jaune",
  };
}

/** 75,7 → « 76 € » ; 1,4 → « 1,40 € » */
const euros = (n: number) => (n >= 10 ? `${nombre(Math.round(n))} €` : `${n.toFixed(2).replace(".", ",")} €`);

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
