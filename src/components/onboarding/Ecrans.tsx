"use client";
/*
 * Les écrans à réponses de l'onboarding. Servis par /commencer et par le studio de tournage (/studio).
 */
import { useEffect, useRef, useState } from "react";
import { Objet, Pieces,  } from "@/components/objets/Objet";
import { Eventail } from "@/components/accueil/Eventail";
import { TelProfil } from "@/components/onboarding/TelProfil";
import { Mots, Titre } from "@/components/ui/Duo";
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
 * Chaque écran rend sa partie gauche (la question) et sa partie droite (la scène),
 * posées par <Duo> : l'une sous l'autre sur téléphone, côte à côte sur ordinateur.
 */
export type Parties = { gauche: React.ReactNode; droite: React.ReactNode; fond?: string; large?: boolean; centre?: boolean };

export const MENTION_PRINCIPE = "Tout dépend de tes vues. Aucun revenu n'est garanti.";

/** L'accroche : la promesse, et trois vidéos en éventail posées sur le sol. */
export function ecranAccroche(): Parties {
  return {
    gauche: (
      <div className="arrivee relative z-10">
        <h1 className="titre">
          Tes parties de GTA&nbsp;6 peuvent te <span className="mot-fort">payer.</span>
        </h1>
        <p className="etape-sous">Tu joues sur ta console. XPclip monte tes propres clips. Tu postes.</p>
      </div>
    ),
    droite: <Eventail />,
    fond: "jaune",
    centre: true,
  };
}

/** Le principe, avant les questions : ce sont ses parties à lui, pas les vidéos des autres. */
export function ecranPrincipe(): Parties {
  return {
    gauche: (
      <>
<Titre sous="Pas de vidéo YouTube reprise. Que tes parties à toi.">
          <span className="whitespace-nowrap">Ton jeu. <br className="max-lg:hidden" />Tes clips.</span> <br />Ton argent.
        </Titre>
      </>
    ),
    droite: <Gestes />,
    fond: "turquoise",
    large: true,
  };
}

/** Le principe en quatre vignettes. */
function Gestes() {
  const gestes: { titre: string; fond: string; vue: React.ReactNode }[] = [
    { titre: "Tu joues à GTA 6", fond: "bg-jaune", vue: <Objet nom="manette" className="absolute inset-x-[16%] inset-y-[10%]" /> },
    {
      titre: "Tu gardes tes meilleurs moments",
      fond: "bg-orange",
      vue: (
        <div className="pile">
          {["chien", "canard", "saut"].map((n, i) => (
            <span key={n} style={{ "--i": i } as React.CSSProperties}>
              <img src={`/v4/${n}.webp`} alt="" width={480} height={270} />
              <b>
                <Coche className="h-full w-full" />
              </b>
            </span>
          ))}
        </div>
      ),
    },
    {
      titre: "XPclip monte tes vidéos",
      fond: "bg-rose",
      vue: (
        <div className="tel-carte">
          <div className="m-tel-ecran">
            <img src="/v4/clips/drole.webp" alt="" width={432} height={768} className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      ),
    },
    { titre: "Tu postes, tes vues peuvent payer", fond: "bg-blanc", vue: <Pieces part={0.7} className="absolute inset-x-[14%] bottom-[14%] top-[16%]" /> },
  ];
  return (
    <ol className="gestes">
      {gestes.map((g, i) => (
        <li key={g.titre} className="bloc surgit bg-blanc" style={{ "--d": `${60 + i * 80}ms` } as React.CSSProperties}>
          <div className={`gestes-vue ${g.fond}`}>
            <span className="numero titre">{i + 1}</span>
            {g.vue}
          </div>
          <p>{g.titre}</p>
        </li>
      ))}
    </ol>
  );
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
  const option = (valeur: "abonnes" | "vide" | "non", libelle: string, fond: string) => ({ valeur, libelle, fond, scene: <TelProfil etat={valeur} /> });
  return {
    gauche: <Titre sous="Aucun souci si tu pars de zéro.">Tu as déjà une page TikTok ?</Titre>,
    droite: (
      <Choix
        label="Ta page TikTok"
        options={[option("abonnes", "Oui, avec des abonnés", "bg-orange"), option("vide", "Oui, mais elle est vide", "bg-turquoise"), option("non", "Non, pas encore", "bg-beige")]}
        valeur={r.tiktok}
        choisir={(v) => repondre({ tiktok: v as Profil["tiktok"] })}
      />
    ),
    fond: "rose",
    large: true,
  };
}

export function ecranObjectif({ r, repondre }: Props): Parties {
  const objectif = r.objectif ?? ONBOARDING.objectifParDefaut;
  const part = (ONBOARDING.objectifs.indexOf(objectif) + 1) / ONBOARDING.objectifs.length;
  const montant = <Grand cle={objectif}>{nombre(objectif)}&nbsp;€</Grand>;
  const etiquette = <span className={`pastille mt-2.5 lg:min-h-10 lg:px-5 lg:text-[18px] ${palier(objectif).fond}`}>{palier(objectif).texte}</span>;
  return {
    gauche: (
      <>
        <Titre sous="Lance la roue et cale ton objectif.">Tu vises combien par mois ?</Titre>
        <div className="relative flex flex-1 flex-col items-center justify-end pb-3 lg:hidden">
          <Pieces part={part} className="mb-2 min-h-[56px] w-full flex-1" />
          {montant}
          {etiquette}
        </div>
      </>
    ),
    droite: (
      <>
        <Roulette
          nu
          label="Objectif par mois"
          valeurs={ONBOARDING.objectifs}
          valeur={objectif}
          libelle={(v) => `${nombre(v)} €`}
          changer={(v) => repondre({ objectif: v })}
          centre={
            <div className="flex flex-col items-center pb-[14%]">
              {montant}
              {etiquette}
            </div>
          }
        />
      </>
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
  const signe = "surgit absolute z-30 grid h-10 w-10 place-items-center rounded-full border-2 border-encre bg-fond text-[24px] font-extrabold leading-none lg:h-[56px] lg:w-[56px] lg:text-[34px]";
  const carte = "surgit bloc relative z-20 flex flex-col justify-center px-3.5 py-3 lg:px-8 lg:py-5";
  const petit = "text-[12px] font-bold leading-tight lg:text-[clamp(16px,1.35vw,24px)]";
  const gros = "titre mt-1 whitespace-nowrap text-[26px] tabular-nums lg:mt-[min(8px,1vh)] lg:text-[clamp(34px,min(3.600vw,7.200vh),62px)]";
  const note = "mt-1 text-[11px] leading-snug lg:mt-[min(8px,1vh)] lg:text-[clamp(14px,1.15vw,20px)] font-medium";
  return {
    gauche: (
      <>
        <Titre sous="On place la barre 6 % plus haut, pour dépasser ton objectif.">{`Voilà comment viser ${nombre(objectif)}\u00a0€ par mois.`}</Titre>
      </>
    ),
    droite: (
      <div className="mt-5 flex flex-1 flex-col max-lg:[@media(max-height:720px)]:mt-3 lg:mt-0 lg:min-h-0 lg:justify-center">
        <div className="relative grid grid-cols-2 gap-3 lg:gap-7">
          <div className={`${carte} bg-blanc lg:min-h-[min(210px,25vh)]`} style={apparait(120)}>
            <p className={petit}>Tu postes tes clips</p>
            <p className={gros}>{videos(p.parMois)}</p>
            <p className={note}>par mois, {frequence} par semaine</p>
          </div>
          <div className={`${carte} bg-blanc lg:min-h-[min(210px,25vh)]`} style={apparait(260)}>
            <p className={petit}>Objectif par vidéo</p>
            <p className={gros}>
              <span className="text-[0.46em] font-bold tracking-normal">environ </span>
              {euros(p.booste / p.parMois)}
            </p>
            <p className={note}>
              avec {vuesLisibles(p.vuesParVideoMin)} à {vuesLisibles(p.vuesParVideoMax)} {p.vuesParVideoMax >= 1_000_000 ? "de vues" : "vues"}
            </p>
          </div>
          <span className={`${signe} left-1/2 top-1/2 -ml-5 -mt-5 lg:-ml-7 lg:-mt-7`} style={apparait(260)} aria-label="fois">
            ×
          </span>
        </div>
        <Total objectif={objectif} booste={p.booste} signe={`${signe} -top-5 left-8 lg:-top-7 lg:left-12`} carte={carte} petit={petit} note={note}>
          avec {vuesLisibles(p.vuesMin)} à {vuesLisibles(p.vuesMax)} {p.vuesMax >= 1_000_000 ? "de vues" : "vues"}
        </Total>
      </div>
    ),
    fond: "jaune",
    large: true,
  };
}

/** Le total : il grimpe, et les pièces s'empilent derrière la carte. */
function Total({ objectif, booste, signe, carte, petit, note, children }: { objectif: number; booste: number; signe: string; carte: string; petit: string; note: string; children: React.ReactNode }) {
  return (
    <div className="relative mt-6 flex min-h-[170px] flex-1 flex-col justify-end lg:mt-10 lg:min-h-0 lg:max-h-[52vh]">
            <div className={`${carte} bg-rose pb-4 pt-6 lg:pb-8 lg:pt-12`} style={{ "--d": "420ms" } as React.CSSProperties}>
        <Pieces part={0.3 + booste / 4000} className="plan-pieces absolute bottom-full left-[30%] right-[6%] -mb-2 h-[88px] lg:left-[40%] lg:-mb-3 lg:h-[min(22vh,200px)]" />
        <span className={signe} style={{ "--d": "420ms" } as React.CSSProperties} aria-label="égale">
          =
        </span>
        <p className={petit}>Ton objectif par mois</p>
        <p className="titre mt-1 whitespace-nowrap text-[52px] leading-[0.9] tabular-nums lg:mt-[min(10px,1.2vh)] lg:text-[clamp(60px,min(8vw,15vh),170px)]">
          <Compteur de={objectif} vers={booste} attente={800} />&nbsp;€
        </p>
        <p className={note}>{children}</p>
      </div>
    </div>
  );
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
