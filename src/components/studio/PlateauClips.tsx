"use client";
/*
 * Studio de tournage « lien → clips » : le parcours du site, à faire soi-même devant la caméra (sans inscription).
 * Tu cliques à chaque écran : questions, lien (un tap le colle), réglages, montage, clips, publication.
 * Régie sur /studio. Une fois prêt, xpclip.com ouvre le premier écran sur cet appareil (cookie, lib/tournage.ts).
 * Réservé à l'équipe : rien n'est écrit dans un vrai compte, rien n'est envoyé au moteur.
 * Les clips montrés sont ceux de la démo (components/onboarding/demo.ts). Appui long sur le logo : retour à la régie.
 */
import "@/app/app/outil.css";
import { useEffect, useRef, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { CarteClip } from "@/components/clips/CarteClip";
import { Reglages as ReglagesClips } from "@/components/clips/Reglages";
import { Cadre, Progression, Question } from "@/components/onboarding/Cadre";
import { DEMO } from "@/components/onboarding/demo";
import { ecranAccroche, ecranActivite, ecranDestinations, ecranObjectif, ecranPlan, ecranRythme, ecranStyle, ecranTiktok, REPERE_RYTHME } from "@/components/onboarding/Ecrans";
import { Confettis } from "@/components/studio/Confettis";
import { Logo } from "@/components/marque/Logo";
import { OPTIONS_PAR_DEFAUT, type OptionsClips } from "@/lib/clips-options";
import { MENTION_OBJECTIF, ONBOARDING } from "@/lib/config";
import { CLIPS_SEMAINE_DEFAUT, type Reponses } from "@/lib/onboarding";
import { bravo, preparer, reveiller } from "@/lib/sons";
import { ecrireReglages, lireReglages, pseudoAuHasard, REGLAGES_DEFAUT, type Reglages } from "@/lib/studio";
import { poserTournage } from "@/lib/tournage";

const SUITE = ["regie", "accroche", "activite", "destinations", "tiktok", "style", "rythme", "objectif", "plan", "lien", "reglages", "montage", "clips", "poster", "fin"] as const;
type Etape = (typeof SUITE)[number];
/** Les écrans de l'onboarding, numérotés comme sur le vrai site. */
const PARCOURS: Etape[] = ["accroche", "activite", "destinations", "tiktok", "style", "rythme", "objectif", "plan"];
const ETAPES_MONTAGE = ["Vidéo récupérée", "Transcription", "Moments forts", "Montage 9:16"];
const RESEAUX = ["TikTok", "YouTube Shorts", "Instagram Reels"];
const secondes = (d: string) => d.split(":").reduce((s, x) => s * 60 + Number(x), 0);

/** `direct` : on arrive sur le premier écran (xpclip.com), sans passer par la régie. */
export function PlateauClips({ direct = false }: { direct?: boolean }) {
  const [etape, setEtape] = useState<Etape>(direct ? "accroche" : "regie");
  const [regl, setRegl] = useState<Reglages>(REGLAGES_DEFAUT);
  const [r, setR] = useState<Reponses>({});
  const [options, setOptions] = useState<OptionsClips>({ ...OPTIONS_PAR_DEFAUT, nombre: 4 });
  const [credits, setCredits] = useState(REGLAGES_DEFAUT.credits);
  const [hasard, setHasard] = useState("");
  const [lienColle, setLienColle] = useState(false);
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

  // Prêt à filmer : taper xpclip.com ouvre directement le tournage, sur cet appareil seulement.
  useEffect(() => poserTournage(regl.tournage), [regl.tournage]);

  const lien = regl.lien?.trim() || DEMO.lien;
  const pseudo = regl.pseudo || hasard;
  const repondre = (x: Reponses) => setR((v) => ({ ...v, ...x }));
  const aller = (e: Etape) => setEtape(e);
  const suivant = () => aller(SUITE[SUITE.indexOf(etape) + 1]);
  const retour = () => aller(SUITE[Math.max(1, SUITE.indexOf(etape) - 1)]);
  const regler = (x: Partial<Reglages>) => {
    const n = { ...regl, ...x };
    setRegl(n);
    ecrireReglages(n);
  };

  /** Nouvelle prise : tout repart de zéro, sauf les réglages. */
  function action(depuis: Etape = "accroche") {
    setR({});
    setOptions({ ...OPTIONS_PAR_DEFAUT, nombre: 4 });
    setCredits(regl.credits);
    setHasard(pseudoAuHasard());
    setLienColle(false);
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
        {SUITE.indexOf(etape) >= SUITE.indexOf("lien") && (
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
            <Champ libelle="Lien qui s'écrit à l'écran" exemple={DEMO.lien} valeur={regl.lien ?? ""} changer={(v) => regler({ lien: v })} />
            <Champ libelle="Pseudo montré à la publication" exemple={hasard || "Au hasard à chaque prise"} valeur={regl.pseudo} changer={(v) => regler({ pseudo: v.replace(/\s/g, "") })} />
            <Champ libelle="Clips restants au départ" numerique valeur={String(regl.credits)} changer={(v) => regler({ credits: Math.max(0, Math.min(999, Number(v.replace(/\D/g, "")) || 0)) })} />
            <Champ libelle="Durée du montage (secondes)" numerique valeur={String(regl.secondes)} changer={(v) => regler({ secondes: Math.max(3, Math.min(60, Number(v.replace(/\D/g, "")) || 3)) })} />
            <label className="flex min-h-12 items-center justify-between gap-3 text-[14px] font-bold">
              Taper xpclip.com ouvre le tournage sur ce téléphone
              <input type="checkbox" checked={regl.tournage} onChange={(e) => regler({ tournage: e.target.checked })} className="h-6 w-6 accent-[var(--color-rose)]" />
            </label>
            <p className="text-[13px] text-encre2">Les clips montrés sont ceux de la démo du site. Appui long sur le logo pour revenir ici.</p>
          </div>
        ),
      };
      bouton = { libelle: "Commencer à filmer", faire: () => action() };
      break;

    case "accroche":
      contenu = ecranAccroche();
      bouton = { libelle: "C'est parti", faire: suivant };
      pied = <p>Sans engagement. Résiliation en deux clics.</p>;
      break;
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
      bouton = { libelle: "Créer mon premier clip", faire: suivant };
      pied = <p>{MENTION_OBJECTIF}</p>;
      break;

    case "lien":
      contenu = {
        gauche: <Question avant="Ta vidéo" sous="YouTube, Twitch, Kick ou X. XPclip s'occupe du reste.">Colle le lien de ta vidéo.</Question>,
        droite: <LienQuiSecrit lien={lien} fini={() => setLienColle(true)} />,
        fond: "jaune",
      };
      bouton = { libelle: "Créer mes clips", faire: suivant, actif: lienColle };
      break;

    case "reglages":
      contenu = {
        gauche: <Question avant="Ton style" sous="L'aperçu change en direct.">Règle tes clips.</Question>,
        droite: <ReglagesClips options={options} changer={(o) => setOptions((v) => ({ ...v, ...o }))} />,
        large: true,
      };
      bouton = { libelle: `Créer mes ${options.nombre} clips`, faire: suivant };
      break;

    case "montage":
      contenu = {
        gauche: <Question avant="En cours" sous="L'IA écoute toute la vidéo et garde le meilleur.">On monte tes clips.</Question>,
        droite: (
          <Montage
            secondes={regl.secondes}
            fini={() => {
              setCredits((c) => Math.max(0, c - Math.min(options.nombre, DEMO.clips.length)));
              bravo();
              aller("clips");
            }}
          />
        ),
      };
      break;

    case "clips": {
      const clips = DEMO.clips.slice(0, Math.min(options.nombre, DEMO.clips.length));
      contenu = {
        gauche: (
          <>
            <Confettis />
            <Question avant="C'est prêt" sous={`${clips.length} clips sous-titrés, notés sur 100, prêts à poster.`}>
              Tes clips sont prêts.
            </Question>
          </>
        ),
        droite: (
          <div className="ap-clips w-full lg:grid-cols-4">
            {clips.map((c) => (
              <CarteClip key={c.nom} url={`/v4/${c.nom}.mp4`} titre={c.titre} score={c.score} duree={secondes(c.duree)} telecharger={`/v4/${c.nom}.mp4`} />
            ))}
          </div>
        ),
        large: true,
      };
      bouton = { libelle: "Poster mes clips", faire: suivant };
      break;
    }

    case "poster":
      contenu = {
        gauche: <Question avant="Publication" sous="Tes clips partent sur tes comptes, au format vertical.">Où tu postes ?</Question>,
        droite: <Poster pseudo={pseudo} />,
        fond: "turquoise",
      };
      bouton = { libelle: "Poster maintenant", faire: suivant };
      break;

    case "fin":
      contenu = {
        gauche: (
          <>
            <Confettis />
            <Question avant="En ligne" sous={`Publié sur @${pseudo}. Les vues arrivent.`}>
              Tes clips sont postés.
            </Question>
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
      bouton = { libelle: "Créer d'autres clips", faire: () => (setLienColle(false), aller("lien")) };
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

/** Le champ du lien : un tap le colle, il s'écrit lettre par lettre, puis la vidéo est trouvée. */
function LienQuiSecrit({ lien, fini: surFini }: { lien: string; fini: () => void }) {
  const [colle, setColle] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!colle) return;
    if (n >= lien.length) return surFini();
    const id = setTimeout(() => setN((x) => x + 1), 700 / lien.length);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colle, n, lien.length]);
  const fini = colle && n >= lien.length;
  return (
    <div className="ob-carte surgit">
      <span className="ob-label">Lien de la vidéo</span>
      <button type="button" onClick={() => setColle(true)} className="ob-champ-lien w-full text-left">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400l-1 1M14 10a4.500 4.500 0 00-6.400 0l-3 3a4.500 4.500 0 006.400 6.400l1-1" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" />
        </svg>
        <span className={`min-w-0 flex-1 truncate ${colle ? "font-bold" : "text-encre2"}`}>{colle ? `https://${lien.slice(0, n)}` : "Colle le lien de ta vidéo"}</span>
        {!colle && <span className="rounded-lg border-2 border-encre bg-jaune px-2 py-0.5 text-[13px] font-extrabold">Coller</span>}
      </button>
      <ul className="ob-plateformes" aria-label="Liens acceptés">
        {["YouTube", "Twitch", "Kick", "X"].map((x) => (
          <li key={x} style={fini && lien.toLowerCase().includes(x === "YouTube" ? "youtu" : x.toLowerCase()) ? { background: "var(--color-jaune)" } : undefined}>
            {x}
          </li>
        ))}
      </ul>
      {fini && (
        <div className="surgit flex items-center gap-3 rounded-2xl border-2 border-encre bg-fond p-2">
          <img src={`/v4/${DEMO.avant}.webp`} alt="" width={800} height={450} className="w-28 shrink-0 rounded-lg border-2 border-encre" />
          <div className="min-w-0 text-[14px] font-bold">
            <p className="truncate">{DEMO.titreVideo ?? "Ta vidéo"}</p>
            <p className="text-encre2">
              {DEMO.plateforme} · {DEMO.duree}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Le suivi du montage, en accéléré : les étapes se cochent, les moments apparaissent avec leur note. */
function Montage({ secondes, fini }: { secondes: number; fini: () => void }) {
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

/** Le choix des réseaux, pour la caméra : rien ne part vraiment. */
function Poster({ pseudo }: { pseudo: string }) {
  const [choisis, setChoisis] = useState<string[]>(["TikTok"]);
  return (
    <div className="ob-carte surgit">
      <p className="text-[14px] font-bold text-encre2">Compte : @{pseudo}</p>
      {RESEAUX.map((x) => {
        const oui = choisis.includes(x);
        return (
          <button
            key={x}
            type="button"
            role="checkbox"
            aria-checked={oui}
            onClick={() => setChoisis((l) => (oui ? l.filter((y) => y !== x) : [...l, x]))}
            className={`flex min-h-14 items-center justify-between rounded-2xl border-2 border-encre px-4 text-[17px] font-extrabold ${oui ? "bg-jaune" : "bg-blanc"}`}
          >
            {x}
            <span className={`grid h-7 w-7 place-items-center rounded-lg border-2 border-encre ${oui ? "bg-encre text-fond" : "bg-blanc"}`}>{oui ? "✓" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
