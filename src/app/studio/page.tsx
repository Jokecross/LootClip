"use client";
/*
 * Studio de tournage (/studio) : tout le parcours d'un trait, pour filmer les vidéos de présentation.
 * Réservé à l'équipe, rien n'est écrit dans un vrai compte. Appui long sur le logo : retour aux réglages.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/marque/Logo";
import { ecranConsole, ecranHeures, ecranObjectif, ecranPlan, ecranTiktok, REPERE_HEURES } from "@/components/onboarding/Ecrans";
import { PanneauHero } from "@/components/onboarding/PanneauHero";
import { Confettis } from "@/components/studio/Confettis";
import { Montage } from "@/components/studio/Montage";
import { Bientot, nomsReseaux, PictoReseau, Publier, type Depart } from "@/components/studio/Publier";
import { VideoPortrait } from "@/components/studio/VideoPortrait";
import { Duo } from "@/components/ui/Duo";
import { Coche, Entete } from "@/components/ui/Parcours";
import { CLIPS, MENTION_OBJECTIF, NON_AFFILIATION, ONBOARDING, PUBLICATION_AUTO, STYLES, TITRE_MAX, type Style } from "@/lib/config";
import { lireDuree } from "@/lib/depot";
import { useEtat, type Video } from "@/lib/etat";
import { duree as dureeLisible, videos } from "@/lib/format";
import { videosPourHeures, type Reponses } from "@/lib/onboarding";
import { bravo, envol, pop, reveiller, tampon } from "@/lib/sons";
import { ecrireReglages, garderVideo, lireReglages, pseudoAuHasard, lireVideo, REGLAGES_DEFAUT, type Reglages } from "@/lib/studio";
import { supabase } from "@/lib/supabase";

const SUITE = ["regie", "accroche", "console", "tiktok", "objectif", "heures", "plan", "clips", "style", "montage", "resultat", "publier", "fin"] as const;
type Etape = (typeof SUITE)[number];
const QUESTIONS: Etape[] = ["console", "tiktok", "objectif", "heures", "plan"];

type Clip = { url: string; duree: number };

export default function Studio() {
  const etat = useEtat();
  const [droit, setDroit] = useState<boolean | null>(null);

  useEffect(() => {
    if (!etat.charge) return;
    supabase.auth
      .getSession()
      .then(({ data }) => fetch("/api/studio", { headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } }))
      .then((r) => setDroit(r.ok))
      .catch(() => setDroit(false));
  }, [etat.charge, etat.compte?.email]);

  if (droit === null) return <div className="min-h-dvh bg-fond" />;
  if (!droit)
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4">
        <h1 className="titre text-[32px]">Page réservée.</h1>
        <p className="mt-2 text-[15px] text-encre2">Connecte-toi avec le compte de l&apos;équipe.</p>
        <Link href="/inscription" className="bouton bouton-rose mt-6 w-full">
          Me connecter
        </Link>
      </main>
    );
  return <Plateau />;
}

function Plateau() {
  const [etape, setEtape] = useState<Etape>("regie");
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
    setRegl(lireReglages());
    lireVideo().then((v) => {
      setFinale(v);
      setLu(true);
    });
    const go = () => reveiller();
    window.addEventListener("click", go);
    return () => window.removeEventListener("click", go);
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

  let contenu: { gauche: React.ReactNode; droite: React.ReactNode; fond?: string } = { gauche: null, droite: null };
  let bouton: { libelle: string; faire: () => void; actif?: boolean } | false | null = null;
  let second: { libelle: string; faire: () => void } | null = null;
  let pied: React.ReactNode = null;

  switch (etape) {
    case "regie":
      contenu = {
        gauche: (
        <>
          <h1 className="titre text-[34px] lg:text-[56px]">Prêt à filmer ?</h1>
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

          <details className="carte mt-4 px-4">
            <summary className="flex min-h-12 cursor-pointer items-center text-[14px] font-bold">Autres réglages</summary>
            <div className="pb-4">
              <Champ libelle="Crédits affichés" numerique valeur={String(regl.credits || "")} changer={(v) => regler({ credits: Math.min(200, Number(v.replace(/\D/g, "")) || 0) })} />
              <div className="mt-3">
                <Champ libelle="Titre déjà écrit" valeur={regl.titre} changer={(v) => regler({ titre: v.slice(0, TITRE_MAX) })} />
              </div>
              <p className="mt-4 text-[14px] font-bold">Durée du montage à l&apos;écran</p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Durée du montage">
                {[6, 9, 14].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={regl.secondes === s} onClick={() => regler({ secondes: s })} className={`min-h-12 rounded-[14px] border-2 border-encre text-[15px] font-bold ${regl.secondes === s ? "bg-jaune" : "bg-blanc"}`}>
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
        </>
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
      contenu = {
        gauche: (
          <div className="flex flex-1 flex-col justify-center lg:block">
            <div className="carte-forte surgit overflow-hidden lg:hidden">
              <img src="/visuels/hero-900.jpg" width={1672} height={941} alt="" className="block h-auto w-full" />
            </div>
            <h1 className="surgit titre mt-8 text-[46px] lg:mt-0 lg:text-[clamp(52px,5.6vw,104px)]" style={{ "--d": "160ms" } as React.CSSProperties}>
              Ta manette peut devenir un salaire.
            </h1>
            <p className="surgit mt-3 text-[17px] leading-snug text-encre2 lg:mt-7 lg:max-w-[28ch] lg:text-[clamp(20px,1.7vw,30px)]" style={{ "--d": "320ms" } as React.CSSProperties}>
              Tes clips GTA 6, montés pour TikTok en quelques minutes.
            </p>
          </div>
        ),
        droite: <PanneauHero />,
        fond: "lg:bg-nuit2",
      };
      bouton = { libelle: "Commencer", faire: suivant };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{NON_AFFILIATION}</p>;
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
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{REPERE_HEURES}</p>;
      break;
    case "plan":
      contenu = ecranPlan({ objectif, frequence });
      bouton = { libelle: "Créer ma première vidéo", faire: suivant };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{MENTION_OBJECTIF}</p>;
      break;

    case "clips":
      contenu = {
        gauche: (
          <>
            <h1 className="titre text-[34px] lg:text-[clamp(52px,5.2vw,96px)]">Dépose tes clips.</h1>
            <p className="mt-2 text-[15px] text-encre2 lg:mt-6 lg:text-[clamp(18px,1.5vw,26px)]">{clips.length ? `${dureeLisible(total)} de jeu.` : <><span className="lg:hidden">Directement depuis ta galerie.</span><span className="hidden lg:inline">Directement depuis ton ordinateur.</span></>}</p>
          </>
        ),
        droite: (
          <div
            className="contents lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              ajouter(e.dataTransfer.files);
            }}
          >
            <input ref={galerie} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => (ajouter(e.target.files), (e.target.value = ""))} />
            <button type="button" onClick={() => galerie.current?.click()} className={`carte-pointillee mt-5 flex w-full flex-col items-center justify-center gap-3 bg-blanc transition-[padding] duration-300 lg:mt-0 lg:rounded-3xl ${clips.length ? "py-5 lg:flex-row lg:gap-5" : "flex-1 py-12 lg:gap-7"}`}>
              <span className={`grid place-items-center rounded-2xl border-2 border-encre bg-rose shadow-[0_4px_0_var(--color-encre)] transition-all ${clips.length ? "h-12 w-12" : "h-20 w-20 lg:h-32 lg:w-32 lg:rounded-[32px]"}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className={`titre text-[19px] font-bold ${clips.length ? "lg:text-[24px]" : "lg:text-[clamp(28px,2.6vw,46px)]"}`}>{clips.length ? "Ajouter des clips" : <><span className="lg:hidden">Choisir dans ma galerie</span><span className="hidden lg:inline">Glisse tes clips ici</span></>}</span>
            </button>
            {clips.length > 0 && (
              <div className={`mt-4 grid gap-2.5 lg:mt-6 lg:min-h-0 lg:flex-1 lg:auto-rows-fr lg:gap-5 ${clips.length <= 4 ? "grid-cols-2" : "grid-cols-3"} ${clips.length <= 3 ? COLONNES[clips.length] : ""}`}>
                {clips.map((c, i) => (
                  <div key={c.url} className={`carte-forte surgit relative aspect-[4/5] overflow-hidden bg-encre lg:aspect-auto lg:min-h-0 lg:rounded-3xl ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
                    <video src={`${c.url}#t=0.5`} muted playsInline autoPlay loop preload="auto" className="h-full w-full object-cover lg:absolute lg:inset-0" />
                    <span className="pastille absolute bottom-1.5 left-1.5 bg-blanc tabular-nums lg:bottom-4 lg:left-4 lg:text-[15px]">{dureeLisible(c.duree)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
        fond: "lg:bg-jaune",
      };
      bouton = { libelle: clips.length ? `Continuer avec ${clips.length} clip${clips.length > 1 ? "s" : ""}` : "Ajoute au moins un clip", faire: suivant, actif: clips.length > 0 };
      break;

    case "style":
      contenu = {
        gauche: (
          <>
            <h1 className="titre text-[34px] lg:text-[clamp(52px,5.2vw,96px)]">Titre et style.</h1>
            <label htmlFor="titre-studio" className="mt-5 block text-[14px] font-bold lg:mt-9 lg:text-[18px]">
              Ton titre
            </label>
            <input id="titre-studio" maxLength={TITRE_MAX} placeholder="Ex. Mon chien conduit mieux que moi" className="champ mt-2 lg:mt-3 lg:h-[72px] lg:rounded-2xl lg:px-6 lg:text-[22px]" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </>
        ),
        droite: (
          <>
            <p className="mt-6 text-[14px] font-bold lg:hidden">Ton style</p>
            <div className="mt-2 flex flex-col gap-3 lg:mt-0 lg:flex-1 lg:gap-6" role="radiogroup" aria-label="Style">
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
                  style={{ "--d": `${i * 90}ms` } as React.CSSProperties}
                  className="option surgit min-h-[84px] lg:flex-1 lg:rounded-3xl lg:px-10 lg:shadow-[0_6px_0_var(--color-encre)]"
                >
                  <span className="lg:min-w-0 lg:flex-1">
                    <span className="titre block text-[21px] lg:text-[clamp(30px,2.9vw,54px)]">{STYLES[s].nom}</span>
                    <span className="mt-1 block text-[13px] text-encre2 lg:mt-2 lg:text-[18px]">{STYLES[s].detail}</span>
                    {/* Le rythme du style : longueur des plans */}
                    <span className="mt-6 hidden h-6 gap-1.5 lg:flex" aria-hidden="true">
                      {RYTHMES[s].map((f, j) => (
                        <span key={j} className={`rounded-md border-2 border-encre ${["bg-rose", "bg-turquoise", "bg-orange"][j % 3]}`} style={{ flex: f }} />
                      ))}
                    </span>
                  </span>
                  {style === s && <Coche className="h-6 w-6 shrink-0 lg:h-11 lg:w-11" />}
                </button>
              ))}
            </div>
          </>
        ),
        fond: "lg:bg-turquoise",
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
            <h1 className="surgit titre text-center text-[38px] lg:text-left lg:text-[clamp(60px,6.4vw,120px)]">Ta vidéo est prête.</h1>
            <div className="order-2 mt-5 flex flex-wrap justify-center gap-2 lg:order-none lg:mt-9 lg:justify-start lg:gap-3.5">
              {["9:16", "1080 × 1920", STYLES[style].nom].map((t, i) => (
                <span key={t} className={`pastille surgit lg:min-h-11 lg:px-5 lg:text-[18px] ${["bg-turquoise", "bg-jaune", "bg-rose"][i]}`} style={{ "--d": `${400 + i * 120}ms` } as React.CSSProperties}>
                  {t}
                </span>
              ))}
            </div>
          </>
        ),
        droite: (
          <div className="order-1 mt-5 flex min-h-0 flex-1 items-center justify-center lg:order-none lg:mt-0">
            <Finale url={urlFinale} titre={titre} />
          </div>
        ),
        fond: "lg:bg-rose",
      };
      bouton = { libelle: "Poster ma vidéo", faire: suivant };
      second = { libelle: "Continuer", faire: autre };
      break;

    case "publier":
      return (
        <Publier
          entete={entete}
          pseudo={regl.pseudo || hasard}
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

/** La vidéo finale, avec le son si le téléphone l'autorise. */
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
  return (
    <button
      type="button"
      className="carte-forte surgit relative aspect-[9/16] h-[52dvh] max-h-[620px] min-h-[300px] -rotate-1 lg:h-[min(76dvh,960px)] lg:max-h-none lg:rounded-3xl overflow-hidden bg-encre shadow-[0_8px_0_var(--color-encre)]"
      onClick={() => {
        const v = ref.current!;
        v.muted = !v.muted;
        setMuet(v.muted);
        v.play().catch(() => {});
      }}
      aria-label={muet ? "Activer le son" : "Couper le son"}
    >
      <VideoPortrait url={url} titre={titre} lecteur={ref} />
      {muet && <span className="pastille absolute bottom-3 left-1/2 -translate-x-1/2 bg-blanc">Toucher pour le son</span>}
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
      fond="lg:bg-turquoise"
      pied={PUBLICATION_AUTO || !action ? null : <p className="mt-3 text-center text-[11px] text-encre2">Publication automatique : bientôt sur XPclip.</p>}
      gauche={
        <div className="order-1 flex flex-1 flex-col lg:order-none lg:flex-none">
          {t >= 5 && <Confettis />}
          <div className="mt-6 flex flex-col gap-3 lg:mt-0 lg:gap-5">
            {depart.reseaux.map((r, i) => (
              <div key={r} className={t >= 2 + i ? "" : "invisible"}>
                <div key={String(t >= 2 + i)} className="carte-forte surgit flex items-center gap-3 bg-blanc p-3.5 lg:gap-6 lg:rounded-3xl lg:p-7">
                  <PictoReseau r={r} />
                  <span className="min-w-0 flex-1">
                    <span className="titre block text-[19px] lg:text-[clamp(26px,2.4vw,42px)]">{nomsReseaux([r])}</span>
                    <span className="mt-1 block text-[13px] leading-snug text-encre2 lg:mt-2 lg:text-[18px]">
                      <span className="inline-block">@{pseudo}</span> <span className="inline-block">· {depart.quand ?? "maintenant"}</span>
                    </span>
                  </span>
                  <Coche className="h-7 w-7 shrink-0 lg:h-11 lg:w-11" />
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-5 flex justify-center lg:justify-start ${t >= 4 ? "surgit" : "invisible"}`}>
            <Bientot />
          </div>
        </div>
      }
      droite={
        <div className="relative flex flex-1 items-end justify-center lg:items-center">
          {t < 2 && (
            <div className={`carte-forte absolute top-1/2 -mt-[210px] h-[380px] w-[214px] overflow-hidden bg-encre lg:relative lg:top-auto lg:mt-0 lg:aspect-[9/16] lg:h-[min(70dvh,860px)] lg:w-auto lg:rounded-3xl ${t >= 1 ? "envol" : ""}`}>
              <VideoPortrait url={url} titre={titre} />
            </div>
          )}
          <div className="flex min-h-[110px] items-center justify-center lg:absolute lg:inset-0">
            {t >= 4 && (
              <p className="tampon titre whitespace-nowrap rounded-2xl border-4 border-encre bg-rose px-5 py-3 text-[42px] shadow-[0_6px_0_var(--color-encre)] lg:rounded-[32px] lg:border-[6px] lg:px-9 lg:py-7 lg:text-[clamp(52px,5.8vw,112px)] lg:shadow-[0_12px_0_var(--color-encre)]">
                {depart.quand ? "Programmée !" : "Publiée !"}
              </p>
            )}
          </div>
        </div>
      }
    />
  );
}
