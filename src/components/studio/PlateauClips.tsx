"use client";
/*
 * Studio de tournage « lien → clips » : le parcours du site, à faire soi-même devant la caméra (sans inscription).
 * Tu cliques à chaque écran : l'accueil (tu colles le lien dans le champ du haut), les questions, réglages, montage, clips, publication.
 * Régie sur /studio. Une fois prêt, xpclip.com ouvre le premier écran sur cet appareil (cookie, lib/tournage.ts).
 * Réservé à l'équipe. La publication reste simulée : rien n'est posté.
 * Analyse réelle : le lien collé sur la landing part au vrai moteur (POST /api/clips), on suit le lot et on montre
 * ses vrais clips. Sinon (ou en cas d'échec), la démo (components/onboarding/demo.ts). Appui long sur le logo : retour à la régie.
 */
import "@/app/app/outil.css";
import { useEffect, useRef, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { LancerLien } from "@/components/accueil/ChampLien";
import { Landing } from "@/components/accueil/Landing";
import { ReglagesCompacts } from "@/components/clips/ReglagesCompacts";
import { Cadre, Progression, Question } from "@/components/onboarding/Cadre";
import { DEMOS, demoDuLien, type Demo } from "@/components/onboarding/demo";
import { ecranActivite, ecranDestinations, ecranObjectif, ecranPlan, ecranRythme, ecranStyle, ecranTiktok, REPERE_RYTHME } from "@/components/onboarding/Ecrans";
import { Confettis } from "@/components/studio/Confettis";
import { MontageReel, Programmation, PUBLICATION_DEFAUT, quand, Recommandation, recommander, VitrineClips, type ClipVitrine, type Publication } from "@/components/studio/EcransStudio";
import { Logo } from "@/components/marque/Logo";
import { OPTIONS_PAR_DEFAUT, type OptionsClips } from "@/lib/clips-options";
import { MENTION_OBJECTIF, ONBOARDING } from "@/lib/config";
import { CLIPS_SEMAINE_DEFAUT, type Reponses } from "@/lib/onboarding";
import { bravo, preparer, reveiller } from "@/lib/sons";
import { ecrireReglages, lireReglages, pseudoAuHasard, REGLAGES_DEFAUT, type Reglages } from "@/lib/studio";
import { poserTournage } from "@/lib/tournage";

const SUITE = ["regie", "lp", "activite", "destinations", "tiktok", "style", "rythme", "objectif", "plan", "reglages", "montage", "clips", "poster", "fin"] as const;
type Etape = (typeof SUITE)[number];
/** Les écrans de l'onboarding, numérotés comme sur le vrai site. */
const PARCOURS: Etape[] = ["lp", "activite", "destinations", "tiktok", "style", "rythme", "objectif", "plan"];
const ETAPES_MONTAGE = ["Vidéo récupérée", "Transcription", "Moments forts", "Montage 9:16"];

async function enTetes(): Promise<Record<string, string>> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}

/** `direct` : on arrive sur le premier écran (xpclip.com), sans passer par la régie. */
export function PlateauClips({ direct = false }: { direct?: boolean }) {
  const [etape, setEtape] = useState<Etape>(direct ? "lp" : "regie");
  const [regl, setRegl] = useState<Reglages>(REGLAGES_DEFAUT);
  const [r, setR] = useState<Reponses>({});
  const [options, setOptions] = useState<OptionsClips>({ ...OPTIONS_PAR_DEFAUT, nombre: 4 });
  const [credits, setCredits] = useState(REGLAGES_DEFAUT.credits);
  const [hasard, setHasard] = useState("");
  const [lienColle, setLienColle] = useState("");
  const [pub, setPub] = useState<Publication>(PUBLICATION_DEFAUT);
  const [perso, setPerso] = useState(false);
  /** Le lot lancé pour de vrai (analyse du lien collé), et ses clips une fois finis. */
  const [lot, setLot] = useState<{ id: string; erreur?: string } | null>(null);
  const [vrais, setVrais] = useState<ClipVitrine[] | null>(null);
  const appui = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const g = lireReglages();
    setRegl(g);
    setCredits(g.credits);
    setHasard(pseudoAuHasard());
    const son = setTimeout(preparer, 900);
    const go = () => reveiller();
    window.addEventListener("click", go);
    return () => {
      clearTimeout(son);
      window.removeEventListener("click", go);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [etape]);

  // Prêt à filmer : taper xpclip.com ouvre directement le tournage, sur cet appareil seulement.
  useEffect(() => {
    poserTournage(regl.tournage);
  }, [regl.tournage]);

  // La démo : celle du lien collé si c'est l'une des deux vidéos, sinon celle choisie dans la régie.
  const DEMO: Demo = DEMOS[demoDuLien(lienColle) ?? regl.demo ?? "michou"];
  const lien = regl.lien?.trim() || DEMO.lien;
  const pseudo = regl.pseudo || hasard;
  const repondre = (x: Reponses) => setR((v) => ({ ...v, ...x }));
  const aller = (e: Etape) => setEtape(e);
  const suivant = () => aller(SUITE[SUITE.indexOf(etape) + 1]);
  const retour = () => aller(SUITE[Math.max(1, SUITE.indexOf(etape) - 1)]);
  /** Analyse réelle : le lien collé sur la landing part au moteur, avec les réglages choisis. */
  async function lancerLot() {
    setVrais(null);
    const brut = lienColle.trim();
    if (regl.reel === false || !brut) return setLot(null);
    setLot({ id: "" });
    const rep = await fetch("/api/clips", {
      method: "POST",
      headers: { "content-type": "application/json", ...(await enTetes()) },
      body: JSON.stringify({ lien: /^https?:\/\//.test(brut) ? brut : `https://${brut}`, options }),
    }).catch(() => null);
    const json = await rep?.json().catch(() => null);
    if (rep?.ok && json?.id) return setLot({ id: json.id });
    const code = json?.erreur;
    setLot({ id: "", erreur: code === "quota" ? "Plus de clips ce mois-ci sur ce compte." : code === "heures" ? "Plus d'heures de vidéo ce mois-ci sur ce compte." : code === "non_connecte" ? "Connecte-toi avec le compte de l'équipe." : code === "bientot" ? "L'analyse en ligne n'est pas encore ouverte." : json?.message || "Le lien n'a pas pu être lancé." });
  }

  const regler = (x: Partial<Reglages>) => {
    const n = { ...regl, ...x };
    setRegl(n);
    ecrireReglages(n);
  };

  /** Nouvelle prise : tout repart de zéro, sauf les réglages. */
  function action(depuis: Etape = "lp") {
    setR({});
    setOptions({ ...OPTIONS_PAR_DEFAUT, nombre: 4 });
    setCredits(regl.credits);
    setHasard(pseudoAuHasard());
    setLienColle("");
    setPub(PUBLICATION_DEFAUT);
    setPerso(false);
    setLot(null);
    setVrais(null);
    aller(depuis);
  }

  const logo = (
    <button
      type="button"
      aria-label="XPclip"
      className="flex min-h-11 touch-manipulation select-none items-center [-webkit-touch-callout:none]"
      onPointerDown={() => {
        appui.current = setTimeout(() => aller("regie"), 900);
      }}
      onPointerUp={() => clearTimeout(appui.current)}
      onPointerLeave={() => clearTimeout(appui.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Logo taille={30} />
    </button>
  );
  const n = PARCOURS.indexOf(etape);
  const entete =
    n >= 1 ? (
      <Progression n={n + 1} total={PARCOURS.length} retour={retour} />
    ) : (
      <div className="ob-progression justify-between">
        {logo}
        {SUITE.indexOf(etape) >= SUITE.indexOf("reglages") && (
          <span key={credits} className="pastille surgit bg-turquoise tabular-nums">
            {credits} clips restants
          </span>
        )}
      </div>
    );

  let contenu: { gauche: React.ReactNode; droite: React.ReactNode; fond?: string; large?: boolean; centre?: boolean } = { gauche: null, droite: null };
  let bouton: { libelle: string; faire: () => void; actif?: boolean } | null = null;
  let pied: React.ReactNode = null;
  const objectif = r.objectif ?? ONBOARDING.objectifParDefaut;
  const frequence = r.frequence ?? CLIPS_SEMAINE_DEFAUT;

  switch (etape) {
    case "regie":
      contenu = {
        gauche: <Question avant="Studio de tournage" sous="Cette page, personne ne la voit. Le tournage commence après.">Prêt à filmer ?</Question>,
        droite: (
          <div className="ob-carte surgit">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[14px] font-bold">Vidéo de la démo</legend>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(DEMOS) as (keyof typeof DEMOS)[]).map((k) => {
                  const d = DEMOS[k];
                  const choisie = (regl.demo ?? "michou") === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={choisie}
                      onClick={() => regler({ demo: k })}
                      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-encre text-left ${choisie ? "bg-jaune shadow-[0_4px_0_var(--color-encre)]" : "bg-blanc opacity-70"}`}
                    >
                      <img src={`/v4/${d.clips[0].nom}.webp`} alt="" width={432} height={768} className="aspect-[4/5] w-full border-b-2 border-encre object-cover" />
                      <span className="block px-2.5 pb-2.5 pt-2">
                        <b className="block truncate text-[14px]">{d.chaine}</b>
                        <span className="line-clamp-2 block text-[12px] font-semibold leading-tight text-encre2">{d.titreVideo}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-encre2">Colle le lien de l&apos;une des deux sur la landing : ses clips s&apos;affichent tout seuls.</p>
            </fieldset>
            <Champ libelle="Lien qui s'écrit à l'écran" exemple={DEMO.lien} valeur={regl.lien ?? ""} changer={(v) => regler({ lien: v })} />
            <Champ libelle="Pseudo montré à la publication" exemple={hasard || "Au hasard à chaque prise"} valeur={regl.pseudo} changer={(v) => regler({ pseudo: v.replace(/\s/g, "") })} />
            <Champ libelle="Clips restants au départ" numerique valeur={String(regl.credits)} changer={(v) => regler({ credits: Math.max(0, Math.min(999, Number(v.replace(/\D/g, "")) || 0)) })} />
            <label className="flex min-h-12 items-center justify-between gap-3 text-[14px] font-bold">
              Analyser pour de vrai le lien collé (sinon : la démo)
              <input type="checkbox" checked={regl.reel !== false} onChange={(e) => regler({ reel: e.target.checked })} className="h-6 w-6 accent-[var(--color-rose)]" />
            </label>
            <Champ libelle="Durée du montage de la démo (secondes)" numerique valeur={String(regl.secondes)} changer={(v) => regler({ secondes: Math.max(3, Math.min(60, Number(v.replace(/\D/g, "")) || 3)) })} />
            <label className="flex min-h-12 items-center justify-between gap-3 text-[14px] font-bold">
              Taper xpclip.com ouvre le tournage sur ce téléphone
              <input type="checkbox" checked={regl.tournage} onChange={(e) => regler({ tournage: e.target.checked })} className="h-6 w-6 accent-[var(--color-rose)]" />
            </label>
            <p className="text-[13px] text-encre2">Analyse réelle : 3 à 7 min selon la vidéo. Sans lien collé, la démo du site. Appui long sur le logo pour revenir ici.</p>
          </div>
        ),
      };
      bouton = { libelle: "Commencer à filmer", faire: () => action() };
      break;

    case "lp":
      // Le vrai accueil : on colle le lien dans le champ du haut, le bouton ouvre la première question.
      return (
        <LancerLien.Provider
          value={(l) => {
            setLienColle(l.replace(/^https?:\/\//, ""));
            suivant();
          }}
        >
          <Landing />
        </LancerLien.Provider>
      );
    case "activite":
      contenu = ecranActivite({ r, repondre });
      bouton = { libelle: "Continuer", faire: suivant, actif: !!r.activite };
      break;
    case "destinations":
      contenu = ecranDestinations({ r, repondre });
      bouton = { libelle: "Continuer", faire: suivant, actif: !!r.destinations?.length };
      break;
    case "tiktok":
      contenu = ecranTiktok({ r, repondre });
      bouton = { libelle: "Continuer", faire: suivant, actif: !!r.tiktok };
      break;
    case "style":
      contenu = ecranStyle({ r, repondre });
      bouton = { libelle: "Continuer", faire: suivant, actif: (r.stylesClips ?? []).length > 0 };
      break;
    case "rythme":
      contenu = ecranRythme({ r: { ...r, frequence }, repondre });
      bouton = { libelle: "Continuer", faire: suivant };
      pied = <p>{REPERE_RYTHME}</p>;
      break;
    case "objectif":
      contenu = ecranObjectif({ r: { ...r, objectif }, repondre });
      bouton = { libelle: "Continuer", faire: suivant };
      break;
    case "plan":
      contenu = ecranPlan({ objectif, frequence });
      bouton = { libelle: "Voir mes réglages", faire: () => (setOptions(recommander(r)), setPerso(false), suivant()) };
      pied = <p>{MENTION_OBJECTIF}</p>;
      break;

    case "reglages":
      contenu = {
        gauche: (
          <div className="max-lg:[&_.ob-sous]:hidden max-lg:[&_.ob-sur]:hidden">
            <Question avant="Ton style" sous={`Vidéo : ${(lienColle || lien).split("?")[0]}`}>
              {perso ? "Règle tes clips." : "On s'occupe de tout."}
            </Question>
          </div>
        ),
        droite: perso ? <ReglagesCompacts options={options} changer={(o) => setOptions((v) => ({ ...v, ...o }))} /> : <Recommandation options={options} personnaliser={() => setPerso(true)} />,
        large: perso,
      };
      bouton = { libelle: `Créer mes ${options.nombre} clips`, faire: () => (lancerLot(), suivant()) };
      break;

    case "montage": {
      const fini = (clips?: ClipVitrine[]) => {
        setVrais(clips ?? null);
        setCredits((c) => Math.max(0, c - (clips?.length ?? Math.min(options.nombre, DEMO.clips.length))));
        bravo();
        aller("clips");
      };
      contenu = {
        gauche: <Question avant="En cours" sous="L'IA écoute toute la vidéo et garde le meilleur.">On monte tes clips.</Question>,
        droite: lot ? (
          <MontageReel
            lot={lot}
            fini={fini}
            demo={() => {
              setLot(null);
            }}
          />
        ) : (
          <Montage secondes={regl.secondes} fini={() => fini()} demo={DEMO} />
        ),
      };
      break;
    }

    case "clips":
      contenu = {
        gauche: (
          <>
            <Confettis />
            <Question avant="C'est prêt" sous="Chaque clip est noté sur 100. Touche-en un pour voir pourquoi.">
              Tes clips sont prêts.
            </Question>
          </>
        ),
        droite: <VitrineClips nombre={options.nombre} clips={vrais ?? undefined} demo={DEMO} />,
        large: true,
      };
      bouton = { libelle: "Poster mes clips", faire: suivant };
      break;

    case "poster":
      contenu = {
        gauche: <Question avant="Publication" sous="Tes clips partent sur tes comptes, au format vertical.">Où tu postes ?</Question>,
        droite: <Programmation pseudo={pseudo} pub={pub} changer={(x) => setPub((v) => ({ ...v, ...x }))} />,
        fond: "turquoise",
      };
      bouton = { libelle: pub.programme ? "Programmer mes clips" : "Poster maintenant", faire: suivant, actif: pub.reseaux.length > 0 };
      break;

    case "fin":
      contenu = {
        gauche: (
          <>
            <Confettis />
            {pub.programme ? (
              <Question avant="Programmé" sous={`${pub.reseaux.join(", ")} · @${pseudo}. XPclip poste pour toi ${quand(pub)}.`}>
                Tes clips sont programmés.
              </Question>
            ) : (
              <Question avant="En ligne" sous={`${pub.reseaux.join(", ")} · @${pseudo}. Les vues arrivent.`}>
                Tes clips sont postés.
              </Question>
            )}
          </>
        ),
        droite: (
          <div className="ac-clips mx-auto" aria-hidden="true">
            {DEMO.clips.slice(0, 3).map((c, i) => (
              <div key={c.nom} className="ac-clip" data-actif={i === 1}>
                <div className="ac-ecran">{i === 1 ? <Boucle nom={c.nom} /> : <img src={`/v4/${c.nom}.webp`} alt="" width={432} height={768} />}</div>
                <span className="ac-score">
                  <b>{c.score}</b>/100
                </span>
              </div>
            ))}
          </div>
        ),
        fond: "rose",
      };
      bouton = { libelle: "Créer d'autres clips", faire: () => (setLienColle(""), aller("lp")) };
      break;
  }

  return (
    <Cadre
      cle={etape}
      entete={entete}
      {...contenu}
      action={
        bouton && (
          <button type="button" onClick={bouton.faire} disabled={bouton.actif === false} className="bouton bouton-rose w-full">
            {bouton.libelle}
          </button>
        )
      }
      pied={pied}
    />
  );
}

function Champ({ libelle, valeur, changer, numerique, exemple }: { exemple?: string; libelle: string; valeur: string; changer: (v: string) => void; numerique?: boolean }) {
  return (
    <label className="block text-[14px] font-bold">
      {libelle}
      <input placeholder={exemple} className="champ mt-1.5 font-normal" inputMode={numerique ? "numeric" : undefined} value={valeur} onChange={(e) => changer(e.target.value)} />
    </label>
  );
}

/** Le suivi du montage, en accéléré : les étapes se cochent, les moments apparaissent avec leur note. */
function Montage({ secondes, fini, demo: DEMO }: { secondes: number; fini: () => void; demo: Demo }) {
  const [t, setT] = useState(0);
  const total = secondes * 1000;
  useEffect(() => {
    const debut = performance.now();
    let id = 0;
    const tic = () => {
      const x = Math.min(1, (performance.now() - debut) / total);
      setT(x);
      if (x < 1) id = requestAnimationFrame(tic);
      else setTimeout(fini, 400);
    };
    id = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);
  const faites = Math.floor(t * ETAPES_MONTAGE.length);
  const moments = DEMO.clips.filter((_, i) => t > 0.45 + i * 0.12);
  return (
    <div className="ob-carte surgit">
      <div className="flex items-end justify-between">
        <span className="ob-label">{ETAPES_MONTAGE[Math.min(faites, ETAPES_MONTAGE.length - 1)]}…</span>
        <span className="titre text-[34px] tabular-nums">{Math.round(t * 100)} %</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full border-2 border-encre bg-beige">
        <span className="block h-full origin-left bg-rose" style={{ transform: `scaleX(${t})` }} />
      </div>
      <ol className="grid grid-cols-2 gap-2 text-[14px] font-bold">
        {ETAPES_MONTAGE.map((e, i) => (
          <li key={e} className={`flex items-center gap-2 ${i > faites ? "opacity-40" : ""}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full border-2 border-encre ${i < faites ? "bg-turquoise" : i === faites ? "bg-jaune" : "bg-blanc"}`}>{i < faites ? "✓" : ""}</span>
            {e}
          </li>
        ))}
      </ol>
      <ul className="flex flex-col gap-2">
        {moments.map((m) => (
          <li key={m.nom} className="surgit flex items-center justify-between gap-3 rounded-xl border-2 border-encre bg-fond px-3 py-2 text-[14px] font-bold">
            <span className="min-w-0 truncate">{m.titre}</span>
            <span className="rounded-lg border-2 border-encre bg-jaune px-2 text-[12px]">{m.score}/100</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

