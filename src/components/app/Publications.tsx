"use client";
/* Les publications d'une vidéo, ou toutes : état, lien, changement d'heure, annulation. */
import Link from "next/link";
import { useState } from "react";
import { NOMS, PictoReseau } from "@/components/studio/Publier";
import { Feuille } from "@/components/ui/Feuille";
import { afficherToast } from "@/components/ui/Toast";
import { useEtat } from "@/lib/etat";
import { annulerPublication, changerHeure, quandLisible, usePublications, type Publication } from "@/lib/publication";

const ETATS: Record<Publication["statut"], { nom: string; fond: string }> = {
  envoi: { nom: "En cours", fond: "bg-jaune" },
  en_cours: { nom: "En cours", fond: "bg-jaune" },
  programmee: { nom: "Programmée", fond: "bg-turquoise" },
  publiee: { nom: "Publiée", fond: "bg-turquoise" },
  echouee: { nom: "Échouée", fond: "bg-rose" },
  annulee: { nom: "Annulée", fond: "bg-blanc" },
};

/** Date locale au format attendu par le champ du navigateur. */
const pourChamp = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function Publications({ video, titre, vide }: { video?: string; titre: string; vide?: string }) {
  const { liste, relire } = usePublications(video);
  const etat = useEtat();
  const [choix, setChoix] = useState<Publication | null>(null);
  const [quand, setQuand] = useState("");
  const [attente, setAttente] = useState(false);

  if (!liste || (!liste.length && !vide)) return null;

  async function agir(f: () => Promise<unknown>, message: string) {
    setAttente(true);
    try {
      await f();
      setChoix(null);
      afficherToast(message);
    } catch (e) {
      afficherToast(e instanceof Error ? e.message : "Impossible pour l'instant. Réessaie.");
    }
    await relire();
    setAttente(false);
  }

  return (
    <section aria-labelledby="t-pubs">
      <h2 id="t-pubs" className="titre text-[26px] lg:text-[36px]">
        {titre}
      </h2>
      {!liste.length && <p className="mt-2 text-[15px] font-medium">{vide}</p>}
      <ul className="mt-3 flex flex-col gap-3.5">
        {liste.map((p) => {
          const nomVideo = video ? null : etat.videos.find((v) => v.id === p.video)?.titre;
          return (
            <li key={p.id} className="bloc bg-blanc p-4">
              <div className="flex items-center gap-3">
                <PictoReseau r={p.reseau} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{nomVideo ?? NOMS[p.reseau]}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-encre2">
                    {p.pseudo && <span className="block truncate">@{p.pseudo}</span>}
                    {quandLisible(p.prevuLe ?? p.creeLe)}
                  </p>
                </div>
                <span className={`pastille shrink-0 ${ETATS[p.statut].fond} ${["envoi", "en_cours"].includes(p.statut) ? "clignote" : ""}`}>{ETATS[p.statut].nom}</span>
              </div>
              {p.erreur && <p className="mt-2 text-[13px] font-bold">{p.erreur}</p>}
              {(p.lien || p.statut === "programmee" || (p.statut === "echouee" && !video)) && (
                <div className="mt-1 flex gap-5">
                  {p.lien && (
                    <a href={p.lien} target="_blank" rel="noopener noreferrer" className="lien flex min-h-12 items-center text-[14px]">
                      Voir sur {NOMS[p.reseau]}
                    </a>
                  )}
                  {p.statut === "programmee" && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuand(pourChamp(new Date(p.prevuLe!)));
                        setChoix(p);
                      }}
                      className="lien flex min-h-12 items-center text-[14px]"
                    >
                      Changer ou annuler
                    </button>
                  )}
                  {p.statut === "echouee" && !video && (
                    <Link href={`/app/video/${p.video}/poster`} className="lien flex min-h-12 items-center text-[14px]">
                      Réessayer
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Feuille ouverte={!!choix} fermer={() => setChoix(null)} titre="Ta publication">
        {choix && (
          <>
            <label className="block text-[14px] font-bold">
              Jour et heure
              <input type="datetime-local" className="champ mt-1.5 font-normal" value={quand} min={pourChamp(new Date(Date.now() + 5 * 60_000))} max={pourChamp(new Date(Date.now() + 29 * 86_400_000))} onChange={(e) => setQuand(e.target.value)} />
            </label>
            <button type="button" disabled={attente || !quand} onClick={() => agir(() => changerHeure(choix.id, new Date(quand).toISOString()), "Nouvelle heure enregistrée.")} className="bouton bouton-rose mt-5 w-full">
              Changer l&apos;heure
            </button>
            <button type="button" disabled={attente} onClick={() => agir(() => annulerPublication(choix.id), "Publication annulée.")} className="bouton bouton-blanc mt-3 w-full">
              Annuler la publication
            </button>
          </>
        )}
      </Feuille>
    </section>
  );
}
