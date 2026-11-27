"use client";
/* Page d'essai du studio « lien → clips » (hors appli), avec une barre du haut sobre. */
import "@/app/accueil.css";
import "@/app/app/appli.css";
import "@/app/app/outil.css";
import Link from "next/link";
import { LogoIcone } from "@/components/marque/Logo";
import { Studio } from "@/components/clips/Studio";

export default function Clips() {
  return (
    <div className="appli v4 ap ap-hors">
      <header className="ap-barre">
        <div className="ap-barre-in">
          <Link href="/" className="ap-logo" aria-label="XPclip, accueil">
            <LogoIcone taille={34} className="rounded-[24%] ring-2 ring-encre" />
            <span className="titre text-[20px]">XPclip</span>
          </Link>
        </div>
      </header>
      <main className="ap-page !pb-10">
        <Studio />
      </main>
    </div>
  );
}
