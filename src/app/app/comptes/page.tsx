"use client";
/*
 * Comptes TikTok et Instagram reliés. C'est l'adresse de retour donnée à Post for Me (Project Redirect URL) :
 * avec ?isSuccess=, next.config.ts amène sur /relier.
 */
import Link from "next/link";
import { useState } from "react";
import { Ecran } from "@/components/app/Ecran";
import { Publications } from "@/components/app/Publications";
import { NOMS, PictoReseau } from "@/components/studio/Publier";
import { Photo } from "@/components/onboarding/Reseaux";
import { Feuille } from "@/components/ui/Feuille";
import { afficherToast } from "@/components/ui/Toast";
import { delier, relier, useComptes, type CompteSocial, type Reseau } from "@/lib/publication";

export default function Comptes() {
  const { comptes, erreur, relire } = useComptes();
  const [attente, setAttente] = useState<Reseau | null>(null);
  const [retrait, setRetrait] = useState<CompteSocial | null>(null);
  const [probleme, setProbleme] = useState<string | null>(null);

  async function connecter(r: Reseau) {
    setAttente(r);
    setProbleme(null);
    try {
      await relier(r, "/app/comptes");
    } catch (e) {
      setAttente(null);
      setProbleme((e as Error).message);
    }
  }

  async function retirer(c: CompteSocial) {
    setAttente(c.reseau);
    try {
      await delier(c.id);
      setRetrait(null);
      afficherToast("Compte délié.");
      relire();
    } catch (e) {
      afficherToast((e as Error).message);
    }
    setAttente(null);
  }

  return (
    <>
      <Ecran titre="Tes comptes" sous="Relie-les une fois. XPclip poste tes vidéos pour toi.">
        {(probleme ?? erreur) && (
          <p role="alert" className="bloc bg-jaune p-4 text-[16px] font-bold">
            {probleme ?? erreur}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3.5 lg:gap-6">
          {(["tiktok", "instagram"] as Reseau[]).map((r) => {
            const c = comptes?.filter((x) => x.reseau === r).at(-1);
            return (
              <div key={r} className={`bloc flex min-w-0 flex-col items-start gap-3 p-4 lg:gap-5 lg:p-7 ${c?.actif ? "bg-jaune" : "bg-blanc"}`}>
                {c?.actif && c.photo ? <Photo url={c.photo} secours={<PictoReseau r={r} />} /> : <PictoReseau r={r} />}
                <div className="w-full min-w-0">
                  <p className="titre text-[23px] lg:text-[34px]">{NOMS[r]}</p>
                  <p className="mt-1 truncate text-[14px] font-medium lg:text-[17px]">{!comptes ? " " : !c ? "Pas encore relié" : c.actif ? `@${c.pseudo ?? "compte relié"}` : "À reconnecter"}</p>
                </div>
                {comptes &&
                  (c?.actif ? (
                    <button type="button" onClick={() => setRetrait(c)} className="lien flex min-h-12 items-center text-[15px]">
                      Délier
                    </button>
                  ) : (
                    <button type="button" disabled={attente !== null} onClick={() => connecter(r)} className="bouton bouton-rose bouton-petit w-full">
                      {attente === r ? "Un instant…" : c ? "Reconnecter" : "Relier"}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>

        <div className="bloc bg-blanc p-5 text-[15px] leading-snug lg:p-7 lg:text-[17px]">
          <p>Tu te connectes sur leur page officielle. On ne voit jamais ton mot de passe.</p>
          <p className="mt-2">Le nom « Post for Me » s&apos;affiche : c&apos;est notre service d&apos;envoi.</p>
          <p className="mt-2">Instagram : il faut un compte professionnel ou créateur. C&apos;est gratuit.</p>
        </div>

        <Publications titre="Tes publications" vide="Rien de programmé pour l'instant." />
        <Link href="/app/videos" className="lien flex min-h-12 w-fit items-center text-[16px]">
          Choisir une vidéo à poster
        </Link>
      </Ecran>

      <Feuille ouverte={!!retrait} fermer={() => setRetrait(null)} titre="Délier ce compte ?">
        {retrait && (
          <>
            <p className="text-[14px] text-encre2">Tes publications programmées sur {NOMS[retrait.reseau]} seront annulées.</p>
            <button type="button" disabled={attente !== null} onClick={() => retirer(retrait)} className="bouton bouton-rose mt-5 w-full">
              {attente ? "Un instant…" : "Oui, délier"}
            </button>
            <button type="button" onClick={() => setRetrait(null)} className="bouton bouton-blanc mt-3 w-full">
              Garder
            </button>
          </>
        )}
      </Feuille>
    </>
  );
}
