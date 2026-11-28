"use client";

import "@/app/accueil.css";
import "@/components/ui/parcours.css";
import "./appli.css";
import "./outil.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoIcone } from "@/components/marque/Logo";
import { useTeinte } from "@/components/ui/teinte";
import { afficherToast, Toasts } from "@/components/ui/Toast";
import { Paywall } from "@/components/app/Paywall";
import { aAcces, modifier, sansOnboarding, useEtat } from "@/lib/etat";
import { statutDe, surveillerMontages, useMaintenant } from "@/lib/montage";
import { useQuotaVideos } from "@/lib/quota-videos";

const ONGLETS = [
  {
    href: "/app/creer",
    nom: "Créer",
    icone: <path d="M12 6v12M6 12h12M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z" />,
  },
  {
    href: "/app/videos",
    nom: "Mes clips",
    icone: <path d="M8 3h8a3 3 0 013 3v12a3 3 0 01-3 3H8a3 3 0 01-3-3V6a3 3 0 013-3zm2 6v6l5-3z" />,
  },
  {
    href: "/app/compte",
    nom: "Compte",
    icone: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" />,
  },
];

/** Prévient quand un montage se termine : message dans l'appli, et notification si l'appli est en fond. */
function Notifier() {
  const etat = useEtat();
  const t = useMaintenant(1000);
  useEffect(() => surveillerMontages(), []);
  useEffect(() => {
    const prets = etat.videos.filter((v) => !v.notifiee && statutDe(v, t).statut === "termine");
    if (!prets.length) return;
    modifier((e) => ({ ...e, videos: e.videos.map((v) => (prets.some((p) => p.id === v.id) ? { ...v, notifiee: true } : v)) }));
    const v = prets[0];
    afficherToast("Ta vidéo est prête.", { href: `/app/video/${v.id}`, libelle: "Voir" });
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification("XPclip", { body: "Ta vidéo est prête. Viens la poster.", icon: "/icones/icone-192.png" });
    }
  }, [etat.videos, t]);

  // Rappel du lendemain si aucun clip n'a été déposé (avec le serveur : tâche planifiée + notification push).
  const compte = etat.compte;
  useEffect(() => {
    if (!compte?.rappelLe || compte.rappelFait || etat.videos.length) return;
    if (t < new Date(compte.rappelLe).getTime()) return;
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, rappelFait: true } : e.compte }));
    afficherToast("Colle le lien de ta vidéo, on fait tes clips.", { href: "/app/creer", libelle: "Créer" });
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("XPclip", { body: "Tes clips t'attendent. Dépose-les maintenant.", icon: "/icones/icone-192.png" });
    }
  }, [compte, etat.videos.length, t]);
  return null;
}

export default function CoquilleAppli({ children }: { children: React.ReactNode }) {
  const etat = useEtat();
  const router = useRouter();
  const chemin = usePathname();
  const tuto = chemin.startsWith("/app/demarrage");
  // Hook : avant tout retour anticipé (sinon React plante au passage « chargement » → « prête »).
  const q = useQuotaVideos(etat);

  useEffect(() => {
    if (etat.charge && !etat.compte) router.replace("/inscription");
  }, [etat.charge, etat.compte, router]);

  // Nouveau compte sans réponses : l'onboarding d'abord, les offres ensuite.
  const aFaire = !chemin.startsWith("/app/compte") && !chemin.startsWith("/app/merci") && sansOnboarding(etat);
  useEffect(() => {
    if (etat.charge && aFaire) router.replace("/commencer?e=activite");
  }, [etat.charge, aFaire, router]);

  // Réservé aux abonnés. Restent ouverts : le compte, le retour de paiement, et les vidéos d'un ancien abonné.
  const libre = chemin.startsWith("/app/compte") || chemin.startsWith("/app/merci") || (etat.videos.length > 0 && chemin.startsWith("/app/video"));
  const acces = aAcces(etat);
  const pret = etat.charge && !!etat.compte && !aFaire;
  useTeinte(!pret || tuto || (!acces && !libre) ? null : "");

  if (!pret) return <div className="min-h-dvh bg-fond" />;
  if (!acces && !libre) return <Paywall ouvert moment="entree" apresPaiement={() => {}} />;

  const estActif = (href: string) => chemin.startsWith(href) || (href === "/app/videos" && chemin.startsWith("/app/video/"));
  const libelleQuota = `${q.restant} vidéo${q.restant > 1 ? "s" : ""} restante${q.restant > 1 ? "s" : ""}`;

  const suivi = (
    <>
      <Notifier />
      <Toasts />
    </>
  );
  // Le tutoriel prend tout l'écran.
  if (tuto)
    return (
      <>
        {children}
        {suivi}
      </>
    );

  const onglets = ONGLETS.map((o) => ({ ...o, actif: estActif(o.href), dessin: <Icone>{o.icone}</Icone> }));
  return (
    <div className="appli v4 ap">
      <header className="ap-barre">
        <div className="ap-barre-in">
          <Link href="/app/creer" className="ap-logo" aria-label="XPclip, créer des clips">
            <LogoIcone taille={34} className="rounded-[24%] ring-2 ring-encre" />
            <span className="titre text-[20px]">XPclip</span>
          </Link>
          <nav className="ap-onglets-haut" aria-label="Navigation">
            {onglets.map((o) => (
              <Link key={o.href} href={o.href} aria-current={o.actif ? "page" : undefined} className="ap-onglet">
                {o.dessin}
                {o.nom}
              </Link>
            ))}
          </nav>
          {acces && (
            <Link href="/app/compte" className="ap-quota tabular-nums" aria-label={`${libelleQuota} sur ${q.total}`}>
              <i style={{ "--q": q.total ? q.restant / q.total : 0 } as React.CSSProperties} aria-hidden="true" />
              {libelleQuota}
            </Link>
          )}
        </div>
      </header>

      <main className="ap-page">{children}</main>

      <nav className="ap-onglets lg:hidden" aria-label="Onglets">
        <ul>
          {onglets.map((o) => (
            <li key={o.href}>
              <Link href={o.href} aria-current={o.actif ? "page" : undefined}>
                {o.dessin}
                {o.nom}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {suivi}
    </div>
  );
}

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
