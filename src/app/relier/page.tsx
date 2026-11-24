"use client";
/*
 * Retour de TikTok ou d'Instagram (Post for Me renvoie sur /app/comptes, next.config.ts amène ici).
 * Confirme le compte relié, puis ramène là où le joueur en était.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/marque/Logo";
import { useEtat } from "@/lib/etat";
import { confirmerComptes, lireRetour, messageConnexion, type Reseau } from "@/lib/publication";
import { suivre } from "@/lib/suivi";

export default function Relier() {
  const router = useRouter();
  const etat = useEtat();
  const [probleme, setProbleme] = useState<string | null>(null);
  const suite = useRef("/app/comptes");
  const fait = useRef(false);

  useEffect(() => {
    if (!etat.charge || fait.current) return;
    fait.current = true;
    if (!etat.compte) return router.replace("/inscription");
    const p = new URLSearchParams(location.search);
    history.replaceState(null, "", "/relier");
    suite.current = lireRetour() ?? "/app/comptes";
    const reseau: Reseau = p.get("provider") === "instagram" ? "instagram" : "tiktok";
    const ids = (p.get("accountIds") ?? "").split(",").filter(Boolean).slice(0, 5);
    const rate = (m: string) => {
      suivre("reseaux", { action: "echec", reseau });
      setProbleme(m);
    };
    if (p.get("isSuccess") !== "true" || !ids.length) return rate(messageConnexion(reseau, p.get("error") ?? ""));
    confirmerComptes(ids)
      .then(() => {
        suivre("reseaux", { action: "relie", reseau });
        router.replace(suite.current);
      })
      .catch((e: Error) => rate(e.message));
  }, [etat.charge, etat.compte, router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4">
      <Logo taille={34} />
      {probleme ? (
        <>
          <h1 className="titre mt-6 text-[34px]">Pas encore relié.</h1>
          <p role="alert" className="mt-2 text-[16px] text-encre2">
            {probleme}
          </p>
          <button type="button" onClick={() => router.replace(suite.current)} className="bouton bouton-rose mt-6 w-full">
            Continuer
          </button>
        </>
      ) : (
        <p className="clignote mt-6 text-[16px] font-bold">Un instant…</p>
      )}
    </main>
  );
}
