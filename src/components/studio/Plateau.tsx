"use client";
/*
 * Studio de tournage : tout le parcours d'un trait, pour filmer les vidéos de présentation.
 * Régie sur /studio. Une fois prêt, xpclip.com ouvre le premier écran (cookie, lib/tournage.ts).
 * Réservé à l'équipe, rien n'est écrit dans un vrai compte. Appui long sur le logo : retour aux réglages.
 */
import { useEffect, useRef, useState } from "react";
import { Coeur } from "@/components/accueil/Machine";
import { Logo } from "@/components/marque/Logo";
import { ecranAccroche, ecranConsole, ecranHeures, ecranObjectif, ecranPlan, ecranPrincipe, ecranTiktok, MENTION_PRINCIPE, REPERE_HEURES } from "@/components/onboarding/Ecrans";
import { Objet, precharger } from "@/components/objets/Objet";
import { Confettis } from "@/components/studio/Confettis";
import { Montage } from "@/components/studio/Montage";
import { nomsReseaux, PictoReseau, Publier, type Depart } from "@/components/studio/Publier";
import { Essai } from "@/components/studio/Essai";
import { Telephone } from "@/components/studio/Telephone";
import { VideoPortrait } from "@/components/studio/VideoPortrait";
import { Duo, Titre } from "@/components/ui/Duo";
import { Coche, Entete } from "@/components/ui/Parcours";
import { CLIPS, MENTION_OBJECTIF, NON_AFFILIATION, ONBOARDING, STYLES, TITRE_MAX, type Style } from "@/lib/config";
import { lireDuree } from "@/lib/depot";
import { useEtat, type Video } from "@/lib/etat";
import { duree as dureeLisible, videos } from "@/lib/format";
import { videosPourHeures, type Reponses } from "@/lib/onboarding";
import { bravo, envol, pop, preparer, reveiller, tampon } from "@/lib/sons";
import { ecrireReglages, garderVideo, lireReglages, pseudoAuHasard, lireVideo, REGLAGES_DEFAUT, type Reglages } from "@/lib/studio";
import { supabase } from "@/lib/supabase";
import { poserTournage } from "@/lib/tournage";

const SUITE = ["regie", "accroche", "principe", "console", "tiktok", "objectif", "heures", "plan", "clips", "style", "montage", "resultat", "publier", "fin"] as const;
type Etape = (typeof SUITE)[number];
const QUESTIONS: Etape[] = ["console", "tiktok", "objectif", "heures", "plan"];

type Clip = { url: string; duree: number };

/** `direct` : on arrive sur le premier écran de l'onboarding (xpclip.com), sans passer par la régie. */
export function Plateau({ direct = false }: { direct?: boolean }) {
  const [etape, setEtape] = useState<Etape>(direct ? "accroche" : "regie");
  const [regl, setRegl] = useState<Reglages>(REGLAGES_DEFAUT);
  const [finale, setFinale] = useState<{ url: string; nom: string } | null>(null);
  const [r, setR] = useState<Reponses>({});
  const [clips, setClips] = useState<Clip[]>([]);
  const [style, setStyle] = useState<Style>("defi");
  const [titre, setTitre] = useState("");
  const [credits, setCredits] = useState(0);
  const [hasard, setHasard] = useState(""); // compte inventé, retiré à chaque prise
  const [depart, setDepart] = useState<Depart | null>(null);
  const [parti, setParti] = useState(false);
  const [lu, setLu] = useState(false);
  const [cherche, setCherche] = useState(false);
  const etat = useEtat();
  const derniere = etat.videos.find((v) => v.videoChemin && v.statut === "termine") ?? null;
  const galerie = useRef<HTMLInputElement>(null);
  const appui = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    precharger();
    const son = setTimeout(preparer, 900);
    const g = lireReglages();
    setRegl(g);
    setTitre(g.titre);
    setCredits(g.credits);
    setHasard(pseudoAuHasard());
    lireVideo().then((v) => {
      setFinale(v);
      setLu(true);
    });
    const go = () => reveiller();
    window.addEventListener("click", go);
    return () => {
      clearTimeout(son);
      window.removeEventListener("click", go);
    };
  }, []);

  /** Prend une vidéo déjà créée dans XPclip, et la garde sur ce téléphone. */
  async function prendre(v: Video) {
    setCherche(true);
    try {
      const { data } = await supabase.storage.from("videos").createSignedUrl(v.videoChemin!, 600);
      const r = await fetch(data!.signedUrl);
      if (!r.ok) throw new Error();
      const b = await r.blob();
      setFinale({ url: URL.createObjectURL(b), nom: v.titre });
      await garderVideo(b, v.titre).catch(() => {});
    } catch {}
    setCherche(false);
  }

  // Rien de choisi : la dernière vidéo créée est prise toute seule.
  const auto = useRef(false);
  useEffect(() => {
    if (!lu || finale || !derniere || auto.current) return;
    auto.current = true;
    prendre(derniere);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lu, finale, derniere]);

  // Prêt à filmer : taper xpclip.com ouvre directement le tournage, sur cet appareil seulement.
  useEffect(() => {
    if (lu) poserTournage(regl.tournage && !!finale);
  }, [lu, regl.tournage, finale]);

  const repondre = (x: Reponses) => setR((v) => ({ ...v, ...x }));
  const suivant = () => setEtape(SUITE[SUITE.indexOf(etape) + 1]);
  const retour = () => setEtape(SUITE[Math.max(0, SUITE.indexOf(etape) - 1)]);
  const regler = (x: Partial<Reglages>) => {
    const n = { ...regl, ...x };
    setRegl(n);
    ecrireReglages(n);
  };

  /** Nouvelle prise : tout repart de zéro, sauf les réglages. */
  function action(depuis: Etape = "accroche") {
    clips.forEach((c) => URL.revokeObjectURL(c.url));
    setClips([]);
    setR({});
    setStyle("defi");
    setTitre(regl.titre);
    setCredits(regl.credits);
    setHasard(pseudoAuHasard());
    setDepart(null);
    setEtape(depuis);
  }

  /** Une autre vidéo, avec les crédits restants. */
  function autre() {
    const reste = credits;
    action("clips");
    setCredits(reste);
  }

  async function ajouter(f: FileList | null) {
    if (!f?.length) return;
    for (const x of Array.from(f).slice(0, CLIPS.max - clips.length)) {
      const url = URL.createObjectURL(x);
      const d = await lireDuree(url);
      if (!d) continue;
      setClips((l) => {
        pop(l.length / CLIPS.max);
        return [...l, { url, duree: d }];
      });
      await new Promise((ok) => setTimeout(ok, 130));
    }
  }

  const objectif = r.objectif ?? ONBOARDING.objectifParDefaut;
  const frequence = r.frequence ?? videosPourHeures(ONBOARDING.heuresParDefaut);
  const total = clips.reduce((s, c) => s + c.duree, 0);
  const urlFinale = finale?.url ?? "";

  const logo = (
    <button
      type="button"
      aria-label="XPclip"
      className="flex min-h-11 touch-manipulation select-none items-center [-webkit-touch-callout:none]"
      onPointerDown={() => {
        appui.current = setTimeout(() => setEtape("regie"), 900);
      }}
      onPointerUp={() => clearTimeout(appui.current)}
      onPointerLeave={() => clearTimeout(appui.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Logo taille={30} />
    </button>
  );

  const q = QUESTIONS.indexOf(etape);
  const entete =
    q >= 0 ? (
      <Entete n={q + 1} total={QUESTIONS.length} retour={retour} />
    ) : (
      <header className="flex items-center justify-between">
        {logo}
        {SUITE.indexOf(etape) >= SUITE.indexOf("clips") && (
          <span key={credits} className="pastille surgit bg-turquoise tabular-nums lg:min-h-9 lg:px-4 lg:text-[16px]">
            {videos(credits)}
          </span>
        )}
      </header>
    );

  let contenu: { gauche: React.ReactNode; droite: React.ReactNode; fond?: string; large?: boolean; centre?: boolean } = { gauche: null, droite: null };
  let bouton: { libelle: string; faire: () => void; actif?: boolean } | false | null = null;
  let second: { libelle: string; faire: () => void } | null = null;
  let pied: React.ReactNode = null;

  switch (etape) {
    case "regie":
      contenu = {
        gauche: (
        <div className="bloc overflow-y-auto bg-blanc p-5 lg:max-h-full lg:p-8">
          <h1 className="titre text-[34px] lg:text-[48px]">Prêt à filmer ?</h1>
          <p className="mt-2 text-[14px] text-encre2">Cette page, personne ne la voit. Le tournage commence après.</p>

          <p className="mt-6 text-[14px] font-bold">La vidéo montrée à la fin</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="carte-forte relative grid aspect-[9/16] w-[96px] lg:hidden shrink-0 place-items-center overflow-hidden bg-encre">
              {finale ? (
                <VideoPortrait key={finale.url} url={finale.url} />
              ) : (
                <span className="px-2 text-center text-[11px] font-bold text-fond">{cherche ? "Un instant…" : "Aucune vidéo"}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">{finale ? finale.nom : cherche ? "On cherche ta dernière vidéo." : "Crée d'abord une vidéo dans XPclip."}</p>
              <label className="lien flex min-h-11 w-fit cursor-pointer items-center text-[14px]">
                {finale ? "En prendre une autre" : "Ou choisis un fichier"}
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFinale({ url: URL.createObjectURL(f), nom: f.name });
                    await garderVideo(f, f.name).catch(() => {});
                  }}
                />
              </label>
              {derniere && (
                <button type="button" onClick={() => prendre(derniere)} className="lien flex min-h-11 items-center text-[14px]">
                  Reprendre ma dernière vidéo
                </button>
              )}
            </div>
          </div>

          <div className="mt-5">
            <Champ libelle="Ton pseudo" exemple="Vide : un pseudo au hasard" valeur={regl.pseudo} changer={(v) => regler({ pseudo: v.replace(/[@\s]/g, "").slice(0, 24) })} />
          </div>

          <p className="mt-5 text-[14px] font-bold">Quand tu tapes xpclip.com</p>
          <div className="segment mt-2" role="radiogroup" aria-label="Quand tu tapes xpclip.com">
            {([[true, "Le tournage"], [false, "Le vrai site"]] as const).map(([v, nom]) => (
              <button key={nom} type="button" role="radio" aria-checked={regl.tournage === v} onClick={() => regler({ tournage: v })}>
                {nom}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-encre2">
            {!finale ? "Choisis d'abord une vidéo." : regl.tournage ? "Ferme cette page, puis tape xpclip.com." : "xpclip.com affiche le site normal."}
          </p>

          <details className="carte mt-4 px-4">
            <summary className="flex min-h-12 cursor-pointer items-center text-[14px] font-bold">Autres réglages</summary>
            <div className="pb-4">
              <Champ libelle="Crédits affichés" numerique valeur={String(regl.credits || "")} changer={(v) => regler({ credits: Math.min(200, Number(v.replace(/\D/g, "")) || 0) })} />
              <div className="mt-3">
                <Champ libelle="Titre déjà écrit" valeur={regl.titre} changer={(v) => regler({ titre: v.slice(0, TITRE_MAX) })} />
              </div>
              <p className="mt-4 text-[14px] font-bold">Durée du montage à l&apos;écran</p>
              <div className="segment mt-2" role="radiogroup" aria-label="Durée du montage">
                {[6, 9, 14].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={regl.secondes === s} onClick={() => regler({ secondes: s })}>
                    {s} s
                  </button>
                ))}
              </div>
              <button type="button" disabled={!finale} onClick={() => action("clips")} className="lien mt-3 flex min-h-11 items-center text-[14px] disabled:opacity-40">
                Commencer directement aux clips
              </button>
            </div>
          </details>
          <p className="mt-4 text-[13px] text-encre2">Enlève le mode silencieux. Appui long sur le logo : retour ici.</p>
        </div>
        ),
        droite: (
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <div className="carte-forte relative grid aspect-[9/16] h-[min(76dvh,960px)] place-items-center overflow-hidden rounded-3xl bg-encre">
              {finale ? <VideoPortrait key={finale.url} url={finale.url} /> : <span className="px-4 text-center text-[16px] font-bold text-fond">{cherche ? "Un instant…" : "Aucune vidéo"}</span>}
            </div>
          </div>
        ),
        fond: "lg:bg-turquoise",
      };
      bouton = { libelle: "Commencer à filmer", faire: () => action(), actif: !!finale };
      break;

    case "accroche":
      contenu = ecranAccroche();
      bouton = { libelle: "Commencer", faire: suivant };
      pied = <p>{NON_AFFILIATION}</p>;
      break;

    case "principe":
      contenu = ecranPrincipe();
      bouton = { libelle: "C'est parti", faire: suivant };
      pied = <p>{MENTION_PRINCIPE}</p>;
      break;

    case "console":
      contenu = ecranConsole({ r, repondre });
      bouton = { libelle: "Continuer", faire: suivant, actif: !!r.plateforme };
      break;
    case "tiktok":
      contenu = ecranTiktok({ r, repondre });
      bouton = { libelle: "Continuer", faire: suivant, actif: !!r.tiktok };
      break;
    case "objectif":
      contenu = ecranObjectif({ r, repondre });
      bouton = { libelle: "Continuer", faire: suivant };
      break;
    case "heures":
      contenu = ecranHeures({ r, repondre });
      bouton = { libelle: "Voir mon plan", faire: suivant };
      pied = <p>{REPERE_HEURES}</p>;
      break;
    case "plan":
      contenu = ecranPlan({ objectif, frequence });
      bouton = { libelle: "Créer ma première vidéo", faire: suivant };
      pied = <p>{MENTION_OBJECTIF}</p>;
      break;

    case "clips":
      contenu = {
        gauche: <Titre sous={clips.length ? `${dureeLisible(total)} de ton jeu.` : "Tes parties, enregistrées avec ta manette."}>{`Dépose tes clips${r.plateforme ? ` ${r.plateforme === "xbox" ? "Xbox" : "PS5"}` : ""}.`}</Titre>,
        droite: (
          <div
            className="relative flex min-h-0 flex-1 flex-col lg:py-[2vh]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              ajouter(e.dataTransfer.files);
            }}
          >
            <input ref={galerie} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => (ajouter(e.target.files), (e.target.value = ""))} />
            <button
              type="button"
              onClick={() => galerie.current?.click()}
              className={`depot mt-5 lg:mt-0 ${clips.length ? "depot-court" : "!min-h-0 flex-1"}`}
            >
              {!clips.length && (
                <>
                  <Objet nom="clip-b" className="absolute right-[5%] top-[7%] h-[21%] w-[32%]" />
                  <Objet nom="manette" className="absolute bottom-[4%] left-[4%] h-[25%] w-[34%]" />
                </>
              )}
              <span className="depot-plus" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className={`titre relative z-20 text-[22px] ${clips.length ? "lg:text-[28px]" : "lg:text-[clamp(32px,3vw,58px)]"}`}>
                {clips.length ? (
                  "Ajouter des clips"
                ) : (
                  <>
                    <span className="lg:hidden">Choisir dans ma galerie</span>
                    <span className="hidden lg:inline">Glisse tes clips ici</span>
                  </>
                )}
              </span>
            </button>
            {clips.length > 0 && (
              <div className={`relative mt-4 grid gap-3 lg:mt-7 lg:min-h-0 lg:flex-1 lg:auto-rows-fr lg:gap-7 ${clips.length <= 2 || clips.length === 4 ? "grid-cols-2" : "grid-cols-3"} ${clips.length <= 3 ? COLONNES[clips.length] : ""}`}>
                {clips.map((c, i) => (
                  <div key={c.url} className="surgit relative aspect-[4/5] overflow-hidden rounded-[20px] border-2 border-encre bg-encre shadow-[0_5px_0_var(--color-encre)] lg:aspect-auto lg:min-h-0 lg:rounded-[30px] lg:shadow-[0_8px_0_var(--color-encre)]">
                    <video src={`${c.url}#t=0.5`} muted playsInline autoPlay={i === clips.length - 1} loop preload="auto" className="h-full w-full object-cover lg:absolute lg:inset-0" />
                    <span className="pastille absolute bottom-2 left-2 bg-jaune tabular-nums lg:bottom-5 lg:left-5 lg:min-h-10 lg:px-4 lg:text-[18px]">{dureeLisible(c.duree)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
        fond: "jaune",
        large: true,
      };
      bouton = { libelle: clips.length ? `Continuer avec ${clips.length} clip${clips.length > 1 ? "s" : ""}` : "Ajoute au moins un clip", faire: suivant, actif: clips.length > 0 };
      break;

    case "style":
      contenu = {
        gauche: (
          <>
            <Titre
              plus={
                <>
            <label htmlFor="titre-studio" className="mt-1 block text-[14px] font-bold lg:mt-9 lg:text-[20px]">
              Ton titre
            </label>
            <input id="titre-studio" maxLength={TITRE_MAX} placeholder="Ex. Mon chien conduit mieux que moi" className="champ mt-2 lg:mt-3 lg:h-[72px] lg:rounded-2xl lg:px-6 lg:text-[22px]" value={titre} onChange={(e) => setTitre(e.target.value)} />
                </>
              }
            >
              Titre et style.
            </Titre>
          </>
        ),
        droite: (
          <div className="mt-4 grid flex-1 grid-cols-[1fr_0.72fr] lg:min-h-0 gap-3 lg:mt-0 lg:grid-cols-[1fr_0.8fr] lg:gap-8 lg:py-[2vh]">
            <div className="relative z-20 flex min-w-0 flex-col gap-3.5 lg:justify-center lg:gap-6" role="radiogroup" aria-label="Style">
              {(Object.keys(STYLES) as Style[]).map((s, i) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={style === s}
                  onClick={() => {
                    pop(0.3 + i * 0.3);
                    setStyle(s);
                  }}
                  className="touche max-lg:flex-1 max-lg:!px-4 max-lg:!py-3"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="titre text-[20px] lg:text-[clamp(28px,2.500vw,44px)]">{STYLES[s].nom}</span>
                    {style === s && <Coche className="h-7 w-7 shrink-0 lg:h-10 lg:w-10" />}
                  </span>
                  <span className="mt-1 block text-[13px] leading-tight lg:mt-2 lg:text-[18px]">{STYLES[s].detail}</span>
                  {/* Le rythme du style : longueur des plans */}
                  <span className="mt-3 flex h-4 gap-1 lg:mt-5 lg:h-7 lg:gap-1.5" aria-hidden="true">
                    {RYTHMES[s].map((f, j) => (
                      <span key={j} className={`rounded-md border-2 border-encre lg:rounded-lg ${style === s ? ["bg-rose", "bg-blanc", "bg-turquoise", "bg-orange"][j % 4] : "bg-beige"}`} style={{ flex: f }} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
            <Essai url={clips[0]?.url ?? ""} titre={titre} style={style} />
          </div>
        ),
        fond: "turquoise",
        large: true,
      };
      bouton = { libelle: "Générer ma vidéo", faire: suivant };
      break;

    case "montage":
      return (
        <Montage
          entete={entete}
          urls={urlsDe(clips)}
          titre={titre}
          secondes={regl.secondes}
          fini={() => {
            setCredits((c) => Math.max(0, c - 1));
            setEtape("resultat");
          }}
        />
      );

    case "resultat":
      contenu = {
        gauche: (
          <>
            <Confettis />
            <Titre
              fete
              plus={
                <div className="flex flex-wrap gap-1.5 pt-2 lg:gap-3 lg:pt-5">
                  {["100 % ton jeu", "9:16", "1080 × 1920", STYLES[style].nom].map((t, i) => (
                    <span key={t} className={`pastille surgit lg:min-h-11 lg:px-4 lg:text-[17px] ${["bg-turquoise", "bg-fond", "bg-fond", "bg-jaune"][i]}`} style={{ "--d": `${500 + i * 120}ms` } as React.CSSProperties}>
                      {t}
                    </span>
                  ))}
                </div>
              }
            >
              <span className="block lg:text-[1.3em] lg:leading-[0.98]">Ta vidéo est prête.</span>
            </Titre>
          </>
        ),
        droite: <Finale url={urlFinale} titre={titre} />,
        fond: "rose",
      };
      bouton = { libelle: "Poster ma vidéo", faire: suivant };
      second = { libelle: "Continuer", faire: autre };
      break;

    case "publier":
      return (
        <Publier
          entete={entete}
          pseudo={regl.pseudo || hasard}
          url={urlFinale}
          titre={titre}
          partir={(d) => {
            setDepart(d);
            setParti(false);
            setEtape("fin");
          }}
        />
      );

    case "fin":
      if (!depart) return null;
      return (
        <Fin
          entete={entete}
          depart={depart}
          url={urlFinale}
          titre={titre}
          pseudo={regl.pseudo || hasard}
          fini={() => setParti(true)}
          action={
            parti && (
              <button
                type="button"
                className="bouton bouton-rose w-full"
                onClick={autre}
              >
                Créer une autre vidéo
              </button>
            )
          }
        />
      );
  }

  return (
    <Duo
      cle={etape}
      entete={entete}
      marque={q >= 0}
      {...contenu}
      action={
        bouton && (
          <div className="flex gap-3 lg:gap-4">
            {second && (
              <button type="button" onClick={second.faire} className="bouton bouton-blanc shrink-0">
                {second.libelle}
              </button>
            )}
            <button type="button" onClick={bouton.faire} disabled={bouton.actif === false} className="bouton bouton-rose w-full">
              {bouton.libelle}
            </button>
          </div>
        )
      }
      pied={pied}
    />
  );
}

/* Sur ordinateur : un à trois clips prennent toute la largeur du panneau. */
const COLONNES = ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3"];
const RYTHMES: Record<Style, number[]> = { defi: [3, 2, 2, 3, 2, 2], drole: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], mission: [5, 4, 5] };

/* Même tableau tant que les clips ne changent pas : le montage ne repart pas à chaque image. */
const memo = new WeakMap<Clip[], string[]>();
function urlsDe(c: Clip[]) {
  if (!memo.has(c)) memo.set(c, c.map((x) => x.url));
  return memo.get(c)!;
}

function Champ({ libelle, valeur, changer, numerique, exemple }: { exemple?: string; libelle: string; valeur: string; changer: (v: string) => void; numerique?: boolean }) {
  return (
    <label className="block text-[14px] font-bold">
      {libelle}
      <input placeholder={exemple} className="champ mt-1.5 font-normal" inputMode={numerique ? "numeric" : undefined} value={valeur} onChange={(e) => changer(e.target.value)} />
    </label>
  );
}

/** La vidéo finale dans le téléphone, avec le son si l'appareil l'autorise. */
function Finale({ url, titre }: { url: string; titre: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muet, setMuet] = useState(false);
  useEffect(() => {
    const v = ref.current!;
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      setMuet(true);
      v.play().catch(() => {});
    });
  }, []);
  const basculer = () => {
    const v = ref.current!;
    v.muted = !v.muted;
    setMuet(v.muted);
    v.play().catch(() => {});
  };
  return (
    <button type="button" onClick={basculer} aria-label={muet ? "Activer le son" : "Couper le son"} className="relative mt-4 min-h-[320px] flex-1 lg:mt-0 lg:min-h-0">
      <Telephone className="surgit absolute inset-0">
        <VideoPortrait url={url} titre={titre} lecteur={ref} />
      </Telephone>
      {muet && <span className="pastille absolute bottom-[12%] left-1/2 z-20 -translate-x-1/2 bg-blanc lg:min-h-11 lg:px-5 lg:text-[16px]">Toucher pour le son</span>}
    </button>
  );
}

/** Le départ : la vidéo s'envole, les comptes se cochent, le tampon tombe. */
function Fin({ entete, depart, url, titre, pseudo, fini, action }: { entete: React.ReactNode; depart: Depart; url: string; titre: string; pseudo: string; fini: () => void; action: React.ReactNode }) {
  const [t, setT] = useState(0);
  const fin = useRef(fini);
  fin.current = fini;
  useEffect(() => {
    const plans: [number, () => void][] = [
      [500, envol],
      [1500, () => pop(0.4)],
      [1950, () => pop(0.8)],
      [2500, tampon],
      [2750, bravo],
      [3900, () => fin.current()],
    ];
    const ids = plans.map(([d, son], i) => setTimeout(() => (son(), setT(i + 1)), d));
    return () => ids.forEach(clearTimeout);
  }, []);
  return (
    <Duo
      cle="fin"
      entete={entete}
      action={action}
      fond="turquoise"
      gauche={
        <>
          {t >= 5 && <Confettis />}
          <Titre
            key={t >= 4 ? "ok" : "envoi"}
            travaille={t < 4}
            fete={t >= 4}
            plus={
              <div className="flex flex-col gap-2.5 pt-2 lg:gap-4 lg:pt-5">
                {depart.reseaux.map((r, i) => {
                  const fait = t >= 2 + i;
                  return (
                    <div key={r} className={`flex items-center gap-3 rounded-[18px] border-2 border-encre p-2.5 transition-colors duration-200 lg:gap-5 lg:rounded-[24px] lg:p-5 ${fait ? "bg-jaune" : "bg-fond"}`}>
                      <PictoReseau r={r} />
                      <span className="min-w-0 flex-1">
                        <span className="titre block !text-[18px] lg:!text-[26px]">{nomsReseaux([r])}</span>
                        <span className="mt-0.5 block text-[12px] font-medium leading-snug lg:mt-1 lg:text-[16px]">
                          <span className="inline-block">@{pseudo}</span> <span className="inline-block">· {depart.quand ?? "maintenant"}</span>
                        </span>
                      </span>
                      {fait ? <Coche className="surgit h-7 w-7 shrink-0 lg:h-10 lg:w-10" /> : <span className="clignote h-7 w-7 shrink-0 rounded-full border-2 border-encre bg-rose lg:h-10 lg:w-10" aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            }
          >
            {t < 4 ? "Ça part." : depart.quand ? "C'est calé." : "C'est posté."}
          </Titre>
        </>
      }
      droite={
        <div className="relative mt-3 min-h-[320px] flex-1 lg:mt-0 lg:min-h-0">
          <Telephone key={t >= 4 ? "pose" : "vol"} className={`absolute inset-0 ${t >= 4 ? "surgit" : t >= 1 ? "envol" : ""}`}>
            <VideoPortrait url={url} titre={titre} />
          </Telephone>
          {t >= 4 && (
            <>
              <span className="fin-coeurs" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <Coeur key={i} i={i} />
                ))}
              </span>
              <span className="absolute inset-0 z-30 grid place-items-center">
                <p className="tampon titre whitespace-nowrap rounded-[22px] border-4 border-encre bg-rose px-5 py-3 text-[44px] shadow-[0_6px_0_var(--color-encre)] lg:rounded-[32px] lg:border-[6px] lg:px-9 lg:py-7 lg:text-[clamp(52px,5.400vw,104px)] lg:shadow-[0_12px_0_var(--color-encre)]">{depart.quand ? "Programmée !" : "Publiée !"}</p>
              </span>
            </>
          )}
        </div>
      }
    />
  );
}
