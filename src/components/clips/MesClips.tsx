"use client";
/*
 * Mes clips : tous les clips, rangés par vidéo d'origine (titre et miniature du lien), ou tous mélangés par note.
 * Filtres : à poster, programmés, publiés (d'après les publications de chaque clip).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { cleClip, statutDesPublications, usePublicationsDesClips, type StatutClip } from "@/lib/clips-publications";
import { avancementLot, enCours, ilYa, lienTelechargement, nomEtape, plateformeDe, publiable, useApercu, useLots, type ClipLot, type Lot } from "@/lib/lots";
import { usePublicationOuverte } from "@/lib/publication";
import { CarteClip } from "./CarteClip";

type Filtre = "tous" | StatutClip;
const FILTRES: { cle: Filtre; nom: string }[] = [
  { cle: "tous", nom: "Tous" },
  { cle: "a_poster", nom: "À poster" },
  { cle: "programme", nom: "Programmés" },
  { cle: "publie", nom: "Publiés" },
];

export function MesClips({ vide }: { /** Affiché quand il n'y a encore aucun clip. */ vide?: React.ReactNode }) {
  const { lots } = useLots();
  const { publications, parClip } = usePublicationsDesClips();
  const publier = usePublicationOuverte();
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [tri, setTri] = useState<"videos" | "notes">("videos");

  // /app/videos?filtre=a_poster (depuis l'Accueil ou le Calendrier)
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("filtre");
    if (f && FILTRES.some((x) => x.cle === f)) setFiltre(f as Filtre);
  }, []);

  if (lots === null)
    return (
      <div className="ap-vide mt-6" role="status">
        <span className="ap-roue" aria-label="Chargement" />
      </div>
    );

  const visibles = lots.filter((l) => l.clips.length || enCours(l) || (l.erreur && Date.now() - l.debut < 3 * 86_400_000));
  if (!visibles.length) return <>{vide}</>;

  const statut = (lot: string, c: ClipLot): StatutClip => statutDesPublications(parClip.get(cleClip(lot, c.fichier)) ?? []);
  const garde = (lot: string, c: ClipLot) => filtre === "tous" || (publications !== null && statut(lot, c) === filtre);
  const tous = visibles.flatMap((l) => l.clips.map((c) => ({ ...c, lot: l.id })));
  const compte = (f: Filtre) => (f === "tous" ? tous.length : publications === null ? null : tous.filter((c) => statut(c.lot, c) === f).length);
  const carte = (lot: string, c: ClipLot) => (
    <CarteClip
      key={cleClip(lot, c.fichier)}
      url={c.url}
      titre={c.titre}
      score={c.score}
      duree={c.duree}
      telecharger={lienTelechargement(c)}
      lot={publier && publiable(c) ? lot : undefined}
      fichier={c.fichier}
      statut={publications ? statut(lot, c) : undefined}
    />
  );

  const filtres = (
    <div className="mc-barre">
      <div className="mc-filtres" role="group" aria-label="Filtrer les clips">
        {FILTRES.filter((f) => publier || f.cle === "tous").map((f) => (
          <button key={f.cle} type="button" className="mc-filtre" aria-pressed={filtre === f.cle} onClick={() => setFiltre(f.cle)}>
            {f.nom}
            <b className="tabular-nums">{compte(f.cle) ?? "…"}</b>
          </button>
        ))}
      </div>
      <div className="mc-tri" role="group" aria-label="Ranger les clips">
        Ranger par
        <button type="button" aria-pressed={tri === "videos"} onClick={() => setTri("videos")}>
          Vidéo
        </button>
        <button type="button" aria-pressed={tri === "notes"} onClick={() => setTri("notes")}>
          Meilleure note
        </button>
      </div>
    </div>
  );

  const aucun = (
    <div className="tb-vide mt-6">
      <p className="titre">{filtre === "a_poster" ? "Tout est posté." : filtre === "programme" ? "Rien de programmé." : filtre === "publie" ? "Aucun clip publié." : "Aucun clip."}</p>
      <p>{filtre === "a_poster" ? "Lance une nouvelle vidéo pour avoir d'autres clips." : "Choisis un clip et appuie sur Poster."}</p>
      {filtre !== "tous" && (
        <button type="button" className="bouton bouton-blanc bouton-petit" onClick={() => setFiltre(filtre === "a_poster" ? "tous" : "a_poster")}>
          {filtre === "a_poster" ? "Voir tous les clips" : "Voir les clips à poster"}
        </button>
      )}
    </div>
  );

  if (tri === "notes") {
    const tries = tous.filter((c) => garde(c.lot, c)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return (
      <>
        {filtres}
        {tries.length ? <div className="ap-clips mc-grille mt-5">{tries.map((c) => carte(c.lot, c))}</div> : aucun}
      </>
    );
  }

  const groupes = visibles.map((l) => ({ lot: l, clips: l.clips.filter((c) => garde(l.id, c)) })).filter((g) => filtre === "tous" || g.clips.length);
  return (
    <>
      {filtres}
      {groupes.length ? (
        <div className="ap-lots">
          {groupes.map(({ lot, clips }) => (
            <BlocVideo key={lot.id} lot={lot}>
              {clips.map((c) => carte(lot.id, c))}
            </BlocVideo>
          ))}
        </div>
      ) : (
        aucun
      )}
    </>
  );
}

function BlocVideo({ lot, children }: { lot: Lot; children: React.ReactNode }) {
  const a = useApercu(lot.lien);
  const actif = enCours(lot);
  const meilleur = Math.max(0, ...lot.clips.map((c) => c.score ?? 0));
  const titre = a?.titre ?? (lot.lien ? `Vidéo ${plateformeDe(lot.lien)}` : "Fichier envoyé");
  return (
    <section className="ap-carte ap-lot" aria-label={titre}>
      <div className="mc-lot-tete">
        <div className="mc-lot-image">{a?.miniature ? <img src={a.miniature} alt="" referrerPolicy="no-referrer" /> : <span className="titre">{plateformeDe(lot.lien)}</span>}</div>
        <div className="min-w-0 flex-1">
          <h2 className="mc-lot-titre">{titre}</h2>
          <div className="mc-lot-infos">
            <span className="ap-pastille">{plateformeDe(lot.lien)}</span>
            <span className="ap-pastille">{ilYa(lot.debut)}</span>
            {lot.clips.length > 0 && (
              <span className="ap-pastille">
                {lot.clips.length} clip{lot.clips.length > 1 ? "s" : ""}
              </span>
            )}
            {meilleur > 0 && <span className="ap-pastille bg-jaune">Meilleur {meilleur}/100</span>}
            {actif && <span className="ap-pastille bg-jaune">En cours</span>}
          </div>
        </div>
        {lot.lien && (
          <a href={lot.lien} target="_blank" rel="noopener noreferrer" className="mc-lot-source hidden lg:inline-flex">
            Voir la vidéo
          </a>
        )}
      </div>
      {actif && !lot.clips.length ? (
        <Link href={`/app/creer?lot=${lot.id}`} className="mc-encours">
          <span className="ap-roue" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <b>{nomEtape(lot)}</b>
            <span className="ap-mini-jauge" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.max(0.04, avancementLot(lot))})`, background: "var(--color-rose)" }} />
            </span>
          </span>
          <span className="tabular-nums font-extrabold">{Math.round(avancementLot(lot) * 100)} %</span>
        </Link>
      ) : lot.erreur && !lot.clips.length ? (
        <div className="mc-rate">
          <p>{lot.erreur}</p>
          <Link href="/app/creer" className="bouton bouton-blanc bouton-petit mt-3">
            Réessayer
          </Link>
        </div>
      ) : (
        <div className="ap-clips">
          {children}
          {actif && (
            <Link href={`/app/creer?lot=${lot.id}`} className="ap-clip-attente">
              <span className="ap-roue" aria-hidden="true" />
              <span>{nomEtape(lot)}</span>
              <span className="tabular-nums">{Math.round(avancementLot(lot) * 100)} %</span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
