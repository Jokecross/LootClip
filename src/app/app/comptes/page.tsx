"use client";
/*
 * Comptes TikTok et Instagram reliés. C'est l'adresse de retour donnée à Post for Me (Project Redirect URL) :
 * avec ?isSuccess=, next.config.ts amène sur /relier.
 */
import Link from "next/link";
import { useState } from "react";
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
    <div className="entree lg:mx-auto lg:max-w-[720px]">
      <h1 className="titre text-[32px] lg:text-[48px]">Tes comptes</h1>
      <p className="mt-2 text-[15px] text-encre2">Relie-les une fois. XPclip poste tes vidéos pour toi.</p>

      {(probleme ?? erreur) && (
        <p role="alert" className="carte-forte mt-4 bg-rose p-3.5 text-[15px] font-bold">
          {probleme ?? erreur}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {(["tiktok", "instagram"] as Reseau[]).map((r) => {
          const c = comptes?.filter((x) => x.reseau === r).at(-1);
          return (
            <div key={r} className={`flex items-center gap-3 p-4 ${c?.actif ? "carte-forte bg-jaune" : "carte"}`}>
              {c?.actif && c.photo ? <Photo url={c.photo} secours={<PictoReseau r={r} />} /> : <PictoReseau r={r} />}
              <div className="min-w-0 flex-1">
                <p className="titre text-[20px]">{NOMS[r]}</p>
                <p className="mt-0.5 truncate text-[13px] text-encre2">{!comptes ? " " : !c ? "Pas encore relié" : c.actif ? `@${c.pseudo ?? "compte relié"}` : "À reconnecter"}</p>
              </div>
              {comptes &&
                (c?.actif ? (
                  <button type="button" onClick={() => setRetrait(c)} className="lien min-h-12 shrink-0 text-[14px]">
                    Délier
                  </button>
                ) : (
                  <button type="button" disabled={attente !== null} onClick={() => connecter(r)} className="bouton bouton-rose bouton-petit shrink-0">
                    {attente === r ? "Un instant…" : c ? "Reconnecter" : "Relier"}
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      <div className="carte-pointillee mt-4 p-4 text-[13px] leading-snug text-encre2">
        <p>Tu te connectes sur leur page officielle. On ne voit jamais ton mot de passe.</p>
        <p className="mt-1.5">Le nom « Post for Me » s&apos;affiche : c&apos;est notre service d&apos;envoi.</p>
        <p className="mt-1.5">Instagram : il faut un compte professionnel ou créateur. C&apos;est gratuit.</p>
      </div>

      <Publications titre="Tes publications" vide="Rien de programmé pour l'instant." />
      <Link href="/app/videos" className="lien mt-4 flex min-h-12 w-fit items-center text-[14px]">
        Choisir une vidéo à poster
      </Link>

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
    </div>
  );
}
