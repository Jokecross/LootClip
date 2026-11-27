"use client";
/* Dernier écran avant les offres : relier TikTok et Instagram. Facultatif, et passé si la publication est fermée. */
import { useEffect, useState } from "react";
import { TelProfil } from "@/components/onboarding/TelProfil";
import { NOMS, PictoReseau } from "@/components/studio/Publier";
import { Cadre, Progression, Question } from "@/components/onboarding/Cadre";
import { Coche } from "@/components/ui/Parcours";
import { useEtat } from "@/lib/etat";
import { relier, useComptes, type Reseau } from "@/lib/publication";
import { suivre } from "@/lib/suivi";

const PATIENCE_MS = 5000;
const AIDE: Record<Reseau, string> = { tiktok: "Là où partiront tes clips.", instagram: "Compte professionnel ou créateur." };

export function Reseaux({ n, total, ici, passer }: { n: number; total: number; ici: string; passer: () => void }) {
  const etat = useEtat();
  const { comptes, erreur } = useComptes();
  const [attente, setAttente] = useState<Reseau | null>(null);
  const [probleme, setProbleme] = useState("");
  const relies = comptes?.filter((c) => c.actif) ?? [];

  // Fermé, en panne ou trop lent : on ne retient jamais quelqu'un qui allait voir les offres.
  useEffect(() => {
    if (erreur) return passer();
    if (comptes) return;
    const id = setTimeout(passer, PATIENCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comptes, erreur]);

  // Retour arrière depuis TikTok : les boutons se réveillent.
  useEffect(() => {
    const revenu = (e: PageTransitionEvent) => e.persisted && setAttente(null);
    window.addEventListener("pageshow", revenu);
    return () => window.removeEventListener("pageshow", revenu);
  }, []);

  if (!comptes) return <div className="min-h-dvh bg-fond" />;

  async function choisir(r: Reseau) {
    setAttente(r);
    setProbleme("");
    suivre("reseaux", { action: "relier", reseau: r });
    try {
      await relier(r, ici);
    } catch (e) {
      setAttente(null);
      setProbleme((e as Error).message);
    }
  }

  return (
    <Cadre
      cle="reseaux"
      entete={<Progression n={n} total={total} />}
      fond="turquoise"
      gauche={
        <Question
          avant="Tes comptes"
          sous={etat.compte?.profil?.tiktok === "non" && !relies.length ? "Pas encore de page ? Touche « Plus tard »." : "Tes clips partiront à l'heure que tu choisis."}
          plus={
            probleme && (
              <p role="alert" className="mt-3 rounded-2xl border-2 border-encre bg-rose p-3 !text-[15px] font-bold !text-encre">
                {probleme}
              </p>
            )
          }
        >
          Relie tes comptes.
        </Question>
      }
      droite={
        <div className="ob-reseaux-grille">
          {(["tiktok", "instagram"] as Reseau[]).map((r, i) => {
            const c = relies.find((x) => x.reseau === r);
            return (
              <button
                key={r}
                type="button"
                disabled={!!c || attente !== null}
                onClick={() => choisir(r)}
                style={{ "--d": `${i * 110}ms` } as React.CSSProperties}
                className={`choix choix-haut ob-reseau surgit ${c ? "!bg-jaune" : ""}`}
              >
                <span className={`choix-vue ${i ? "bg-orange" : "bg-rose"}`}>
                  <TelProfil etat={c ? "abonnes" : "non"} />
                </span>
                <span className="relative z-20 block min-w-0 px-3 pb-3.5 pt-3 lg:px-7 lg:pb-7 lg:pt-5">
                  <span className="flex min-w-0 items-center gap-2 lg:gap-3">
                    {c?.photo ? <Photo url={c.photo} secours={<PictoReseau r={r} />} /> : c ? <PictoReseau r={r} /> : null}
                    <span className={`titre block min-w-0 truncate pb-0.5 ${c ? "text-[15px] lg:text-[clamp(24px,2vw,38px)]" : "text-[19px] lg:text-[clamp(34px,3.2vw,60px)]"}`}>{c ? `@${c.pseudo ?? NOMS[r]}` : NOMS[r]}</span>
                  </span>
                  <span className="mt-1 block min-h-[34px] text-[13px] font-medium leading-tight lg:mt-2 lg:min-h-[50px] lg:text-[19px]">{c ? `${NOMS[r]} est relié.` : AIDE[r]}</span>
                  {!c && <span className="pastille mt-2 w-full justify-center bg-rose py-2 text-[14px] lg:mt-4 lg:min-h-12 lg:text-[19px]">{attente === r ? "Un instant…" : "Relier"}</span>}
                </span>
                {c && <Coche className="absolute right-3 top-3 z-30 h-7 w-7 lg:right-5 lg:top-5 lg:h-11 lg:w-11" />}
              </button>
            );
          })}
        </div>
      }
      action={
        <button
          type="button"
          disabled={attente !== null}
          onClick={() => {
            if (!relies.length) suivre("reseaux", { action: "plus_tard" });
            passer();
          }}
          className={`bouton w-full ${relies.length ? "bouton-rose" : "bouton-blanc"}`}
        >
          {relies.length ? "Continuer" : "Plus tard"}
        </button>
      }
      pied={
        <>
          <p className="font-bold">Rien n&apos;est posté sans ton accord.</p>
          <p>On ne voit jamais ton mot de passe. « Post for Me » est notre service d&apos;envoi.</p>
        </>
      }
    />
  );
}

/** La photo du compte, ou le picto du réseau si elle ne s'affiche pas. */
export function Photo({ url, secours }: { url: string; secours: React.ReactNode }) {
  const [ko, setKo] = useState(false);
  if (ko) return <>{secours}</>;
  return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setKo(true)} className="h-10 w-10 shrink-0 rounded-xl border-2 border-encre object-cover" />;
}
