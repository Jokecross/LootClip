"use client";

import "@/app/accueil.css";
import "@/components/ui/parcours.css";
import "./appli.css";
import "./outil.css";
import "./tableau.css";
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

/** Les pages de l'appli. « Créer » est le gros bouton (en haut du menu sur ordinateur, au centre sur téléphone). */
const ONGLETS = [
  { href: "/app", nom: "Accueil", icone: <path d="M3 10.500L12 3l9 7.500V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /> },
  { href: "/app/videos", nom: "Mes clips", icone: <path d="M8 3h8a3 3 0 013 3v12a3 3 0 01-3 3H8a3 3 0 01-3-3V6a3 3 0 013-3zm2 6v6l5-3z" /> },
  { href: "/app/calendrier", nom: "Calendrier", icone: <path d="M7 3v4M17 3v4M4 10h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" /> },
  { href: "/app/comptes", nom: "Réseaux", icone: <path d="M8.600 13.300l6.800 3.900M15.400 6.800l-6.800 3.900M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zm12 7a3 3 0 100-6 3 3 0 000 6z" /> },
  { href: "/app/compte", nom: "Compte", icone: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" /> },
];
const ICONE_CREER = <path d="M12 5v14M5 12h14" />;

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

  const libelleQuota = `${q.restant} vidéo${q.restant > 1 ? "s" : ""} restante${q.restant > 1 ? "s" : ""}`;
  const estActif = (href: string) =>
    href === "/app" ? chemin === "/app" : href === "/app/compte" ? chemin === href || chemin.startsWith(`${href}/`) : chemin.startsWith(href) || (href === "/app/videos" && chemin.startsWith("/app/video/"));
  const heures = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}` : `${Math.floor(sec / 60)} min`);

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

  const creerActif = chemin.startsWith("/app/creer");
  const [accueil, clips, calendrier, reseaux, compteOnglet] = ONGLETS.map((o) => ({ ...o, actif: estActif(o.href), dessin: <Icone>{o.icone}</Icone> }));
  const lien = (o: typeof accueil, classe: string) => (
    <Link key={o.href} href={o.href} aria-current={o.actif ? "page" : undefined} className={classe}>
      {o.dessin}
      <span>{o.nom}</span>
    </Link>
  );
  return (
    <div className="appli v4 ap ap-coque">
      {/* Ordinateur : le menu à gauche */}
      <aside className="ap-menu" aria-label="Menu">
        <Link href="/app" className="ap-logo">
          <LogoIcone taille={36} className="rounded-[24%] ring-2 ring-encre" />
          <span className="titre text-[22px]">XPclip</span>
        </Link>
        <Link href="/app/creer" className="bouton bouton-rose ap-menu-creer" aria-current={creerActif ? "page" : undefined}>
          <Icone>{ICONE_CREER}</Icone>
          Nouveaux clips
        </Link>
        <nav aria-label="Navigation">{[accueil, clips, calendrier, reseaux, compteOnglet].map((o) => lien(o, "ap-menu-lien"))}</nav>
        {acces && q.total > 0 && (
          <Link href="/app/compte" className="ap-menu-quota" aria-label={`${libelleQuota} sur ${q.total}`}>
            <span className="ap-menu-quota-ligne">
              <b>Vidéos du mois</b>
              <span className="tabular-nums">
                {q.restant}/{q.total}
              </span>
            </span>
            <span className="ap-mini-jauge" aria-hidden="true">
              <span style={{ transform: `scaleX(${q.total ? q.restant / q.total : 0})` }} />
            </span>
            {q.secondesTotal ? (
              <>
                <span className="ap-menu-quota-ligne mt-3">
                  <b>Heures restantes</b>
                  <span className="tabular-nums">{heures(Math.max(0, q.secondesTotal - (q.secondes ?? 0)))}</span>
                </span>
                <span className="ap-mini-jauge" aria-hidden="true">
                  <span style={{ transform: `scaleX(${Math.max(0, 1 - (q.secondes ?? 0) / q.secondesTotal)})` }} />
                </span>
              </>
            ) : null}
          </Link>
        )}
      </aside>

      {/* Téléphone : la barre du haut */}
      <header className="ap-barre">
        <div className="ap-barre-in">
          <Link href="/app" className="ap-logo" aria-label="XPclip, accueil">
            <LogoIcone taille={34} className="rounded-[24%] ring-2 ring-encre" />
            <span className="titre text-[20px]">XPclip</span>
          </Link>
          {acces && q.total > 0 && (
            <Link href="/app/compte" className="ap-quota tabular-nums" aria-label={`${libelleQuota} sur ${q.total}`}>
              <i style={{ "--q": q.total ? q.restant / q.total : 0 } as React.CSSProperties} aria-hidden="true" />
              {q.restant} vidéo{q.restant > 1 ? "s" : ""}
            </Link>
          )}
          <Link href="/app/compte" aria-current={compteOnglet.actif ? "page" : undefined} className="ap-barre-compte" aria-label="Mon compte">
            {compteOnglet.dessin}
          </Link>
        </div>
      </header>

      <main className="ap-page">{children}</main>

      {/* Téléphone : les onglets du bas, « Créer » au centre */}
      <nav className="ap-onglets" aria-label="Onglets">
        <ul>
          <li>{lien(accueil, "")}</li>
          <li>{lien(clips, "")}</li>
          <li>
            <Link href="/app/creer" aria-current={creerActif ? "page" : undefined} className="ap-onglet-creer" aria-label="Créer des clips">
              <span>
                <Icone>{ICONE_CREER}</Icone>
              </span>
              Créer
            </Link>
          </li>
          <li>{lien(calendrier, "")}</li>
          <li>{lien(reseaux, "")}</li>
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
