"use client";
/*
 * Calendrier : les publications de la semaine, jour par jour (7 colonnes sur ordinateur, une liste sur téléphone).
 * Toucher une publication : voir sur le réseau, changer l'heure, annuler, ou réessayer.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { TetePage } from "@/components/app/Ecran";
import { NOMS } from "@/components/studio/Publier";
import { Feuille } from "@/components/ui/Feuille";
import { afficherToast } from "@/components/ui/Toast";
import { usePublicationsDesClips } from "@/lib/clips-publications";
import { useLots } from "@/lib/lots";
import { annulerPublication, changerHeure, quandLisible, usePublicationOuverte, type Publication } from "@/lib/publication";

const ETATS: Record<Publication["statut"], { nom: string; fond: string }> = {
  envoi: { nom: "Envoi", fond: "bg-jaune" },
  en_cours: { nom: "Envoi", fond: "bg-jaune" },
  programmee: { nom: "Programmé", fond: "bg-jaune" },
  publiee: { nom: "Publié", fond: "bg-turquoise" },
  echouee: { nom: "Échec", fond: "bg-rose" },
  annulee: { nom: "Annulé", fond: "bg-blanc" },
};
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const pourChamp = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const lundi = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const heureDe = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function Calendrier() {
  const publier = usePublicationOuverte();
  const { publications, clipDe, relire } = usePublicationsDesClips();
  const { lots } = useLots();
  const [decalage, setDecalage] = useState(0);
  const [choix, setChoix] = useState<Publication | null>(null);
  const [quand, setQuand] = useState("");
  const [attente, setAttente] = useState(false);

  const debut = useMemo(() => {
    const l = lundi(new Date());
    l.setDate(l.getDate() + decalage * 7);
    return l;
  }, [decalage]);
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(debut);
    d.setDate(debut.getDate() + i);
    return d;
  });
  const visibles = (publications ?? []).filter((p) => p.statut !== "annulee");
  const duJour = (d: Date) => visibles.filter((p) => new Date(p.prevuLe ?? p.creeLe).toDateString() === d.toDateString()).sort((a, b) => Date.parse(a.prevuLe ?? a.creeLe) - Date.parse(b.prevuLe ?? b.creeLe));
  const semaine = jours.flatMap(duJour);
  const aujourdhui = new Date().toDateString();
  const fin = jours[6];
  const titreSemaine =
    decalage === 0 ? "Cette semaine" : decalage === 1 ? "Semaine prochaine" : decalage === -1 ? "Semaine dernière" : `Du ${debut.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
  const urlClip = (p: Publication) => {
    const c = clipDe(p);
    return c.lot ? lots?.find((l) => l.id === c.lot)?.clips.find((x) => x.fichier === c.fichier)?.url : undefined;
  };

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

  if (!publier)
    return (
      <>
        <TetePage titre="Calendrier" sous="Tes clips programmés, jour par jour." />
        <div className="tb-vide mt-6">
          <p className="titre">La publication arrive très vite.</p>
          <p>En attendant, télécharge tes clips depuis Mes clips.</p>
          <Link href="/app/videos" className="bouton bouton-rose bouton-petit">
            Mes clips
          </Link>
        </div>
      </>
    );

  return (
    <>
      <TetePage
        titre="Calendrier"
        sous="Tes clips programmés, jour par jour."
        action={
          <Link href="/app/videos?filtre=a_poster" className="bouton bouton-rose hidden lg:inline-flex lg:px-8">
            Programmer un clip
          </Link>
        }
      />

      <div className="ca-nav">
        <button type="button" className="ca-fleche" onClick={() => setDecalage((x) => x - 1)} aria-label="Semaine précédente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.800" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h2>{titreSemaine}</h2>
        {decalage !== 0 && (
          <button type="button" className="ca-auj" onClick={() => setDecalage(0)}>
            Aujourd&apos;hui
          </button>
        )}
        <button type="button" className="ca-fleche" onClick={() => setDecalage((x) => x + 1)} aria-label="Semaine suivante">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.800" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {publications !== null && (
        <div className="ca-resume">
          <span className="ap-pastille bg-jaune">{pluriel(semaine.filter((p) => p.statut === "programmee").length, "programmé")}</span>
          <span className="ap-pastille bg-turquoise">{pluriel(semaine.filter((p) => p.statut === "publiee").length, "publié")}</span>
          {semaine.some((p) => p.statut === "echouee") && <span className="ap-pastille bg-rose">{semaine.filter((p) => p.statut === "echouee").length} à réessayer</span>}
        </div>
      )}

      {publications === null ? (
        <div className="ap-vide mt-6" role="status">
          <span className="ap-roue" aria-label="Chargement" />
        </div>
      ) : (
        <ol className="ca-jours">
          {jours.map((d, i) => {
            const items = duJour(d);
            const passe = d.getTime() + 86_400_000 < Date.now();
            return (
              <li key={i} className="ca-jour" data-aujourdhui={d.toDateString() === aujourdhui} data-passe={passe}>
                <div className="ca-jour-tete">
                  <b>{d.toDateString() === aujourdhui ? "Aujourd'hui" : JOURS[i]}</b>
                  <span>{d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                </div>
                {items.length ? (
                  <ul className="ca-items">
                    {items.map((p) => {
                      const url = urlClip(p);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="ca-item"
                            onClick={() => {
                              setQuand(pourChamp(new Date(p.prevuLe ?? Date.now() + 3_600_000)));
                              setChoix(p);
                            }}
                          >
                            <span className="ca-item-video">{url && <video src={`${url}#t=0.5`} muted playsInline preload="metadata" />}</span>
                            <span className="min-w-0 flex-1">
                              <span className="ca-item-ligne flex items-center gap-1.5">
                                <span className={`ca-item-reseau ${p.reseau === "tiktok" ? "bg-turquoise" : "bg-rose"}`} aria-label={NOMS[p.reseau]}>
                                  {p.reseau === "tiktok" ? "TT" : "IG"}
                                </span>
                                <span className="ca-item-heure">{heureDe(p.prevuLe ?? p.creeLe)}</span>
                              </span>
                              <span className="ca-item-titre mt-1 block">{clipDe(p).titre}</span>
                            </span>
                            <span className={`ap-pastille ${ETATS[p.statut].fond}`}>{ETATS[p.statut].nom}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="ca-jour-vide">{passe ? "Rien." : "Rien de prévu."}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {publications !== null && !semaine.length && (
        <div className="tb-vide mt-6">
          <p className="titre">Rien cette semaine.</p>
          <p>Choisis un clip, appuie sur Poster, puis choisis le jour et l&apos;heure.</p>
          <Link href="/app/videos?filtre=a_poster" className="bouton bouton-rose bouton-petit">
            Programmer un clip
          </Link>
        </div>
      )}

      <Feuille ouverte={!!choix} fermer={() => setChoix(null)} titre={choix ? clipDe(choix).titre : "Ta publication"}>
        {choix && (
          <>
            <p className="text-[14px] font-semibold text-encre2">
              {NOMS[choix.reseau]}
              {choix.pseudo ? ` · @${choix.pseudo}` : ""} · {quandLisible(choix.prevuLe ?? choix.creeLe)}
            </p>
            {choix.erreur && <p className="mt-2 text-[14px] font-bold">{choix.erreur}</p>}
            {choix.lien && (
              <a href={choix.lien} target="_blank" rel="noopener noreferrer" className="bouton bouton-rose mt-5 w-full">
                Voir sur {NOMS[choix.reseau]}
              </a>
            )}
            {choix.statut === "programmee" && (
              <>
                <label className="mt-5 block text-[14px] font-bold">
                  Jour et heure
                  <input type="datetime-local" className="champ mt-1.5 font-normal" value={quand} min={pourChamp(new Date(Date.now() + 5 * 60_000))} max={pourChamp(new Date(Date.now() + 29 * 86_400_000))} onChange={(e) => setQuand(e.target.value)} />
                </label>
                <button type="button" disabled={attente || !quand} onClick={() => agir(() => changerHeure(choix.id, new Date(quand).toISOString()), "Nouvelle heure enregistrée.")} className="bouton bouton-rose mt-4 w-full">
                  Changer l&apos;heure
                </button>
                <button type="button" disabled={attente} onClick={() => agir(() => annulerPublication(choix.id), "Publication annulée.")} className="bouton bouton-blanc mt-3 w-full">
                  Annuler la publication
                </button>
              </>
            )}
            {choix.statut === "echouee" && (
              <Link href={`/app/video/${choix.video}/poster`} className="bouton bouton-rose mt-5 w-full">
                Réessayer
              </Link>
            )}
            <button type="button" onClick={() => setChoix(null)} className="bouton bouton-blanc mt-3 w-full">
              Fermer
            </button>
          </>
        )}
      </Feuille>
    </>
  );
}
