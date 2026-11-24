"use client";
/* Retour de Google (voir src/lib/google.ts). */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/marque/Logo";
import { finirGoogle } from "@/lib/google";
import { rafraichir } from "@/lib/serveur";
import { suivre } from "@/lib/suivi";

export default function RetourGoogle() {
  const router = useRouter();
  const [rate, setRate] = useState<{ erreur: string; depart: string } | null>(null);
  const fait = useRef(false);

  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    (async () => {
      const r = await finirGoogle();
      if ("erreur" in r) return setRate(r);
      await rafraichir();
      if (r.nouveau) suivre("inscription", { methode: "google" });
      router.replace(r.vers);
    })().catch(() => setRate({ erreur: "Une erreur est survenue. Réessaie.", depart: "/inscription" }));
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-4 text-center">
      <Logo taille={36} />
      {rate ? (
        <>
          <h1 className="titre mt-8 text-[30px]">{rate.erreur}</h1>
          <Link href={rate.depart} className="bouton bouton-rose mt-7 w-full">
            Revenir
          </Link>
        </>
      ) : (
        <p className="clignote mt-8 text-[16px] font-bold" role="status">
          Connexion en cours…
        </p>
      )}
    </main>
  );
}
