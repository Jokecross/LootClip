import type { Metadata, Viewport } from "next";
import "@/app/accueil.css";
import "@/app/app/appli.css";
import "@/app/app/outil.css";
import "@/app/lp.css";
import Link from "next/link";
import { LogoIcone } from "@/components/marque/Logo";
import { PiedDePage } from "@/components/PiedDePage";
import { GrilleTarifs } from "@/components/tarifs/GrilleTarifs";
import { Toasts } from "@/components/ui/Toast";

export const metadata: Metadata = { title: "Tarifs · XPclip" };
export const viewport: Viewport = { themeColor: "#fdf5ea", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function Tarifs() {
  return (
    <div className="v4 appli lp ap">
      <nav className="lp-nav" aria-label="Menu">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Retour à l'accueil">
          <LogoIcone taille={36} className="rounded-[24%] ring-2 ring-encre" />
          <span className="titre text-[21px]">XPclip</span>
        </Link>
        <div className="flex items-center gap-1.5 lg:gap-2">
          <Link href="/inscription?mode=connexion" className="nav-lien">
            Se connecter
          </Link>
          <Link href="/commencer" className="bouton bouton-rose bouton-petit hidden sm:inline-flex">
            Essayer
          </Link>
        </div>
      </nav>
      <main className="lp-hero !pb-20 lg:!pb-28">
        <p className="lp-sur">Tarifs</p>
        <h1 className="titre lp-h2">Un prix simple, selon ton rythme.</h1>
        <p className="lp-sous !mb-8 lg:!mb-12">Tous les réglages dans chaque offre. Tu changes quand tu veux.</p>
        <div className="mx-auto max-w-[1180px] text-left">
          <GrilleTarifs />
        </div>
      </main>
      <PiedDePage />
      <Toasts />
    </div>
  );
}
