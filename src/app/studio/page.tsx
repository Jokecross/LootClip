"use client";
/* La régie du studio, réservée à l'équipe. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { PubStudio as Plateau } from "@/components/studio/PubStudio";
import { useEtat } from "@/lib/etat";
import { droitStudio, poserTournage } from "@/lib/tournage";

export default function Studio() {
  const etat = useEtat();
  const [droit, setDroit] = useState<boolean | null>(null);

  useEffect(() => {
    if (!etat.charge) return;
    droitStudio().then((d) => {
      if (d === false) poserTournage(false);
      setDroit(d === true);
    });
  }, [etat.charge, etat.compte?.email]);

  if (droit === null) return <div className="min-h-dvh bg-fond" />;
  if (!droit)
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4">
        <h1 className="titre text-[32px]">Page réservée.</h1>
        <p className="mt-2 text-[15px] text-encre2">Connecte-toi avec le compte de l&apos;équipe.</p>
        <Link href="/inscription" className="bouton bouton-rose mt-6 w-full">
          Me connecter
        </Link>
      </main>
    );
  return <Plateau />;
}
