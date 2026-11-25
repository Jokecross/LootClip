import type { Metadata, Viewport } from "next";
import "@/app/accueil.css";
import "@/app/app/appli.css";
import Link from "next/link";
import { LogoIcone } from "@/components/marque/Logo";
import { PiedDePage } from "@/components/PiedDePage";
import { GrilleTarifs } from "@/components/tarifs/GrilleTarifs";
import { Toasts } from "@/components/ui/Toast";

export const metadata: Metadata = { title: "Tarifs · XPclip" };
export const viewport: Viewport = { themeColor: "#F2934F", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function Tarifs() {
  return (
    <div className="v4 appli" style={{ "--page": "var(--color-orange)" } as React.CSSProperties}>
      <nav className="nav" aria-label="Menu">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Retour à l'accueil">
          <LogoIcone taille={38} className="rounded-[24%] ring-2 ring-encre" />
          <span className="titre text-[22px]">XPclip</span>
        </Link>
        <Link href="/inscription?mode=connexion" className="nav-lien">
          Se connecter
        </Link>
      </nav>
      <main className="sect !pb-20 !pt-12 lg:!pb-32 lg:!pt-20">
        <h1 className="titre titre-v4 text-center">Choisis ton offre.</h1>
        <p className="mb-7 mt-3 text-center text-[18px] font-medium lg:mb-12 lg:mt-5 lg:text-[22px]">Tu changes quand tu veux.</p>
        <GrilleTarifs />
      </main>
      <PiedDePage />
      <Toasts />
    </div>
  );
}
