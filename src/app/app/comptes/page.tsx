"use client";
/*
 * Comptes TikTok et Instagram reliés. C'est l'adresse de retour donnée à Post for Me (Project Redirect URL) :
 * avec ?isSuccess=, next.config.ts amène sur /relier.
 */
import Link from "next/link";
import { useState } from "react";
import { TetePage } from "@/components/app/Ecran";
import { NOMS, PictoReseau } from "@/components/studio/Publier";
import { Photo } from "@/components/onboarding/Reseaux";
import { Feuille } from "@/components/ui/Feuille";
import { afficherToast } from "@/components/ui/Toast";
import { OFFRES_PAYANTES } from "@/lib/config";
import { useEtat } from "@/lib/etat";
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

  const etat = useEtat();
  const offre = etat.compte?.offre ?? "gratuit";
  const limite = offre === "gratuit" ? 0 : OFFRES_PAYANTES[offre].comptesReseaux;
  const relies = (comptes ?? []).filter((c) => c.actif);
  const plein = limite > 0 && relies.length >= limite;

  return (
    <>
      <TetePage titre="Tes réseaux" sous="Relie-les une fois. XPclip poste tes clips pour toi." />

      <div className="mt-5 flex flex-col gap-5 lg:mt-8 lg:gap-7">
        {(probleme ?? erreur) && (
          <p role="alert" className="bloc bg-jaune p-4 text-[16px] font-bold">
            {probleme ?? erreur}
          </p>
        )}

        {comptes && limite > 0 && (
          <div className="re-limite" data-plein={plein}>
            <span>
              Ton offre {offre === "gratuit" ? "" : OFFRES_PAYANTES[offre].nom} : {limite} réseau{limite > 1 ? "x" : ""} relié{limite > 1 ? "s" : ""} au plus. {relies.length}/{limite} utilisé{relies.length > 1 ? "s" : ""}.
            </span>
            {plein && limite < 2 && (
              <Link href="/tarifs" className="bouton bouton-blanc bouton-petit">
                Passer en Pro
              </Link>
            )}
          </div>
        )}

        <div className="re-cartes">
          {(["tiktok", "instagram"] as Reseau[]).map((r) => {
            const c = comptes?.filter((x) => x.reseau === r).at(-1);
            const bloque = !c?.actif && plein && !c;
            return (
              <div key={r} className="ap-carte re-carte" data-relie={Boolean(c?.actif)}>
                <div className="re-carte-tete">
                  {c?.actif && c.photo ? <Photo url={c.photo} secours={<PictoReseau r={r} />} /> : <PictoReseau r={r} />}
                  <div className="min-w-0 flex-1">
                    <p className="titre">{NOMS[r]}</p>
                    <p className="re-etat truncate">{!comptes ? " " : !c ? "Pas encore relié" : c.actif ? `@${c.pseudo ?? "compte relié"}` : "À reconnecter"}</p>
                  </div>
                  {c?.actif && <span className="ap-pastille bg-turquoise">Relié</span>}
                </div>
                {comptes &&
                  (c?.actif ? (
                    <button type="button" onClick={() => setRetrait(c)} className="lien flex min-h-12 w-fit items-center text-[15px]">
                      Délier ce compte
                    </button>
                  ) : bloque ? (
                    <Link href="/tarifs" className="bouton bouton-blanc w-full">
                      Passe en Pro pour le relier
                    </Link>
                  ) : (
                    <button type="button" disabled={attente !== null} onClick={() => connecter(r)} className="bouton bouton-rose w-full">
                      {attente === r ? "Un instant…" : c ? `Reconnecter ${NOMS[r]}` : `Relier ${NOMS[r]}`}
                    </button>
                  ))}
                {r === "instagram" && !c?.actif && <p className="text-[13px] font-semibold text-encre2">Il faut un compte Instagram professionnel ou créateur. C&apos;est gratuit.</p>}
              </div>
            );
          })}
        </div>

        <section className="ap-carte p-5 lg:p-7" aria-labelledby="t-comment">
          <h2 id="t-comment" className="tb-titre mb-4">
            Comment ça marche
          </h2>
          <ol className="re-pas">
            <li>
              <span>1</span>Relie ton compte. Tu te connectes sur la page officielle du réseau.
            </li>
            <li>
              <span>2</span>Dans Mes clips, choisis un clip et appuie sur Poster.
            </li>
            <li>
              <span>3</span>Poste tout de suite, ou programme le jour et l&apos;heure.
            </li>
          </ol>
          <p className="mt-4 text-[13px] font-semibold text-encre2">On ne voit jamais ton mot de passe. Le nom « Post for Me » s&apos;affiche : c&apos;est notre service d&apos;envoi.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/app/videos?filtre=a_poster" className="bouton bouton-rose bouton-petit">
              Choisir un clip à poster
            </Link>
            <Link href="/app/calendrier" className="bouton bouton-blanc bouton-petit">
              Voir mon calendrier
            </Link>
          </div>
        </section>
      </div>

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
