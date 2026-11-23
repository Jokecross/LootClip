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
import { MENTION_OBJECTIF, NON_AFFILIATION, ONBOARDING } from "@/lib/config";
import { aAcces, modifier, useEtat, type Profil } from "@/lib/etat";
import { rafraichir } from "@/lib/serveur";
import { nombre, vuesLisibles } from "@/lib/format";
import { ecrireReponses, lireReponses, mettreEnAttente, plan, type Reponses } from "@/lib/onboarding";
import { suivre } from "@/lib/suivi";

const ECRANS = ["accroche", "console", "objectif", "tiktok", "frequence", "plan", "compte", "clips"] as const;
const TOTAL = ECRANS.length;

function premiereManquante(r: Reponses) {
  if (!r.plateforme) return 2;
  if (!r.objectif) return 3;
  if (!r.tiktok) return 4;
  if (!r.frequence) return 5;
  return null;
}

const INDICES_OBJECTIF: Record<number, string> = { 100: "Un premier palier", 500: "Un vrai complément", 1000: "Un deuxième salaire", 5000: "Le niveau des gros comptes" };

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const etat = useEtat();
  const n = Math.min(TOTAL, Math.max(1, Number(params.get("e")) || 1));
  const [r, setR] = useState<Reponses>({});
  const [libre, setLibre] = useState("");
  const [pret, setPret] = useState(false);
  const galerie = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lu = lireReponses();
    setR(lu);
    if (lu.objectif && !ONBOARDING.objectifs.includes(lu.objectif)) setLibre(String(lu.objectif));
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
    suivre("onboarding_ecran", { numero: n, ecran: ECRANS[n - 1] });
  }, [n]);

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
  const libreNombre = Number(libre);
  const libreValide = libreNombre >= ONBOARDING.objectifMin && libreNombre <= ONBOARDING.objectifMax;

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

    case "objectif":
      contenu = (
        <>
          <Titre sous="On construit ton plan à partir de ta réponse.">Tu vises combien par mois ?</Titre>
          <Options
            label="Objectif par mois"
            options={ONBOARDING.objectifs.map((o) => ({ valeur: String(o), libelle: `${nombre(o)} €`, indice: INDICES_OBJECTIF[o] }))}
            valeur={!libre && objectif ? String(objectif) : undefined}
            choisir={(v) => {
              setLibre("");
              repondre({ objectif: Number(v) });
            }}
          />
          <label htmlFor="libre" className="mt-6 block text-[14px] font-bold">
            Un autre montant
          </label>
          <input
            id="libre"
            inputMode="numeric"
            placeholder="Par exemple 250 €"
            className="champ mt-2"
            value={libre}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
              setLibre(v);
              const x = Number(v);
              repondre({ objectif: v && x >= ONBOARDING.objectifMin && x <= ONBOARDING.objectifMax ? x : 0 });
            }}
          />
          {libre && !libreValide && (
            <p className="mt-2 text-[13px] font-bold">
              Entre {ONBOARDING.objectifMin} € et {nombre(ONBOARDING.objectifMax)} €.
            </p>
          )}
        </>
      );
      action = { libelle: "Continuer", faire: suivant, actif: !!r.objectif };
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

    case "frequence":
      contenu = (
        <>
          <Titre sous="Sois réaliste. La régularité compte plus que tout.">Tu peux poster combien de fois par semaine ?</Titre>
          <Options
            label="Vidéos par semaine"
            options={[
              { valeur: "3", libelle: "3 fois", indice: "Un jour sur deux" },
              { valeur: "7", libelle: "7 fois", indice: "Une par jour" },
              { valeur: "14", libelle: "14 fois", indice: "Deux par jour" },
            ]}
            valeur={r.frequence ? String(r.frequence) : undefined}
            choisir={(v) => repondre({ frequence: Number(v) })}
          />
        </>
      );
      action = { libelle: "Voir mon plan", faire: suivant, actif: !!r.frequence };
      break;

    case "plan":
      if (p && r.frequence) {
        contenu = (
          <>
            <span className="pastille w-fit bg-turquoise">Ton plan</span>
            <h1 className="titre mt-3 text-[28px]">
              Tu vises {nombre(objectif)}&nbsp;€. On te fixe la barre à {nombre(p.booste)}&nbsp;€.
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
                <p className="titre mt-1 text-[20px]">{r.frequence} vidéos</p>
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
