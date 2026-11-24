"use client";
/* Dernier écran avant les offres : relier TikTok et Instagram. Facultatif, et passé si la publication est fermée. */
import { useEffect, useState } from "react";
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
      fond="lg:bg-turquoise"
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
        <div className="flex flex-col gap-3 lg:flex-1 lg:gap-6">
          {(["tiktok", "instagram"] as Reseau[]).map((r, i) => {
            const c = relies.find((x) => x.reseau === r);
            return (
              <button
                key={r}
                type="button"
                disabled={!!c || attente !== null}
                onClick={() => choisir(r)}
                style={{ "--d": `${i * 110}ms` } as React.CSSProperties}
                className={`surgit flex min-h-[132px] w-full items-center gap-4 p-4 text-left lg:flex-1 lg:gap-8 lg:rounded-3xl lg:p-10 ${c ? "carte-forte bg-jaune" : "carte-forte bg-blanc lg:hover:-translate-y-1"}`}
              >
                <span className="lg:scale-[1.7] lg:px-4">{c?.photo ? <Photo url={c.photo} secours={<PictoReseau r={r} />} /> : <PictoReseau r={r} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="titre block truncate text-[24px] lg:text-[clamp(34px,3.2vw,60px)]">{c ? `@${c.pseudo ?? NOMS[r]}` : NOMS[r]}</span>
                  <span className="mt-1 block text-[13px] text-encre2 lg:mt-3 lg:text-[20px]">{c ? `${NOMS[r]} est relié.` : AIDE[r]}</span>
                </span>
                {c ? <Coche className="h-8 w-8 shrink-0 lg:h-14 lg:w-14" /> : <span className="pastille shrink-0 bg-rose lg:min-h-11 lg:px-5 lg:text-[18px]">{attente === r ? "Un instant…" : "Relier"}</span>}
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
