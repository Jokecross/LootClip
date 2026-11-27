"use client";
/*
 * Onboarding « lien → clips » en 12 écrans. L'inscription est le tout premier écran (choix de Martin du 26/11), puis l'accroche,
 * les questions, et « ta vidéo » (lien collé, préparation, clips sous cadenas) juste avant les offres (27/11).
 * L'écran des offres s'affiche après les comptes à relier,
 * avant le premier lien.
 * Une action par écran, bouton principal en bas, barre de progression en haut, retour possible.
 * L'étape est dans l'adresse (?e=3) : le bouton retour du téléphone marche aussi.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ecranAccroche, ecranActivite, ecranDestinations, ecranObjectif, ecranPlan, ecranRythme, ecranStyle, ecranTiktok, REPERE_RYTHME } from "@/components/onboarding/Ecrans";
import { AccrocheCompte } from "@/components/onboarding/AccrocheCompte";
import { AnalyseVideo, lireApercu, RE_LIEN_VIDEO, ResultatVideo, SaisieVideo, type Apercu, type PhaseVideo } from "@/components/onboarding/EtapeVideo";
import { Reseaux } from "@/components/onboarding/Reseaux";
import { FormulaireCompte } from "@/components/compte/FormulaireCompte";
import { Paywall } from "@/components/app/Paywall";
import { Cadre, EnteteMarque, Progression, Question } from "@/components/onboarding/Cadre";
import { MENTION_OBJECTIF, ONBOARDING } from "@/lib/config";
import { aAcces, modifier, sansOnboarding, useEtat } from "@/lib/etat";
import { rafraichir } from "@/lib/serveur";
import { CLIPS_SEMAINE_DEFAUT, ecrirePreferences, ecrireReponses, effacerReponses, lireLienEnAttente, lireReponses, mettreLienEnAttente, type Reponses } from "@/lib/onboarding";
import { preparer, reveiller } from "@/lib/sons";
import { suivre } from "@/lib/suivi";

const ECRANS = ["compte", "accroche", "activite", "destinations", "tiktok", "style", "rythme", "objectif", "plan", "video", "reseaux", "lien"] as const;
const TOTAL = ECRANS.length;
const COMPTE = ECRANS.indexOf("compte") + 1;
const RESEAUX = ECRANS.indexOf("reseaux") + 1;
const PLAN = ECRANS.indexOf("plan") + 1;
const VIDEO = ECRANS.indexOf("video") + 1;
const LIEN = ECRANS.indexOf("lien") + 1;
const place = (e: (typeof ECRANS)[number]) => ECRANS.indexOf(e) + 1;
/** L'étape de l'adresse : un numéro (?e=3) ou un nom d'écran (?e=lien). */
const lireEtape = (brut: string | null) => (brut && (ECRANS as readonly string[]).includes(brut) ? place(brut as (typeof ECRANS)[number]) : Number(brut) || 1);

function premiereManquante(r: Reponses) {
  if (!r.activite) return place("activite");
  if (!r.destinations?.length) return place("destinations");
  if (!r.tiktok) return place("tiktok");
  if (!r.styleClips) return place("style");
  if (!r.frequence) return place("rythme");
  if (!r.objectif) return place("objectif");
  return null;
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const etat = useEtat();
  const n = Math.min(TOTAL, Math.max(1, lireEtape(params.get("e"))));
  const [r, setR] = useState<Reponses>({});
  const [pret, setPret] = useState(false);
  const [lien, setLien] = useState("");
  const [lienFaux, setLienFaux] = useState(false);
  const [phaseVideo, setPhaseVideo] = useState<PhaseVideo>("saisie");
  const [apercu, setApercu] = useState<Apercu | null | undefined>(undefined);
  const champLien = useRef<HTMLInputElement>(null);
  const aRepondre = sansOnboarding(etat);

  useEffect(() => {
    const lu = lireReponses();
    setR(lu);
    // Un lien collé sur l'accueil préremplit le dernier écran.
    setLien(lireLienEnAttente());
    setPret(true);
  }, []);

  useEffect(() => {
    if (!pret || !etat.charge) return;
    // L'inscription vient d'abord : sans compte, on ne va pas plus loin que l'écran du compte.
    if (!etat.compte) {
      if (n > COMPTE) router.replace(`/commencer?e=${COMPTE}`);
      return;
    }
    // Compte déjà profilé : plus de questions, direct à l'appli (les comptes à relier et le lien restent ouverts).
    if (!aRepondre) {
      if (n < VIDEO) router.replace("/app/creer");
      return;
    }
    if (n === COMPTE) return router.replace(`/commencer?e=${COMPTE + 1}`);
    const lu = lireReponses();
    const manque = premiereManquante(lu);
    if (manque && n > manque) return router.replace(`/commencer?e=${manque}`);
    // Questions finies : les réponses vont dans le profil, puis les comptes à relier et les offres.
    if (!manque && n > PLAN) {
      // La console n'est plus demandée : la base garde une valeur par défaut.
      const profil = { plateforme: lu.plateforme ?? "ps5", objectif: lu.objectif!, tiktok: lu.tiktok!, frequence: lu.frequence! };
      modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, plateforme: profil.plateforme, profil } : e.compte }));
      effacerReponses();
    }
  }, [pret, etat.charge, etat.compte, aRepondre, n, router]);

  useEffect(() => {
    const ecran = ECRANS[n - 1];
    const lu = lireReponses();
    suivre("onboarding_ecran", { numero: n, ecran, ...(ecran === "plan" ? { objectif: lu.objectif ?? 0, longues: lu.longues ?? 0, activite: lu.activite ?? "" } : {}) });
  }, [n]);

  // Les roues partent d'une valeur : elle compte comme réponse si le joueur n'y touche pas.
  useEffect(() => {
    if (!pret) return;
    const lu = lireReponses();
    if (ECRANS[n - 1] === "objectif" && !lu.objectif) repondre({ objectif: ONBOARDING.objectifParDefaut });
    if (ECRANS[n - 1] === "rythme" && !lu.frequence) repondre({ frequence: CLIPS_SEMAINE_DEFAUT, longues: Math.ceil(CLIPS_SEMAINE_DEFAUT / 3) });
  }, [n, pret]);

  // Le son n'est permis qu'après un toucher : on le réveille dès le premier bouton.
  useEffect(() => {
    const go = () => reveiller();
    const son = setTimeout(preparer, 900);
    window.addEventListener("click", go);
    return () => {
      clearTimeout(son);
      window.removeEventListener("click", go);
    };
  }, []);

  const repondre = (x: Reponses) => {
    ecrireReponses(x);
    // Le studio reprend ces choix par défaut (genre de clips, réseaux, activité).
    const { activite, destinations, styleClips, stylesClips } = x;
    if (activite || destinations || stylesClips) ecrirePreferences({ ...(activite && { activite }), ...(destinations && { destinations }), ...(stylesClips && { stylesClips, styleClips }) });
    setR((v) => ({ ...v, ...x }));
  };
  const suivant = () => router.push(`/commencer?e=${n + 1}`);
  const retour = () => (window.history.length > 1 ? router.back() : router.replace(n > 1 ? `/commencer?e=${n - 1}` : "/"));

  /** Compte créé au départ : on passe aux questions. */
  async function creerCompte() {
    await rafraichir();
    suivre("inscription", { methode: "email" });
    router.replace(`/commencer?e=${COMPTE + 1}`);
  }

  /** L'étape « ta vidéo » : le lien est gardé (les clips partent après le paiement), puis la préparation. */
  function analyserVideo() {
    const brut = lien.trim();
    const propre = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
    if (!RE_LIEN_VIDEO.test(brut)) {
      setLienFaux(true);
      return;
    }
    mettreLienEnAttente(propre);
    suivre("onboarding_lien_colle", {});
    setApercu(undefined);
    setPhaseVideo("analyse");
    lireApercu(propre).then((a) => setApercu(a));
  }

  /** Le premier lien : gardé pour la page Créer, qui lance les clips tout de suite. */
  function premierLien() {
    const brut = lien.trim();
    const propre = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
    if (!/^https?:\/\/([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(propre)) {
      setLienFaux(true);
      champLien.current?.focus();
      return;
    }
    mettreLienEnAttente(propre);
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, tutoVu: true } : e.compte }));
    router.push("/app/creer");
  }

  function plusTard() {
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, tutoVu: true } : e.compte }));
    router.push("/app/creer");
  }

  if (!pret || (!etat.compte && n > COMPTE) || (etat.compte && (n === COMPTE || (n > PLAN && aRepondre)))) return <div className="min-h-dvh bg-fond" />;

  if (n === RESEAUX) return <Reseaux n={n} total={TOTAL} ici={`/commencer?e=${RESEAUX}`} passer={() => router.replace(`/commencer?e=${LIEN}`)} />;

  // Onboarding terminé : l'écran des offres, puis le premier lien une fois l'abonnement pris.
  if (n === LIEN && etat.compte && !aAcces(etat)) return <Paywall ouvert moment="entree" apresPaiement={() => {}} />;

  const objectif = r.objectif ?? 0;

  let contenu: { gauche: React.ReactNode; droite: React.ReactNode; fond?: string; large?: boolean; centre?: boolean } = { gauche: null, droite: null };
  let action: { libelle: string; faire: () => void; actif: boolean } | null = null;
  let pied: React.ReactNode = null;

  switch (ECRANS[n - 1]) {
    case "accroche":
      contenu = ecranAccroche();
      action = { libelle: "C'est parti", faire: suivant, actif: true };
      pied = <p>Sans engagement. Résiliation en deux clics.</p>;
      break;

    case "activite":
      contenu = ecranActivite({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.activite };
      break;

    case "destinations":
      contenu = ecranDestinations({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.destinations?.length };
      break;

    case "tiktok":
      contenu = ecranTiktok({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.tiktok };
      break;

    case "style":
      contenu = ecranStyle({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: (r.stylesClips ?? (r.styleClips ? [r.styleClips] : [])).length > 0 };
      break;

    case "rythme":
      contenu = ecranRythme({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.frequence };
      pied = <p>{REPERE_RYTHME}</p>;
      break;

    case "objectif":
      contenu = ecranObjectif({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.objectif };
      break;

    case "plan":
      if (objectif && r.frequence) contenu = ecranPlan({ objectif, frequence: r.frequence });
      action = { libelle: "Continuer", faire: suivant, actif: !!objectif && !!r.frequence };
      pied = <p>{MENTION_OBJECTIF}</p>;
      break;

    case "compte":
      contenu = {
        gauche: <AccrocheCompte mode="inscription" />,
        droite: (
          <div className="ob-carte ob-carte-compte surgit">
            <FormulaireCompte mode="inscription" retour={`/commencer?e=${COMPTE + 1}`} valider={creerCompte} />
          </div>
        ),
        fond: "rose",
      };
      break;

    case "video":
      if (phaseVideo === "saisie") {
        contenu = {
          gauche: <Question avant="Ta vidéo" sous="On prépare tes clips à partir d'elle.">Colle le lien de ta vidéo.</Question>,
          droite: (
            <SaisieVideo
              lien={lien}
              faux={lienFaux}
              changer={(v) => {
                setLien(v);
                setLienFaux(false);
              }}
            />
          ),
          fond: "jaune",
        };
        action = { libelle: "Préparer mes clips", faire: analyserVideo, actif: lien.trim().length > 0 };
        pied = (
          <button type="button" onClick={suivant} className="ob-plus-tard">
            Je n&apos;ai pas de lien sous la main
          </button>
        );
      } else if (phaseVideo === "analyse") {
        contenu = {
          gauche: <Question avant="Ta vidéo" sous="Quelques secondes.">On prépare ton studio.</Question>,
          droite: <AnalyseVideo apercu={apercu} r={r} fini={() => setPhaseVideo("resultat")} />,
          fond: "jaune",
        };
        action = { libelle: "Un instant…", faire: () => {}, actif: false };
      } else {
        contenu = {
          gauche: (
            <Question avant="C'est prêt" sous="Débloque XPclip : tes clips se lancent tout de suite, puis XPclip les poste pour toi.">
              Ta vidéo est prête à être clippée.
            </Question>
          ),
          droite: <ResultatVideo apercu={apercu} r={r} />,
          fond: "rose",
          large: true,
        };
        action = { libelle: "Débloquer mes clips", faire: suivant, actif: true };
      }
      break;

    case "lien":
      contenu = {
        gauche: <Question avant="Ta première vidéo" sous="YouTube, Twitch, Kick ou X. XPclip s'occupe du reste.">Colle le lien de ta première vidéo.</Question>,
        droite: (
          <div className="ob-carte surgit">
            <label htmlFor="premier-lien" className="ob-label">
              Lien de la vidéo
            </label>
            <div className="ob-champ-lien" data-faux={lienFaux}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400l-1 1M14 10a4.500 4.500 0 00-6.400 0l-3 3a4.500 4.500 0 006.400 6.400l1-1" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" />
              </svg>
              <input
                id="premier-lien"
                ref={champLien}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://www.youtube.com/watch?v=…"
                value={lien}
                aria-invalid={lienFaux}
                onChange={(e) => {
                  setLien(e.target.value);
                  setLienFaux(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && premierLien()}
              />
            </div>
            {lienFaux ? (
              <p role="alert" className="ob-erreur">
                Ce lien ne marche pas. Vérifie-le.
              </p>
            ) : (
              <ul className="ob-plateformes" aria-label="Liens acceptés">
                {["YouTube", "Twitch", "Kick", "X"].map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
            <p className="ob-astuce">Astuce : une vidéo où des gens parlent donne les meilleurs clips.</p>
          </div>
        ),
        fond: "jaune",
      };
      action = { libelle: "Créer mes clips", faire: premierLien, actif: lien.trim().length > 0 };
      pied = (
        <button type="button" onClick={plusTard} className="ob-plus-tard">
          Je le ferai plus tard
        </button>
      );
      break;
  }

  return (
    <Cadre
      cle={n}
      entete={n === 1 ? <EnteteMarque /> : <Progression n={n} total={TOTAL} retour={n < RESEAUX && n !== COMPTE + 1 ? retour : undefined} />}
      {...contenu}
      action={
        action && (
          <button type="button" onClick={action.faire} disabled={!action.actif} className="bouton bouton-rose w-full">
            {action.libelle}
          </button>
        )
      }
      pied={pied}
    />
  );
}

export default function Commencer() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}
