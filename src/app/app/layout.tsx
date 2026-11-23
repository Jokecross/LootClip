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

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      {!tuto && (
        <header className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <Link href="/app/creer" className="flex min-h-11 items-center" aria-label="XPclip, créer une vidéo">
            <Logo taille={30} />
          </Link>
          <Link href="/app/compte" className="pastille bg-blanc text-[12px] tabular-nums" aria-label={`${q.restant} vidéo${q.restant > 1 ? "s" : ""} restante${q.restant > 1 ? "s" : ""} sur ${q.total}`}>
            {q.restant} vidéo{q.restant > 1 ? "s" : ""} restante{q.restant > 1 ? "s" : ""}
          </Link>
        </header>
      )}

      <main className={`flex-1 px-4 ${tuto ? "" : "pb-36 pt-5"}`}>{children}</main>

      {!tuto && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-encre bg-blanc pb-[max(8px,env(safe-area-inset-bottom))]" aria-label="Onglets">
          <ul className="mx-auto grid max-w-[480px] grid-cols-3">
            {ONGLETS.map((o) => {
              const actif = chemin.startsWith(o.href) || (o.href === "/app/videos" && chemin.startsWith("/app/video/"));
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
  );
}
