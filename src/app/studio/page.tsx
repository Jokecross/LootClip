"use client";
/*
 * Studio de tournage (/studio) : tout le parcours d'un trait, pour filmer les vidéos de présentation.
 * Réservé à l'équipe, rien n'est écrit dans un vrai compte. Appui long sur le logo : retour aux réglages.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/marque/Logo";
import { EcranConsole, EcranHeures, EcranObjectif, EcranPlan, EcranTiktok, REPERE_HEURES } from "@/components/onboarding/Ecrans";
import { Confettis } from "@/components/studio/Confettis";
import { Montage } from "@/components/studio/Montage";
import { Bientot, nomsReseaux, PictoReseau, Publier, type Depart } from "@/components/studio/Publier";
import { Coche, Entete } from "@/components/ui/Parcours";
import { CLIPS, MENTION_OBJECTIF, NON_AFFILIATION, ONBOARDING, PUBLICATION_AUTO, STYLES, TITRE_MAX, type Style } from "@/lib/config";
import { lireDuree } from "@/lib/depot";
import { useEtat } from "@/lib/etat";
import { duree as dureeLisible, videos } from "@/lib/format";
import { videosPourHeures, type Reponses } from "@/lib/onboarding";
import { bravo, envol, pop, reveiller, tampon } from "@/lib/sons";
import { ecrireReglages, garderVideo, lireReglages, lireVideo, REGLAGES_DEFAUT, type Reglages } from "@/lib/studio";
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
  const [depart, setDepart] = useState<Depart | null>(null);
  const [parti, setParti] = useState(false);
  const galerie = useRef<HTMLInputElement>(null);
  const appui = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setRegl(lireReglages());
    lireVideo().then(setFinale);
    const go = () => reveiller();
    window.addEventListener("click", go);
    return () => window.removeEventListener("click", go);
  }, []);

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
    setDepart(null);
    setEtape(depuis);
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

  let contenu: React.ReactNode = null;
  let bouton: { libelle: string; faire: () => void; actif?: boolean } | false | null = null;
  let pied: React.ReactNode = null;

  switch (etape) {
    case "regie":
      contenu = (
        <>
          <h1 className="titre text-[34px]">Studio.</h1>
          <p className="mt-2 text-[14px] text-encre2">Règle une fois. Ensuite, appuie sur Action et filme.</p>

          <label className="carte mt-5 flex min-h-[68px] cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">Vidéo finale</span>
              <span className="mt-0.5 block truncate text-[13px] text-encre2">{finale ? finale.nom : "Choisis un MP4 fait avec XPclip."}</span>
            </span>
            <span className={`pastille ${finale ? "bg-turquoise" : "bg-jaune"}`}>{finale ? "Prête" : "Choisir"}</span>
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFinale({ url: URL.createObjectURL(f), nom: f.name });
                await garderVideo(f).catch(() => {});
              }}
            />
          </label>
          {!finale && <p className="mt-2 text-[13px] font-bold">Il te la faut pour commencer.</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Champ libelle="Ton pseudo" valeur={regl.pseudo} changer={(v) => regler({ pseudo: v.replace(/[@\s]/g, "").slice(0, 24) })} />
            <Champ libelle="Crédits affichés" numerique valeur={String(regl.credits || "")} changer={(v) => regler({ credits: Math.min(200, Number(v.replace(/\D/g, "")) || 0) })} />
          </div>
          <div className="mt-3">
            <Champ libelle="Titre déjà écrit (facultatif)" valeur={regl.titre} changer={(v) => regler({ titre: v.slice(0, TITRE_MAX) })} />
          </div>
          <p className="mt-4 text-[14px] font-bold">Durée du montage à l&apos;écran</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Durée du montage">
            {[6, 9, 14].map((s) => (
              <button key={s} type="button" role="radio" aria-checked={regl.secondes === s} onClick={() => regler({ secondes: s })} className={`min-h-12 rounded-[14px] border-2 border-encre text-[15px] font-bold ${regl.secondes === s ? "bg-jaune" : "bg-blanc"}`}>
                {s} s
              </button>
            ))}
          </div>
          <ul className="carte-pointillee mt-5 flex flex-col gap-1.5 p-4 text-[13px] leading-snug">
            <li>Enlève le mode silencieux de ton téléphone.</li>
            <li>Appui long sur le logo : retour ici.</li>
            <li>Aucun compte créé, aucun crédit utilisé.</li>
          </ul>
          <button type="button" disabled={!finale} onClick={() => action("clips")} className="lien disabled:opacity-40 mx-auto mt-3 flex min-h-11 items-center text-[14px]">
            Commencer directement aux clips
          </button>
        </>
      );
      bouton = { libelle: "Action", faire: () => action(), actif: !!finale };
      break;

    case "accroche":
      contenu = (
        <div className="flex flex-1 flex-col justify-center">
          <div className="carte-forte surgit overflow-hidden">
            <img src="/visuels/hero-900.jpg" width={1672} height={941} alt="" className="block h-auto w-full" />
          </div>
          <h1 className="surgit titre mt-8 text-[46px]" style={{ "--d": "160ms" } as React.CSSProperties}>
            Ta manette peut devenir un salaire.
          </h1>
          <p className="surgit mt-3 text-[17px] leading-snug text-encre2" style={{ "--d": "320ms" } as React.CSSProperties}>
            Tes clips GTA 6, montés pour TikTok en quelques minutes.
          </p>
        </div>
      );
      bouton = { libelle: "Commencer", faire: suivant };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{NON_AFFILIATION}</p>;
      break;

    case "console":
      contenu = <EcranConsole r={r} repondre={repondre} />;
      bouton = { libelle: "Continuer", faire: suivant, actif: !!r.plateforme };
      break;
    case "tiktok":
      contenu = <EcranTiktok r={r} repondre={repondre} />;
      bouton = { libelle: "Continuer", faire: suivant, actif: !!r.tiktok };
      break;
    case "objectif":
      contenu = <EcranObjectif r={r} repondre={repondre} />;
      bouton = { libelle: "Continuer", faire: suivant };
      break;
    case "heures":
      contenu = <EcranHeures r={r} repondre={repondre} />;
      bouton = { libelle: "Voir mon plan", faire: suivant };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{REPERE_HEURES}</p>;
      break;
    case "plan":
      contenu = <EcranPlan objectif={objectif} frequence={frequence} />;
      bouton = { libelle: "Créer ma première vidéo", faire: suivant };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{MENTION_OBJECTIF}</p>;
      break;

    case "clips":
      contenu = (
        <>
          <h1 className="titre text-[34px]">Dépose tes clips.</h1>
          <p className="mt-2 text-[15px] text-encre2">{clips.length ? `${dureeLisible(total)} de jeu.` : "Directement depuis ta galerie."}</p>
          <input ref={galerie} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => (ajouter(e.target.files), (e.target.value = ""))} />
          <button type="button" onClick={() => galerie.current?.click()} className={`carte-pointillee mt-5 flex w-full flex-col items-center justify-center gap-3 bg-blanc transition-[padding] duration-300 ${clips.length ? "py-5" : "flex-1 py-12"}`}>
            <span className={`grid place-items-center rounded-2xl border-2 border-encre bg-rose shadow-[0_4px_0_var(--color-encre)] transition-all ${clips.length ? "h-12 w-12" : "h-20 w-20"}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="titre text-[19px] font-bold">{clips.length ? "Ajouter des clips" : "Choisir dans ma galerie"}</span>
          </button>
          {clips.length > 0 && (
            <div className={`mt-4 grid gap-2.5 ${clips.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
              {clips.map((c, i) => (
                <div key={c.url} className={`carte-forte surgit relative aspect-[4/5] overflow-hidden bg-encre ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
                  <video src={`${c.url}#t=0.5`} muted playsInline autoPlay loop preload="auto" className="h-full w-full object-cover" />
                  <span className="pastille absolute bottom-1.5 left-1.5 bg-blanc tabular-nums">{dureeLisible(c.duree)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      );
      bouton = { libelle: clips.length ? `Continuer avec ${clips.length} clip${clips.length > 1 ? "s" : ""}` : "Ajoute au moins un clip", faire: suivant, actif: clips.length > 0 };
      break;

    case "style":
      contenu = (
        <>
          <h1 className="titre text-[34px]">Titre et style.</h1>
          <label htmlFor="titre-studio" className="mt-5 block text-[14px] font-bold">
            Ton titre
          </label>
          <input id="titre-studio" maxLength={TITRE_MAX} placeholder="Ex. Mon chien conduit mieux que moi" className="champ mt-2" value={titre} onChange={(e) => setTitre(e.target.value)} />
          <p className="mt-6 text-[14px] font-bold">Ton style</p>
          <div className="mt-2 flex flex-col gap-3" role="radiogroup" aria-label="Style">
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
                className="option surgit min-h-[84px]"
              >
                <span>
                  <span className="titre block text-[21px]">{STYLES[s].nom}</span>
                  <span className="mt-1 block text-[13px] text-encre2">{STYLES[s].detail}</span>
                </span>
                {style === s && <Coche />}
              </button>
            ))}
          </div>
        </>
      );
      bouton = { libelle: "Générer ma vidéo", faire: suivant };
      break;

    case "montage":
      contenu = (
        <Montage
          urls={urlsDe(clips)}
          titre={titre}
          secondes={regl.secondes}
          fini={() => {
            setCredits((c) => Math.max(0, c - 1));
            setEtape("resultat");
          }}
        />
      );
      break;

    case "resultat":
      contenu = (
        <>
          <Confettis />
          <h1 className="surgit titre text-center text-[38px]">Ta vidéo est prête.</h1>
          <div className="mt-5 flex min-h-0 flex-1 items-center justify-center">
            <Finale url={urlFinale} />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["9:16", "1080 × 1920", STYLES[style].nom].map((t, i) => (
              <span key={t} className={`pastille surgit ${["bg-turquoise", "bg-jaune", "bg-rose"][i]}`} style={{ "--d": `${400 + i * 120}ms` } as React.CSSProperties}>
                {t}
              </span>
            ))}
          </div>
        </>
      );
      bouton = { libelle: "Publier ma vidéo", faire: suivant };
      break;

    case "publier":
      contenu = (
        <Publier
          pseudo={regl.pseudo}
          partir={(d) => {
            setDepart(d);
            setParti(false);
            setEtape("fin");
          }}
        />
      );
      break;

    case "fin":
      contenu = depart && <Fin depart={depart} url={urlFinale} pseudo={regl.pseudo} fini={() => setParti(true)} />;
      bouton = parti && {
        libelle: "Créer une autre vidéo",
        faire: () => {
          const reste = credits;
          action("clips");
          setCredits(reste);
        },
      };
      pied = PUBLICATION_AUTO ? null : <p className="mt-3 text-center text-[11px] text-encre2">Publication automatique : bientôt sur XPclip.</p>;
      break;
  }

  const q = QUESTIONS.indexOf(etape);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-x-clip px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
      {q >= 0 ? (
        <Entete n={q + 1} total={QUESTIONS.length} retour={retour} />
      ) : (
        <header className="flex items-center justify-between">
          {logo}
          {SUITE.indexOf(etape) >= SUITE.indexOf("clips") && (
            <span key={credits} className="pastille surgit bg-turquoise tabular-nums">
              {videos(credits)}
            </span>
          )}
        </header>
      )}
      <div key={etape} className="entree mt-5 flex flex-1 flex-col">
        {contenu}
      </div>
      {bouton && (
        <div className="pt-6">
          <button type="button" onClick={bouton.faire} disabled={bouton.actif === false} className="bouton bouton-rose w-full">
            {bouton.libelle}
          </button>
          {pied}
        </div>
      )}
    </main>
  );
}

/* Même tableau tant que les clips ne changent pas : le montage ne repart pas à chaque image. */
const memo = new WeakMap<Clip[], string[]>();
function urlsDe(c: Clip[]) {
  if (!memo.has(c)) memo.set(c, c.map((x) => x.url));
  return memo.get(c)!;
}

function Champ({ libelle, valeur, changer, numerique }: { libelle: string; valeur: string; changer: (v: string) => void; numerique?: boolean }) {
  return (
    <label className="block text-[14px] font-bold">
      {libelle}
      <input className="champ mt-1.5 font-normal" inputMode={numerique ? "numeric" : undefined} value={valeur} onChange={(e) => changer(e.target.value)} />
    </label>
  );
}

/** La vidéo finale, avec le son si le téléphone l'autorise. */
function Finale({ url }: { url: string }) {
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
      className="carte-forte surgit relative aspect-[9/16] h-[52dvh] max-h-[620px] min-h-[300px] -rotate-1 overflow-hidden bg-encre shadow-[0_8px_0_var(--color-encre)]"
      onClick={() => {
        const v = ref.current!;
        v.muted = !v.muted;
        setMuet(v.muted);
        v.play().catch(() => {});
      }}
      aria-label={muet ? "Activer le son" : "Couper le son"}
    >
      <video ref={ref} src={url} playsInline loop autoPlay className="h-full w-full object-cover" />
      {muet && <span className="pastille absolute bottom-3 left-1/2 -translate-x-1/2 bg-blanc">Toucher pour le son</span>}
    </button>
  );
}

/** Le départ : la vidéo s'envole, les comptes se cochent, le tampon tombe. */
function Fin({ depart, url, pseudo, fini }: { depart: Depart; url: string; pseudo: string; fini: () => void }) {
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
    <div className="relative flex flex-1 flex-col items-center justify-center">
      {t >= 5 && <Confettis />}
      {t < 2 && (
        <div className={`carte-forte absolute top-1/2 -mt-[210px] h-[380px] w-[214px] overflow-hidden bg-encre ${t >= 1 ? "envol" : ""}`}>
          <video src={url} muted playsInline autoPlay loop className="h-full w-full object-cover" />
        </div>
      )}
      <div className="w-full">
        <div className="flex min-h-[110px] items-center justify-center">
          {t >= 4 && <p className="tampon titre rounded-2xl border-4 border-encre bg-rose px-6 py-3 text-[48px] shadow-[0_6px_0_var(--color-encre)]">{depart.quand ? "Planifiée !" : "Envoyée !"}</p>}
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {depart.reseaux.map((r, i) =>
            t >= 2 + i ? (
              <div key={r} className="carte-forte surgit flex items-center gap-3 bg-blanc p-3.5">
                <PictoReseau r={r} />
                <span className="min-w-0 flex-1">
                  <span className="titre block text-[19px]">{nomsReseaux([r])}</span>
                  <span className="mt-1 block truncate text-[13px] text-encre2">
                    @{pseudo} · {depart.quand ?? "maintenant"}
                  </span>
                </span>
                <Coche className="h-7 w-7 shrink-0" />
              </div>
            ) : null,
          )}
        </div>
        {t >= 4 && (
          <div className="surgit mt-5 flex justify-center">
            <Bientot />
          </div>
        )}
      </div>
    </div>
  );
}
