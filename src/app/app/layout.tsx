"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/marque/Logo";
import { afficherToast, Toasts } from "@/components/ui/Toast";
import { modifier, useEtat } from "@/lib/etat";
import { quota, statutDe, useMaintenant } from "@/lib/montage";

const ONGLETS = [
  {
    href: "/app/creer",
    nom: "Créer",
    icone: <path d="M12 6v12M6 12h12M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z" />,
  },
  {
    href: "/app/videos",
    nom: "Mes vidéos",
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
    afficherToast("Tes clips t'attendent. Dépose-les maintenant.", { href: "/app/creer", libelle: "Déposer" });
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

  useEffect(() => {
    if (etat.charge && !etat.compte) router.replace("/inscription");
  }, [etat.charge, etat.compte, router]);

  if (!etat.charge || !etat.compte) return <div className="min-h-dvh bg-fond" />;

  const q = quota(etat);
  const estActif = (href: string) => chemin.startsWith(href) || (href === "/app/videos" && chemin.startsWith("/app/video/"));
  const libelleQuota = `${q.restant} vidéo${q.restant > 1 ? "s" : ""} restante${q.restant > 1 ? "s" : ""}`;

  return (
    <>
      {/* Ordinateur : barre latérale à la place des onglets du bas */}
      {!tuto && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r-2 border-encre bg-blanc px-5 pb-6 pt-7 lg:flex" aria-label="Navigation">
          <Link href="/app/creer" className="flex min-h-11 items-center px-2" aria-label="XPclip, créer une vidéo">
            <Logo taille={34} />
          </Link>
          <nav className="mt-10" aria-label="Onglets">
            <ul className="flex flex-col gap-1.5">
              {ONGLETS.map((o) => {
                const actif = estActif(o.href);
                return (
                  <li key={o.href}>
                    <Link
                      href={o.href}
                      aria-current={actif ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-[14px] border-2 px-3 text-[16px] font-bold transition-colors ${actif ? "border-encre bg-jaune shadow-[0_3px_0_var(--color-encre)]" : "border-transparent text-encre2 hover:bg-fond hover:text-encre"}`}
                    >
                      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {o.icone}
                      </svg>
                      {o.nom}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-auto">
            <Link href="/app/compte" className="carte block bg-fond p-4 hover:bg-beige/60">
              <span className="block text-[13px] font-bold text-encre2">Ce mois-ci</span>
              <span className="titre mt-1 block text-[22px] tabular-nums">{libelleQuota}</span>
              <span className="barre mt-3 block h-3" aria-hidden="true">
                <span style={{ width: `${q.total ? Math.max(4, (q.restant / q.total) * 100) : 0}%` }} />
              </span>
            </Link>
          </div>
        </aside>
      )}

    <div className={`mx-auto flex min-h-dvh max-w-[480px] flex-col ${tuto ? "lg:max-w-none" : "lg:ml-[264px] lg:max-w-none"}`}>
      {!tuto && (
        <header className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] lg:hidden">
          <Link href="/app/creer" className="flex min-h-11 items-center" aria-label="XPclip, créer une vidéo">
            <Logo taille={30} />
          </Link>
          <Link href="/app/compte" className="pastille bg-blanc text-[12px] tabular-nums" aria-label={`${libelleQuota} sur ${q.total}`}>
            {libelleQuota}
          </Link>
        </header>
      )}

      <main className={`flex-1 px-4 ${tuto ? "lg:px-0" : "pb-36 pt-5 lg:px-12 lg:pb-16 lg:pt-14"}`}>
        <div className={tuto ? "" : "lg:mx-auto lg:max-w-[1040px]"}>{children}</div>
      </main>

      {!tuto && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-encre bg-blanc pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden" aria-label="Onglets">
          <ul className="mx-auto grid max-w-[480px] grid-cols-3">
            {ONGLETS.map((o) => {
              const actif = estActif(o.href);
              return (
                <li key={o.href}>
                  <Link href={o.href} aria-current={actif ? "page" : undefined} className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-bold">
                    <span className={`grid h-7 w-12 place-items-center rounded-full border-2 ${actif ? "border-encre bg-jaune" : "border-transparent"}`}>
                      <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {o.icone}
                      </svg>
                    </span>
                    <span className={actif ? "" : "text-encre2"}>{o.nom}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <Notifier />
      <Toasts />
    </div>
    </>
  );
}
