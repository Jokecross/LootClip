import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marque/Logo";
import { PiedDePage } from "@/components/PiedDePage";
import { GrilleTarifs } from "@/components/tarifs/GrilleTarifs";
import { Toasts } from "@/components/ui/Toast";

export const metadata: Metadata = { title: "Tarifs · XPclip" };

export default function Tarifs() {
  return (
    <>
      <main className="mx-auto max-w-[560px] px-4 pb-14 pt-4 lg:max-w-[1120px] lg:px-8 lg:pb-24 lg:pt-6">
        <Link href="/" className="flex min-h-11 w-fit items-center" aria-label="Retour à l'accueil">
          <Logo taille={30} />
        </Link>
        <h1 className="titre mt-8 text-[36px] lg:mt-16 lg:text-[64px]">Moins d&apos;un euro par jour.</h1>
        <p className="mb-6 mt-2 text-[15px] text-encre2 lg:mb-12 lg:mt-4 lg:text-[19px]">Choisis ton offre. Tu changes quand tu veux.</p>
        <div className="lg:mx-auto">
          <GrilleTarifs />
        </div>
      </main>
      <PiedDePage />
      <Toasts />
    </>
  );
}
