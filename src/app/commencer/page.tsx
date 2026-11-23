"use client";
/*
 * Onboarding en 8 écrans. L'écran des offres s'affiche après la création du compte, avant le dépôt des clips.
 * Une action par écran, bouton principal en bas, barre de progression en haut, retour possible.
 * L'étape est dans l'adresse (?e=3) : le bouton retour du téléphone marche aussi.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { FormulaireCompte } from "@/components/compte/FormulaireCompte";
import { Paywall } from "@/components/app/Paywall";
import { CadreBureau } from "@/components/marque/CadreBureau";
import { Logo } from "@/components/marque/Logo";
import { Entete, Options } from "@/components/ui/Parcours";
import { Roulette } from "@/components/ui/Roulette";
import { MENTION_OBJECTIF, NON_AFFILIATION, ONBOARDING } from "@/lib/config";
import { aAcces, modifier, useEtat, type Profil } from "@/lib/etat";
import { rafraichir } from "@/lib/serveur";
import { nombre, videos, vuesLisibles } from "@/lib/format";
import { ecrireReponses, lireReponses, mettreEnAttente, plan, videosPourHeures, type Reponses } from "@/lib/onboarding";
import { bravo, cran, reveiller } from "@/lib/sons";
import { suivre } from "@/lib/suivi";

const ECRANS = ["accroche", "console", "tiktok", "objectif", "heures", "plan", "compte", "clips"] as const;
const TOTAL = ECRANS.length;

function premiereManquante(r: Reponses) {
  if (!r.plateforme) return 2;
  if (!r.tiktok) return 3;
  if (!r.objectif) return 4;
  if (!r.frequence) return 5;
  return null;
}

/** L'étiquette sous le montant choisi. */
function palier(objectif: number) {
  if (objectif < 250) return { texte: "Un premier palier", fond: "bg-turquoise" };
  if (objectif < 1000) return { texte: "Un vrai complément", fond: "bg-jaune" };
  if (objectif < 4000) return { texte: "Un deuxième salaire", fond: "bg-orange" };
  return { texte: "Le niveau des gros comptes", fond: "bg-rose" };
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const etat = useEtat();
  const n = Math.min(TOTAL, Math.max(1, Number(params.get("e")) || 1));
  const [r, setR] = useState<Reponses>({});
  const [pret, setPret] = useState(false);
  const galerie = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lu = lireReponses();
    setR(lu);
    setPret(true);
  }, []);

  useEffect(() => {
    if (!pret || !etat.charge) return;
    if (etat.compte && n < 7) return router.replace("/app/creer");
    if (etat.compte && n === 7) return router.replace("/commencer?e=8");
    if (!etat.compte && n === 8) return router.replace("/commencer?e=7");
    if (etat.compte) return;
    const manque = premiereManquante(lireReponses());
    if (manque && n > manque) router.replace(`/commencer?e=${manque}`);
  }, [pret, etat.charge, etat.compte, n, router]);

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

  /** Compte créé : les réponses vont dans le profil (serveur.ts), puis écran 8. */
  async function creerCompte() {
    await rafraichir();
    suivre("inscription", { methode: "email" });
    router.replace("/commencer?e=8");
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

  if (!pret) return <div className="min-h-dvh bg-fond" />;

  // Onboarding terminé : l'écran des offres, puis les clips une fois l'abonnement pris.
  if (n === 8 && etat.compte && !aAcces(etat)) return <Paywall ouvert moment="entree" apresPaiement={() => {}} />;

  const objectif = r.objectif ?? 0;
  const p = r.objectif && r.frequence ? plan(r.objectif, r.frequence) : null;

  let contenu: React.ReactNode = null;
  let action: { libelle: string; faire: () => void; actif: boolean } | null = null;
  let pied: React.ReactNode = null;

  switch (ECRANS[n - 1]) {
    case "accroche":
      contenu = (
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
          <h1 className="titre mt-7 text-[40px] lg:mt-0 lg:text-[52px]">Ta manette peut devenir un salaire.</h1>
          <p className="mt-3 text-[16px] leading-snug text-encre2">Tes clips GTA 6, montés pour TikTok en quelques minutes.</p>
        </>
      );
      action = { libelle: "Commencer", faire: suivant, actif: true };
      pied = (
        <>
          <p className="mt-3 text-center text-[13px] font-bold">Sans engagement. Résiliation en deux clics.</p>
          <p className="mt-2 text-center text-[11px] text-encre2">{NON_AFFILIATION}</p>
        </>
      );
      break;

    case "console":
      contenu = (
        <>
          <Titre sous="Le tutoriel s'adapte à ta console.">Tu joues sur quoi ?</Titre>
          <Options
            label="Ta console"
            options={[
              { valeur: "ps5", libelle: "PS5", indice: "PlayStation 5" },
              { valeur: "xbox", libelle: "Xbox", indice: "Series X ou S" },
            ]}
            valeur={r.plateforme}
            choisir={(v) => repondre({ plateforme: v as Profil["plateforme"] })}
          />
        </>
      );
      action = { libelle: "Continuer", faire: suivant, actif: !!r.plateforme };
      break;

    case "tiktok":
      contenu = (
        <>
          <Titre sous="Aucun souci si tu pars de zéro.">Tu as déjà une page TikTok ?</Titre>
          <Options
            label="Ta page TikTok"
            options={[
              { valeur: "abonnes", libelle: "Oui, avec des abonnés" },
              { valeur: "vide", libelle: "Oui, mais elle est vide" },
              { valeur: "non", libelle: "Non, pas encore" },
            ]}
            valeur={r.tiktok}
            choisir={(v) => repondre({ tiktok: v as Profil["tiktok"] })}
          />
        </>
      );
      action = { libelle: "Continuer", faire: suivant, actif: !!r.tiktok };
      break;

    case "objectif":
      contenu = (
        <>
          <Titre sous="Lance la roue et cale ton objectif.">Tu vises combien par mois ?</Titre>
          <div className="my-auto flex flex-col items-center pb-4 lg:my-0">
            <Grand cle={objectif}>{nombre(objectif)}&nbsp;€</Grand>
            <span className={`pastille mt-2.5 ${palier(objectif).fond}`}>{palier(objectif).texte}</span>
          </div>
          <Roulette
            label="Objectif par mois"
            valeurs={ONBOARDING.objectifs}
            valeur={objectif || ONBOARDING.objectifParDefaut}
            libelle={(v) => `${nombre(v)} €`}
            changer={(v) => repondre({ objectif: v })}
          />
        </>
      );
      action = { libelle: "Continuer", faire: suivant, actif: !!r.objectif };
      break;

    case "heures": {
      const heures = r.heures ?? ONBOARDING.heuresParDefaut;
      const parSemaine = r.frequence ?? videosPourHeures(heures);
      contenu = (
        <>
          <Titre sous="Plus tu joues, plus tu as de quoi poster.">Tu joues combien d&apos;heures par semaine ?</Titre>
          <div className="my-auto flex items-center justify-between gap-4 pb-4 lg:my-0">
            <div>
              <Grand cle={heures}>{heures}&nbsp;h</Grand>
              <p className="mt-2.5 text-[15px] font-bold leading-tight">
                {videos(parSemaine)}
                <span className="block text-[13px] font-normal text-encre2">par semaine</span>
              </p>
            </div>
            <Semaine n={parSemaine} />
          </div>
          <Roulette
            label="Heures de jeu par semaine"
            valeurs={ONBOARDING.heures}
            valeur={heures}
            libelle={(v) => `${v} h`}
            changer={(v) => repondre({ heures: v, frequence: videosPourHeures(v) })}
          />
        </>
      );
      action = { libelle: "Voir mon plan", faire: suivant, actif: !!r.frequence };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">Notre repère : une vidéo par heure de jeu. Trois par jour maximum.</p>;
      break;
    }

    case "plan":
      if (p && r.frequence) {
        contenu = (
          <>
            <span className="pastille w-fit bg-turquoise">Ton plan</span>
            <h1 className="titre mt-3 text-[28px]">
              Tu vises {nombre(objectif)}&nbsp;€. On te fixe la barre à <Compteur de={objectif} vers={p.booste} />&nbsp;€.
            </h1>
            <p className="mt-2 text-[14px] leading-snug text-encre2">On vise 6 % plus haut pour que tu passes ton objectif, pas juste que tu l&apos;approches.</p>

            <div className="carte-forte mt-5 bg-jaune p-4">
              <p className="text-[13px] font-bold">Vues à faire par mois</p>
              <p className="titre mt-1.5 text-[26px]">
                {vuesLisibles(p.vuesMin)} à {vuesLisibles(p.vuesMax)}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="carte p-3.5">
                <p className="text-[12px] font-bold">Ton rythme</p>
                <p className="titre mt-1 text-[20px]">{videos(r.frequence)}</p>
                <p className="text-[12px] text-encre2">par semaine</p>
              </div>
              <div className="carte p-3.5">
                <p className="text-[12px] font-bold">À viser par vidéo</p>
                <p className="titre mt-1 text-[20px]">
                  {vuesLisibles(p.vuesParVideoMin)} à {vuesLisibles(p.vuesParVideoMax)}
                </p>
                <p className="text-[12px] text-encre2">vues</p>
              </div>
            </div>

          </>
        );
      }
      action = { libelle: "Créer mon compte", faire: suivant, actif: !!p };
      pied = <p className="mt-3 text-center text-[11px] text-encre2">{MENTION_OBJECTIF}</p>;
      break;

    case "compte":
      contenu = (
        <div className="flex flex-1 flex-col">
          <Titre sous="Pour garder ton plan et tes vidéos.">Crée ton compte.</Titre>
          <FormulaireCompte mode="inscription" retour="/commencer?e=8" valider={creerCompte} />
        </div>
      );
      break;

    case "clips":
      contenu = (
        <>
          <Titre sous="Des captures de ta console, déjà dans ta galerie.">Tu as déjà des clips dans ton téléphone ?</Titre>
          <input ref={galerie} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => aDesClips(e.target.files)} />
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => galerie.current?.click()} className="option min-h-[72px]">
              <span>
                <span className="titre block text-[18px] font-bold tracking-[-0.01em]">Oui, je les dépose</span>
                <span className="mt-0.5 block text-[13px] text-encre2">Ta galerie s&apos;ouvre tout de suite.</span>
              </span>
              <Fleche />
            </button>
            <button type="button" onClick={pasDeClips} className="option min-h-[72px]">
              <span>
                <span className="titre block text-[18px] font-bold tracking-[-0.01em]">Non, montre-moi comment</span>
                <span className="mt-0.5 block text-[13px] text-encre2">3 étapes, sur ta console puis ton téléphone.</span>
              </span>
              <Fleche />
            </button>
          </div>
        </>
      );
      break;
  }

  return (
    <CadreBureau accroche={n !== 1}>
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] lg:min-h-0 lg:w-full lg:max-w-[480px] lg:p-0">
      {n === 1 ? (
        <span className="lg:hidden">
          <Logo taille={30} />
        </span>
      ) : (
        <Entete n={n} total={TOTAL} retour={n < 8 ? retour : undefined} />
      )}

      <div key={n} className="entree mt-6 flex flex-1 flex-col">
        {contenu}
      </div>

      {action && (
        <div className="pt-6 lg:pt-10">
          <button type="button" onClick={action.faire} disabled={!action.actif} className="bouton bouton-rose w-full">
            {action.libelle}
          </button>
          {pied}
        </div>
      )}
    </main>
    </CadreBureau>
  );
}

function Titre({ children, sous }: { children: React.ReactNode; sous?: string }) {
  return (
    <div className="mb-5">
      <h1 className="titre text-[30px] lg:text-[40px]">{children}</h1>
      {sous && <p className="mt-2 text-[14px] text-encre2">{sous}</p>}
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
    <p ref={ref} className="titre whitespace-nowrap text-[64px] tabular-nums [@media(min-height:780px)]:text-[min(84px,21vw)]" aria-live="off">
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
    <div className="grid grid-cols-7 gap-1" aria-hidden="true">
      {[2, 1, 0].map((rang) =>
        Array.from({ length: 7 }, (_, jour) => (
          <span
            key={`${rang}-${jour}`}
            className={`h-[31px] w-[19px] rounded-[5px] border-2 transition-[transform,background-color,border-color] duration-200 lg:h-[36px] lg:w-[22px] ${
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
function Compteur({ de, vers }: { de: number; vers: number }) {
  const [v, setV] = useState(de);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(vers);
      return;
    }
    const duree = 1100;
    const t0 = performance.now() + 500;
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
  }, [de, vers]);
  return <span className="tabular-nums">{nombre(v)}</span>;
}

function Fleche() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
