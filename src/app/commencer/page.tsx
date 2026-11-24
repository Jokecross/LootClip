"use client";
/*
 * Onboarding en 10 écrans. L'écran des offres s'affiche après les comptes à relier, avant le dépôt des clips.
 * Une action par écran, bouton principal en bas, barre de progression en haut, retour possible.
 * L'étape est dans l'adresse (?e=3) : le bouton retour du téléphone marche aussi.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ecranConsole, ecranHeures, ecranObjectif, ecranPlan, ecranPrincipe, ecranTiktok, MENTION_PRINCIPE, REPERE_HEURES } from "@/components/onboarding/Ecrans";
import { PanneauHero } from "@/components/onboarding/PanneauHero";
import { Reseaux } from "@/components/onboarding/Reseaux";
import { FormulaireCompte } from "@/components/compte/FormulaireCompte";
import { Paywall } from "@/components/app/Paywall";
import { Logo } from "@/components/marque/Logo";
import { Duo, Titre } from "@/components/ui/Duo";
import { Entete } from "@/components/ui/Parcours";
import { MENTION_OBJECTIF, NON_AFFILIATION, ONBOARDING } from "@/lib/config";
import { aAcces, modifier, sansOnboarding, useEtat } from "@/lib/etat";
import { rafraichir } from "@/lib/serveur";
import { ecrireReponses, effacerReponses, lireReponses, mettreEnAttente, videosPourHeures, type Reponses } from "@/lib/onboarding";
import { reveiller } from "@/lib/sons";
import { suivre } from "@/lib/suivi";

const ECRANS = ["accroche", "principe", "console", "tiktok", "objectif", "heures", "plan", "compte", "reseaux", "clips"] as const;
const TOTAL = ECRANS.length;
const COMPTE = ECRANS.indexOf("compte") + 1;
const RESEAUX = ECRANS.indexOf("reseaux") + 1;
const CLIPS = ECRANS.indexOf("clips") + 1;

function premiereManquante(r: Reponses) {
  if (!r.plateforme) return ECRANS.indexOf("console") + 1;
  if (!r.tiktok) return ECRANS.indexOf("tiktok") + 1;
  if (!r.objectif) return ECRANS.indexOf("objectif") + 1;
  if (!r.frequence) return ECRANS.indexOf("heures") + 1;
  return null;
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const etat = useEtat();
  const n = Math.min(TOTAL, Math.max(1, Number(params.get("e")) || 1));
  const [r, setR] = useState<Reponses>({});
  const [pret, setPret] = useState(false);
  const galerie = useRef<HTMLInputElement>(null);
  const aRepondre = sansOnboarding(etat);

  useEffect(() => {
    const lu = lireReponses();
    setR(lu);
    setPret(true);
  }, []);

  useEffect(() => {
    if (!pret || !etat.charge) return;
    if (etat.compte && !aRepondre) {
      if (n < COMPTE) router.replace("/app/creer");
      if (n === COMPTE) router.replace(`/commencer?e=${RESEAUX}`);
      return;
    }
    const lu = lireReponses();
    const manque = premiereManquante(lu);
    if (manque && n > manque) return router.replace(`/commencer?e=${manque}`);
    if (!etat.compte && n > COMPTE) return router.replace(`/commencer?e=${COMPTE}`);
    // Déjà connecté (Google) : pas de compte à créer, les réponses vont dans le profil, puis les offres.
    if (etat.compte && n >= COMPTE) {
      const profil = { plateforme: lu.plateforme!, objectif: lu.objectif!, tiktok: lu.tiktok!, frequence: lu.frequence! };
      modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, plateforme: profil.plateforme, profil } : e.compte }));
      effacerReponses();
    }
  }, [pret, etat.charge, etat.compte, aRepondre, n, router]);

  useEffect(() => {
    const ecran = ECRANS[n - 1];
    const lu = lireReponses();
    suivre("onboarding_ecran", { numero: n, ecran, ...(ecran === "plan" ? { objectif: lu.objectif ?? 0, heures: lu.heures ?? 0 } : {}) });
  }, [n]);

  // Les roues partent d'une valeur : elle compte comme réponse si le joueur n'y touche pas.
  useEffect(() => {
    if (!pret) return;
    const lu = lireReponses();
    if (ECRANS[n - 1] === "objectif" && !lu.objectif) repondre({ objectif: ONBOARDING.objectifParDefaut });
    if (ECRANS[n - 1] === "heures" && !lu.heures) repondre({ heures: ONBOARDING.heuresParDefaut, frequence: videosPourHeures(ONBOARDING.heuresParDefaut) });
  }, [n, pret]);

  // Le son n'est permis qu'après un toucher : on le réveille dès le premier bouton.
  useEffect(() => {
    const go = () => reveiller();
    window.addEventListener("click", go);
    return () => window.removeEventListener("click", go);
  }, []);

  const repondre = (x: Reponses) => {
    ecrireReponses(x);
    setR((v) => ({ ...v, ...x }));
  };
  const suivant = () => router.push(`/commencer?e=${n + 1}`);
  const retour = () => (window.history.length > 1 ? router.back() : router.replace(n > 1 ? `/commencer?e=${n - 1}` : "/"));

  /** Compte créé : les réponses vont dans le profil (serveur.ts), puis les offres. */
  async function creerCompte() {
    await rafraichir();
    suivre("inscription", { methode: "email" });
    router.replace(`/commencer?e=${RESEAUX}`);
  }

  function aDesClips(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    mettreEnAttente(fichiers);
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, tutoVu: true } : e.compte }));
    router.push("/app/creer");
  }

  async function pasDeClips() {
    // Rappel le lendemain si rien n'est déposé. On demande la permission maintenant, au toucher.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, rappelLe: new Date(Date.now() + 86_400_000).toISOString(), rappelFait: false } : e.compte }));
    router.push("/app/demarrage");
  }

  if (!pret || (n === RESEAUX && !etat.compte) || (etat.compte && (n === COMPTE || (n > COMPTE && aRepondre)))) return <div className="min-h-dvh bg-fond" />;

  if (n === RESEAUX) return <Reseaux n={n} total={TOTAL} ici={`/commencer?e=${RESEAUX}`} passer={() => router.replace(`/commencer?e=${CLIPS}`)} />;

  // Onboarding terminé : l'écran des offres, puis les clips une fois l'abonnement pris.
  if (n === CLIPS && etat.compte && !aAcces(etat)) return <Paywall ouvert moment="entree" apresPaiement={() => {}} />;

  const objectif = r.objectif ?? 0;

  let contenu: { gauche: React.ReactNode; droite: React.ReactNode; fond?: string } = { gauche: null, droite: null };
  let action: { libelle: string; faire: () => void; actif: boolean } | null = null;
  let pied: React.ReactNode = null;

  switch (ECRANS[n - 1]) {
    case "accroche":
      contenu = {
        gauche: (
          <>
            {/* Même image que le hero de l'accueil (public/visuels/hero-*.jpg) */}
            <div className="carte-forte overflow-hidden lg:hidden">
              <img
                src="/visuels/hero-900.jpg"
                srcSet="/visuels/hero-900.jpg 900w, /visuels/hero-1672.jpg 1672w"
                sizes="(min-width: 640px) 480px, 100vw"
                width={1672}
                height={941}
                alt="Coucher de soleil néon sur une ville côtière, avec le logo XP et sa barre d'expérience"
                fetchPriority="high"
                className="block h-auto w-full"
              />
            </div>
            <h1 className="titre mt-7 text-[40px] lg:mt-0 lg:text-[clamp(52px,5.6vw,104px)]">Tes parties de GTA 6 peuvent te payer.</h1>
            <p className="mt-3 text-[16px] leading-snug text-encre2 lg:mt-7 lg:max-w-[28ch] lg:text-[clamp(20px,1.7vw,30px)]">Tu joues sur ta console. XPclip monte tes propres clips. Tu postes.</p>
          </>
        ),
        droite: <PanneauHero />,
        fond: "lg:bg-nuit2",
      };
      action = { libelle: "Commencer", faire: suivant, actif: true };
      pied = (
        <>
          <p className="mt-3 text-center text-[13px] font-bold">Sans engagement. Résiliation en deux clics.</p>
          <p className="mt-2 text-center text-[11px] text-encre2">{NON_AFFILIATION}</p>
        </>
      );
      break;

    case "principe":
      contenu = ecranPrincipe();
      action = { libelle: "C'est parti", faire: suivant, actif: true };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{MENTION_PRINCIPE}</p>;
      break;

    case "console":
      contenu = ecranConsole({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.plateforme };
      break;

    case "tiktok":
      contenu = ecranTiktok({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.tiktok };
      break;

    case "objectif":
      contenu = ecranObjectif({ r, repondre });
      action = { libelle: "Continuer", faire: suivant, actif: !!r.objectif };
      break;

    case "heures":
      contenu = ecranHeures({ r, repondre });
      action = { libelle: "Voir mon plan", faire: suivant, actif: !!r.frequence };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{REPERE_HEURES}</p>;
      break;

    case "plan":
      if (objectif && r.frequence) contenu = ecranPlan({ objectif, frequence: r.frequence });
      action = { libelle: etat.compte ? "Continuer" : "Créer mon compte", faire: suivant, actif: !!objectif && !!r.frequence };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{MENTION_OBJECTIF}</p>;
      break;

    case "compte":
      contenu = {
        gauche: <Titre sous="Pour garder ton plan et tes vidéos.">Crée ton compte.</Titre>,
        droite: (
          <div className="flex flex-1 flex-col lg:m-auto lg:w-full lg:max-w-[560px] lg:flex-none lg:rounded-3xl lg:border-2 lg:border-encre lg:bg-fond lg:p-10 lg:shadow-[0_6px_0_var(--color-encre)]">
            <FormulaireCompte mode="inscription" retour={`/commencer?e=${RESEAUX}`} valider={creerCompte} />
          </div>
        ),
        fond: "lg:bg-rose",
      };
      break;

    case "clips":
      contenu = {
        gauche: <Titre sous="Des captures de ta console, déjà dans ta galerie.">Tu as déjà des clips dans ton téléphone ?</Titre>,
        droite: (
          <>
          <input ref={galerie} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => aDesClips(e.target.files)} />
          <div className="flex flex-col gap-3 lg:flex-1 lg:gap-6">
            <button type="button" onClick={() => galerie.current?.click()} className="option min-h-[72px] lg:flex-1 lg:rounded-3xl lg:px-10 lg:shadow-[0_6px_0_var(--color-encre)] lg:hover:-translate-y-1">
              <span>
                <span className="titre block text-[18px] font-bold tracking-[-0.01em] lg:text-[clamp(28px,2.6vw,48px)] lg:font-extrabold lg:tracking-[-0.03em]">Oui, je les dépose</span>
                <span className="mt-0.5 block text-[13px] text-encre2 lg:mt-3 lg:text-[18px]">Ta galerie s&apos;ouvre tout de suite.</span>
              </span>
              <Fleche />
            </button>
            <button type="button" onClick={pasDeClips} className="option min-h-[72px] lg:flex-1 lg:rounded-3xl lg:px-10 lg:shadow-[0_6px_0_var(--color-encre)] lg:hover:-translate-y-1">
              <span>
                <span className="titre block text-[18px] font-bold tracking-[-0.01em] lg:text-[clamp(28px,2.6vw,48px)] lg:font-extrabold lg:tracking-[-0.03em]">Non, montre-moi comment</span>
                <span className="mt-0.5 block text-[13px] text-encre2 lg:mt-3 lg:text-[18px]">3 étapes, sur ta console puis ton téléphone.</span>
              </span>
              <Fleche />
            </button>
          </div>
          </>
        ),
        fond: "lg:bg-turquoise",
      };
      break;
  }

  return (
    <Duo
      cle={n}
      marque={n !== 1}
      entete={n === 1 ? <Logo taille={30} /> : <Entete n={n} total={TOTAL} retour={n <= COMPTE && !(etat.compte && n === 2) ? retour : undefined} />}
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

function Fleche() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 lg:h-9 lg:w-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Commencer() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}
