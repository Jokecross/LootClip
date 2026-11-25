"use client";
/* Retour de Google (voir src/lib/google.ts). */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Seul } from "@/components/ui/Seul";
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

  return rate ? (
    <Seul couleur="rose" titre={rate.erreur}>
      <Link href={rate.depart} className="bouton bouton-rose w-full">
        Revenir
      </Link>
    </Seul>
  ) : (
    <Seul couleur="turquoise" titre="Connexion en cours…" travaille />
  );
}
