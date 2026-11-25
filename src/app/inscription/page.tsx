"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FormulaireCompte } from "@/components/compte/FormulaireCompte";
import { LienAccueil } from "@/components/marque/Logo";
import { Duo, Titre } from "@/components/ui/Duo";
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
    <Duo
      cle="connexion"
      fond="turquoise"
      entete={<LienAccueil />}
      gauche={<Titre sous="Reprends là où tu t'étais arrêté.">Content de te revoir.</Titre>}
      droite={
        <div className="bloc relative mt-5 flex flex-col bg-blanc p-5 lg:m-auto lg:w-full lg:max-w-[600px] lg:p-10">
          <FormulaireCompte mode="connexion" retour="/app/creer" valider={valider} />
          <Link href="/commencer" className="mt-3 flex min-h-11 items-center justify-center text-[15px]">
            Pas encore de compte ?&nbsp;<span className="lien">Commencer</span>
          </Link>
        </div>
      }
    />
  );
}
