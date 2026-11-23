"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FormulaireCompte } from "@/components/compte/FormulaireCompte";
import { Logo } from "@/components/marque/Logo";
import { useEtat } from "@/lib/etat";
import { rafraichir } from "@/lib/serveur";

/*
 * Connexion d'un joueur qui a déjà un compte (e-mail + mot de passe, ou Google).
 * Les nouveaux passent par l'onboarding (/commencer), qui crée le compte à l'écran 7.
 */
export default function Connexion() {
  const router = useRouter();
  const etat = useEtat();

  useEffect(() => {
    if (etat.charge && etat.compte) router.replace("/app/creer");
  }, [etat.charge, etat.compte, router]);

  async function valider() {
    await rafraichir();
    router.push("/app/creer");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
      <Link href="/" className="flex min-h-11 w-fit items-center" aria-label="Retour à l'accueil">
        <Logo taille={30} />
      </Link>
      <h1 className="titre mt-8 text-[32px]">Content de te revoir.</h1>
      <p className="mb-6 mt-2 text-[15px] text-encre2">Reprends là où tu t&apos;étais arrêté.</p>
      <FormulaireCompte mode="connexion" retour="/app/creer" valider={valider} />
      <Link href="/commencer" className="mt-4 flex min-h-11 items-center justify-center text-[14px]">
        Pas encore de compte ?&nbsp;<span className="lien">Commencer</span>
      </Link>
    </main>
  );
}
