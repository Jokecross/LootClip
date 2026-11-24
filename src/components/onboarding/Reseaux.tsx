"use client";
/* Dernier écran avant les offres : relier TikTok et Instagram. Facultatif, et passé si la publication est fermée. */
import { useEffect, useState } from "react";
import { Ancre } from "@/components/monde/Ancre";
import { NOMS, PictoReseau } from "@/components/studio/Publier";
import { Duo, Titre } from "@/components/ui/Duo";
import { Coche, Entete } from "@/components/ui/Parcours";
import { useEtat } from "@/lib/etat";
import { relier, useComptes, type Reseau } from "@/lib/publication";
import { suivre } from "@/lib/suivi";

const PATIENCE_MS = 5000;
const AIDE: Record<Reseau, string> = { tiktok: "Là où partiront tes vidéos.", instagram: "Compte professionnel ou créateur." };

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
    <Duo
      cle="reseaux"
      marque
      entete={<Entete n={n} total={total} />}
      fond="turquoise"
      gauche={
        <>
          <Titre sous={etat.compte?.profil?.tiktok === "non" && !relies.length ? "Pas encore de page ? Touche « Plus tard »." : "Tes vidéos partiront à l'heure que tu choisis."}>Relie tes comptes.</Titre>
          {probleme && (
            <p role="alert" className="carte-forte mb-4 bg-rose p-3.5 text-[15px] font-bold lg:mb-0 lg:mt-5">
              {probleme}
            </p>
          )}
        </>
      }
      droite={
        <div className="grid min-h-[300px] flex-1 grid-cols-2 gap-2.5 pt-3 lg:min-h-0 lg:gap-6 lg:py-[min(5vh,56px)]">
          {(["tiktok", "instagram"] as Reseau[]).map((r, i) => {
            const c = relies.find((x) => x.reseau === r);
            return (
              <button
                key={r}
                type="button"
                disabled={!!c || attente !== null}
                onClick={() => choisir(r)}
                style={{ "--d": `${i * 110}ms` } as React.CSSProperties}
                className={`surgit relative flex min-w-0 flex-col rounded-[22px] border-[3px] border-encre text-left transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(.3,1.6,.6,1)] lg:rounded-[36px] ${c ? "bg-jaune shadow-[0_10px_0_var(--color-encre)]" : `${r === "tiktok" ? "bg-blanc" : "bg-rose"} shadow-[0_5px_0_var(--color-encre)] hover:-translate-y-1.5 hover:shadow-[0_10px_0_var(--color-encre)]`}`}
              >
                <span className="relative block min-h-0 flex-1">
                  <Ancre nom={i ? "telephone2" : "telephone"} className="absolute inset-x-[4%] -top-[4%] bottom-[2%]" pose={{ ry: 0.22 - i * 0.44, rz: 0.06 - i * 0.12, z: 80 }} donnees={{ ecran: c ? "relie" : "relier", etat: c ? "oui" : undefined, retard: i * 0.12 }} />
                </span>
                <span className="relative z-20 block min-w-0 px-3 pb-3.5 lg:px-7 lg:pb-7">
                  <span className="flex min-w-0 items-center gap-2 lg:gap-3">
                    {c?.photo ? <Photo url={c.photo} secours={<PictoReseau r={r} />} /> : c ? <PictoReseau r={r} /> : null}
                    <span className="titre block min-w-0 truncate pb-0.5 text-[19px] lg:text-[clamp(34px,3.2vw,60px)]">{c ? `@${c.pseudo ?? NOMS[r]}` : NOMS[r]}</span>
                  </span>
                  <span className="mt-1 block min-h-[34px] text-[12px] font-medium leading-tight lg:mt-2 lg:min-h-0 lg:text-[19px]">{c ? `${NOMS[r]} est relié.` : AIDE[r]}</span>
                </span>
                {c ? <Coche className="absolute -right-2 -top-2 z-30 h-9 w-9 rounded-full border-[3px] border-fond lg:-right-4 lg:-top-4 lg:h-16 lg:w-16" /> : <span className="pastille absolute right-2.5 top-2.5 z-20 bg-turquoise lg:right-5 lg:top-5 lg:min-h-12 lg:px-5 lg:text-[19px]">{attente === r ? "Un instant…" : "Relier"}</span>}
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
          <p className="mt-3 text-center text-[13px] font-bold">Rien n&apos;est posté sans ton accord.</p>
          <p className="mt-1.5 text-center text-[11px] text-encre2">On ne voit jamais ton mot de passe. « Post for Me » est notre service d&apos;envoi.</p>
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
