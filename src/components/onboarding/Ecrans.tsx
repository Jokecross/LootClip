"use client";
/*
 * Les écrans à réponses de l'onboarding. Servis par /commencer et par le studio de tournage (/studio).
 */
import { useEffect, useRef, useState } from "react";
import { Ancre } from "@/components/monde/Ancre";
import { eclats, type Nom } from "@/components/monde/store";
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
 * Les <Ancre> sont les places des objets 3D : d'un écran à l'autre, ils voyagent.
 */
export type Parties = { gauche: React.ReactNode; droite: React.ReactNode; fond?: string; large?: boolean };

export const MENTION_PRINCIPE = "Tout dépend de tes vues. Aucun revenu n'est garanti.";

/** L'accroche : le téléphone qui joue une vidéo, la manette devant, les clips autour. */
export function SceneAccroche({ source, titre }: { source?: HTMLVideoElement | null; titre?: string }) {
  return (
    <div className="relative min-h-[300px] flex-1 lg:min-h-0">
      <Ancre nom="clip1" className="absolute left-[2%] top-[4%] h-[24%] w-[36%] lg:left-[0%] lg:top-[10%] lg:h-[21%] lg:w-[33%]" pose={{ ry: 0.55, rz: 0.1, rx: 0.1, flotte: 12, z: -160 }} donnees={{ retard: 0.45 }} />
      <Ancre nom="clip0" className="absolute right-[0%] top-[10%] h-[24%] w-[36%] lg:right-[-1%] lg:top-[6%] lg:h-[23%] lg:w-[35%]" pose={{ ry: -0.5, rz: -0.12, rx: 0.12, flotte: 14, z: -90 }} donnees={{ retard: 0.3 }} />
      <Ancre nom="clip2" className="absolute bottom-[16%] right-[0%] h-[22%] w-[34%] lg:bottom-[24%] lg:right-[0%] lg:h-[20%] lg:w-[31%]" pose={{ ry: -0.6, rz: 0.14, flotte: 10, z: -40 }} donnees={{ retard: 0.6 }} />
      <Ancre nom="telephone" className="absolute inset-y-0 left-[18%] right-[18%] lg:bottom-[3%] lg:left-[24%] lg:right-[22%] lg:top-[2%]" pose={{ ry: -0.32, rz: 0.06, rx: 0.06, flotte: 7 }} donnees={{ ecran: "jeu", source, titre }} />
      <Ancre nom="manette" className="absolute bottom-[-4%] left-[-2%] h-[44%] w-[62%] lg:bottom-[-2%] lg:left-[-9%] lg:h-[44%] lg:w-[58%]" pose={{ ry: 0.36, rz: 0.16, rx: -0.42, flotte: 10, z: 260 }} donnees={{ retard: 0.15, valeur: 0.6 }} />
    </div>
  );
}

/** Le principe, avant les questions : ce sont ses parties à lui, pas les vidéos des autres. */
export function ecranPrincipe(): Parties {
  return {
    gauche: (
      <>
        <span className="pastille w-fit bg-blanc lg:min-h-10 lg:px-5 lg:text-[17px]">100 % tes propres clips</span>
        <div className="mt-3 lg:mt-6">
          <Titre sous="Pas de vidéo YouTube reprise. Que tes parties à toi.">
            Ton jeu. <br className="hidden lg:block" />
            Tes clips. <br className="hidden lg:block" />
            Ton argent.
          </Titre>
        </div>
      </>
    ),
    droite: <Machine />,
    fond: "turquoise",
    large: true,
  };
}

/** La machine : la manette lance des clips dans le téléphone, les pièces s'empilent. */
function Machine() {
  const [plein, setPlein] = useState(0.3);
  useEffect(() => {
    const id = setInterval(() => setPlein((v) => Math.min(0.8, v + 0.03)), 900);
    return () => clearInterval(id);
  }, []);
  const etapes = [
    { titre: "Tu joues à GTA 6", texte: "Sur ta PS5 ou ta Xbox.", fond: "bg-blanc" },
    { titre: "Tu gardes tes meilleurs moments", texte: "Un bouton sur ta manette.", fond: "bg-jaune" },
    { titre: "XPclip monte tes vidéos", texte: "Prêtes en une minute environ.", fond: "bg-orange" },
    { titre: "Tu postes, tes vues peuvent payer", texte: "Sur TikTok et Instagram.", fond: "bg-rose" },
  ];
  const scenes: React.ReactNode[] = [
    <Ancre key="a" nom="manette" className="absolute inset-x-[6%] inset-y-[2%]" pose={{ ry: 0.3, rx: -0.3, rz: 0.06, flotte: 6, z: 60 }} donnees={{ valeur: 1 }} />,
    <span key="b">
      <Ancre nom="clip2" className="absolute bottom-[16%] left-[6%] h-[58%] w-[58%]" pose={{ ry: 0.4, rz: 0.12, rx: 0.1 }} donnees={{ retard: 0.5 }} />
      <Ancre nom="clip1" className="absolute right-[4%] top-[4%] h-[58%] w-[58%]" pose={{ ry: -0.35, rz: -0.1, rx: 0.1, z: 60 }} donnees={{ retard: 0.65 }} />
    </span>,
    <Ancre key="c" nom="telephone" className="absolute inset-x-[4%] inset-y-[-12%] lg:inset-y-[-8%]" pose={{ ry: -0.35, rz: 0.06, flotte: 5, z: 30 }} donnees={{ ecran: "jeu", coupe: 0.8 }} />,
    <Ancre key="d" nom="pieces" className="absolute inset-x-[4%] inset-y-[2%]" pose={{ rx: 0.42, flotte: 0, suit: 0.5 }} donnees={{ valeur: plein }} />,
  ];
  return (
    <ol className="relative grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 lg:gap-x-8 lg:gap-y-4 lg:py-2">
      <Ancre nom="clip0" className="absolute left-[40%] top-[38%] h-[14%] w-[22%] lg:h-[15%] lg:w-[16%]" pose={{ z: 300 }} donnees={{ flux: { de: "manette", vers: "telephone", delai: 0 } }} />
      <Ancre nom="clip3" className="absolute left-[40%] top-[38%] h-[14%] w-[22%] lg:h-[15%] lg:w-[16%]" pose={{ z: 300 }} donnees={{ flux: { de: "manette", vers: "telephone", delai: 1.8 } }} />
      {etapes.map((e, i) => (
        <li key={e.titre} className="relative flex min-h-[150px] flex-col max-lg:[@media(max-height:720px)]:min-h-[128px] lg:min-h-0">
          <span className="relative block flex-1">{scenes[i]}</span>
          <span className={`surgit carte-forte relative z-20 flex items-center gap-2.5 p-2.5 lg:gap-5 lg:rounded-3xl lg:px-6 lg:py-[min(18px,2vh)] ${e.fond}`} style={{ "--d": `${300 + i * 260}ms` } as React.CSSProperties}>
            <span className="titre text-[30px] leading-none lg:text-[clamp(40px,4.2vw,84px)]">{i + 1}</span>
            <span className="min-w-0">
              <span className="titre block text-[14px] leading-[1.05] lg:text-[clamp(19px,1.75vw,34px)]">{e.titre}</span>
              <span className="mt-1 hidden text-[clamp(14px,1.05vw,19px)] font-medium lg:block">{e.texte}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ecranConsole({ r, repondre }: Props): Parties {
  const etat = (v: string) => (r.plateforme ? (r.plateforme === v ? ("oui" as const) : ("non" as const)) : undefined);
  return {
    gauche: <Titre sous="Le tutoriel s'adapte à ta console.">Tu joues sur quoi ?</Titre>,
    droite: (
      <Choix
        label="Ta console"
        options={[
          { valeur: "ps5", libelle: "PS5", indice: "PlayStation 5", fond: "bg-turquoise", scene: <Ancre nom="manette" className="absolute inset-x-[-2%] inset-y-[-4%] lg:inset-y-[6%] lg:-inset-x-[4%]" pose={{ ry: 0.25, rx: -0.28, rz: 0.05, z: 120 }} donnees={{ etat: etat("ps5"), valeur: etat("ps5") === "oui" ? 1 : 0.2 }} /> },
          { valeur: "xbox", libelle: "Xbox", indice: "Series X ou S", fond: "bg-rose", scene: <Ancre nom="manette2" className="absolute inset-x-[-2%] inset-y-[-4%] lg:inset-y-[6%] lg:-inset-x-[4%]" pose={{ ry: -0.25, rx: -0.28, rz: -0.05, z: 120 }} donnees={{ retard: 0.12, etat: etat("xbox"), valeur: etat("xbox") === "oui" ? 1 : 0.2 }} /> },
        ]}
        valeur={r.plateforme}
        choisir={(v) => repondre({ plateforme: v as Profil["plateforme"] })}
      />
    ),
    fond: "orange",
  };
}

export function ecranTiktok({ r, repondre }: Props): Parties {
  const etat = (v: string) => (r.tiktok ? (r.tiktok === v ? ("oui" as const) : ("non" as const)) : undefined);
  const place = "absolute inset-x-[-9%] -top-[6%] bottom-[2%] lg:inset-x-[1%] lg:-top-[7%] lg:bottom-[2%]";
  const option = (valeur: "abonnes" | "vide" | "non", libelle: string, nom: Nom, fond: string, i: number) => ({
    valeur,
    libelle,
    fond,
    scene: <Ancre nom={nom} className={place} pose={{ ry: 0.22 - i * 0.22, rz: 0.05 - i * 0.05, z: 80, flotte: 6 }} donnees={{ ecran: valeur, etat: etat(valeur), retard: i * 0.12 }} />,
  });
  return {
    gauche: <Titre sous="Aucun souci si tu pars de zéro.">Tu as déjà une page TikTok ?</Titre>,
    droite: (
      <Choix
        label="Ta page TikTok"
        options={[option("abonnes", "Oui, avec des abonnés", "telephone", "bg-turquoise", 0), option("vide", "Oui, mais elle est vide", "telephone2", "bg-blanc", 1), option("non", "Non, pas encore", "telephone3", "bg-orange", 2)]}
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
          <Ancre nom="pieces" className="mb-2 min-h-[90px] w-full flex-1" pose={{ rx: 0.4, flotte: 0 }} donnees={{ valeur: 0.05 + part * 0.95 }} />
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
            <div className="flex flex-col items-center pb-[18%]">
              {montant}
              {etiquette}
            </div>
          }
        />
        <Ancre nom="pieces" className="absolute bottom-[3%] left-[10%] right-[14%] hidden h-[36%] lg:block" pose={{ rx: 0.36, flotte: 0, suit: 0.5, z: 80 }} donnees={{ valeur: 0.05 + part * 0.95 }} />
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
        <Titre sous="Plus tu joues, plus tu as de quoi poster.">Tu joues combien d&apos;heures par semaine ?</Titre>
        <div className="my-auto flex items-center justify-between gap-4 pb-4 lg:mt-[min(40px,4.4vh)] lg:mb-0 lg:justify-start lg:gap-10 lg:pb-0">
          <div>
            <div className="lg:hidden">
              <Grand cle={heures}>{heures}&nbsp;h</Grand>
            </div>
            <p className="mt-2.5 text-[15px] font-bold leading-tight lg:mt-0 lg:whitespace-nowrap lg:text-[clamp(30px,2.9vw,56px)] lg:[font-family:var(--font-titre)] lg:font-extrabold lg:tracking-[-0.03em]">
              {videos(parSemaine)}
              <span className="block text-[13px] font-normal text-encre2 lg:mt-1 lg:text-[20px] lg:font-medium lg:tracking-normal lg:[font-family:var(--font-texte)]">par semaine</span>
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
            <div className="pb-[18%]">
              <Grand cle={heures}>{heures}&nbsp;h</Grand>
            </div>
          }
        />
        <Ancre nom="manette" className="absolute bottom-[3%] left-[18%] right-[24%] hidden h-[33%] lg:block" pose={{ rx: -0.5, flotte: 5, z: 80 }} donnees={{ valeur: 0.1 + part * 2 }} />
      </>
    ),
    fond: "turquoise",
  };
}

export function ecranPlan({ objectif, frequence }: { objectif: number; frequence: number }): Parties {
  const p = plan(objectif, frequence);
  const apparait = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
  const signe = "surgit absolute z-30 grid h-10 w-10 place-items-center rounded-full border-[3px] border-encre bg-encre text-[24px] font-extrabold leading-none text-fond lg:h-[64px] lg:w-[64px] lg:text-[38px]";
  const carte = "surgit carte-forte relative z-20 flex flex-col justify-center px-3.5 py-3 lg:rounded-3xl lg:px-8 lg:py-5";
  const petit = "text-[12px] font-bold leading-tight lg:text-[clamp(16px,1.35vw,24px)]";
  const gros = "titre mt-1 whitespace-nowrap text-[26px] tabular-nums lg:mt-[min(8px,1vh)] lg:text-[clamp(38px,min(4vw,7.4vh),84px)]";
  const note = "mt-1 text-[11px] leading-snug lg:mt-[min(8px,1vh)] lg:text-[clamp(14px,1.15vw,20px)] font-medium";
  return {
    gauche: (
      <>
        <span className="pastille w-fit bg-blanc lg:min-h-10 lg:px-5 lg:text-[17px]">Ton plan</span>
        <h1 className="titre mt-3 text-[32px] leading-[0.95] lg:mt-6 lg:text-[clamp(44px,min(5vw,9vh),108px)]">
          <Mots>{`Voilà comment viser ${nombre(objectif)}\u00a0€ par mois.`}</Mots>
        </h1>
        <p className="mt-2 text-[14px] font-medium leading-snug text-encre2 max-lg:[@media(max-height:720px)]:hidden lg:mt-6 lg:max-w-[34ch] lg:text-[clamp(18px,1.5vw,26px)]">On place la barre 6 % plus haut, pour dépasser ton objectif.</p>
      </>
    ),
    droite: (
      <div className="mt-4 flex flex-1 flex-col max-lg:[@media(max-height:720px)]:mt-2 lg:mt-0 lg:min-h-0 lg:justify-center">
        <div className="relative grid grid-cols-2 gap-3 lg:gap-7">
          <div className={`${carte} bg-turquoise lg:min-h-[min(210px,25vh)]`} style={apparait(250)}>
            <p className={petit}>Tu postes tes clips</p>
            <p className={gros}>{videos(p.parMois)}</p>
            <p className={note}>par mois, {frequence} par semaine</p>
          </div>
          <div className={`${carte} bg-blanc lg:min-h-[min(210px,25vh)]`} style={apparait(800)}>
            <p className={petit}>Objectif par vidéo</p>
            <p className={gros}>
              <span className="text-[0.46em] font-bold tracking-normal">environ </span>
              {euros(p.booste / p.parMois)}
            </p>
            <p className={note}>
              avec {vuesLisibles(p.vuesParVideoMin)} à {vuesLisibles(p.vuesParVideoMax)} {p.vuesParVideoMax >= 1_000_000 ? "de vues" : "vues"}
            </p>
          </div>
          <span className={`${signe} left-1/2 top-1/2 -ml-5 -mt-5 lg:-ml-8 lg:-mt-8`} style={apparait(800)} aria-label="fois">
            ×
          </span>
        </div>
        <Total objectif={objectif} booste={p.booste} signe={`${signe} -top-5 left-8 lg:-top-8 lg:left-14`} carte={carte} petit={petit} note={note}>
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
  const [plein, setPlein] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const a = setTimeout(() => setPlein(0.55 + Math.min(0.45, booste / 5000)), 1500);
    const b = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (r) eclats(r.left + r.width / 2, r.top + r.height / 2, 30);
    }, 2850);
    return () => (clearTimeout(a), clearTimeout(b));
  }, [booste]);
  return (
    <div className="relative mt-6 flex min-h-[170px] flex-1 flex-col justify-end lg:mt-10 lg:min-h-0 lg:max-h-[52vh]">
            <div className={`${carte} bg-rose pb-4 pt-6 lg:pb-8 lg:pt-12`} style={{ "--d": "1350ms" } as React.CSSProperties}>
        <Ancre nom="pieces" className="absolute bottom-[calc(100%-12px)] left-[26%] right-[2%] h-[110px] lg:bottom-[calc(100%-26px)] lg:left-[30%] lg:h-[min(30vh,300px)]" pose={{ rx: 0.3, flotte: 0, suit: 0.6 }} donnees={{ valeur: plein }} />
        <span className={signe} style={{ "--d": "1350ms" } as React.CSSProperties} aria-label="égale">
          =
        </span>
        <p className={petit}>Ton objectif par mois</p>
        <p ref={ref} className="titre mt-1 whitespace-nowrap text-[58px] leading-[0.9] tabular-nums lg:mt-[min(10px,1.2vh)] lg:text-[clamp(72px,min(10vw,19vh),220px)]">
          <Compteur de={objectif} vers={booste} attente={1700} />&nbsp;€
        </p>
        <p className={note}>{children}</p>
      </div>
    </div>
  );
}

/** 75,7 → « 76 € » ; 1,4 → « 1,40 € » */
const euros = (n: number) => (n >= 10 ? `${nombre(Math.round(n))} €` : `${n.toFixed(2).replace(".", ",")} €`);

/** Cartes de choix : l'objet déborde de la carte, le choisi bondit, les autres se couchent. */
function Choix({ options, valeur, choisir, label }: { options: { valeur: string; libelle: string; indice?: string; scene: React.ReactNode; fond: string }[]; valeur?: string; choisir: (v: string) => void; label: string }) {
  const trois = options.length > 2;
  return (
    <div className={`grid min-h-[270px] flex-1 gap-2.5 pt-4 lg:min-h-0 lg:gap-6 lg:py-[min(5vh,56px)] ${trois ? "my-auto max-h-[430px] w-full grid-cols-3 lg:my-0 lg:max-h-none" : "max-lg:max-h-[480px] auto-rows-fr lg:auto-rows-auto lg:grid-cols-2"}`} role="radiogroup" aria-label={label}>
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
            style={{ "--d": `${i * 110}ms` } as React.CSSProperties}
            className={`surgit group relative flex min-w-0 flex-col rounded-[22px] border-[3px] border-encre text-left transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(.3,1.6,.6,1)] lg:rounded-[36px] ${
              actif ? "-translate-y-2 bg-jaune shadow-[0_12px_0_var(--color-encre)] lg:-translate-y-4 lg:shadow-[0_20px_0_var(--color-encre)]" : `${o.fond} shadow-[0_5px_0_var(--color-encre)] hover:-translate-y-1.5 hover:shadow-[0_10px_0_var(--color-encre)]`
            }`}
          >
            <span className={`block min-h-0 flex-1 ${trois ? "relative" : "absolute inset-0 left-[38%] lg:relative lg:inset-auto"}`}>{o.scene}</span>
            <span className={`relative z-20 ${trois ? "" : "mt-auto"} block px-3 pb-3.5 lg:px-7 lg:pb-7 ${trois ? "min-h-[74px] lg:min-h-[120px]" : ""}`}>
              <span className={`titre block ${trois ? "text-[15px] leading-[1.02] lg:text-[clamp(24px,2vw,38px)]" : "text-[34px] lg:text-[clamp(56px,5.4vw,112px)]"}`}>{o.libelle}</span>
              {o.indice && <span className="mt-1 block text-[13px] font-medium lg:mt-2 lg:text-[20px]">{o.indice}</span>}
            </span>
            {actif && (
              <span className="surgit absolute -right-2 -top-2 z-30 lg:-right-4 lg:-top-4">
                <Coche className="h-9 w-9 rounded-full border-[3px] border-fond lg:h-16 lg:w-16" />
              </span>
            )}
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
