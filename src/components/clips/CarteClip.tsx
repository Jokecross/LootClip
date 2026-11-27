"use client";
/* Un clip fini : la vidéo 9:16, sa note sur 100, son accroche, et le bouton pour le télécharger. */

/** Une seule vidéo joue à la fois. */
function jouerSeule(e: React.SyntheticEvent<HTMLVideoElement>) {
  document.querySelectorAll("video").forEach((v) => v !== e.currentTarget && v.pause());
}

export function Score({ valeur }: { valeur?: number }) {
  if (!valeur) return null;
  return (
    <span className="ap-score" aria-label={`Note ${valeur} sur 100`}>
      <b>{valeur}</b>/100
    </span>
  );
}

export function CarteClip({ url, titre, score, duree, telecharger }: { url?: string; titre: string; score?: number; duree: number; telecharger: string }) {
  return (
    <article className="ap-clip">
      <div className="ap-clip-video">
        <video src={url} controls playsInline preload="metadata" onPlay={jouerSeule} />
        <Score valeur={score} />
      </div>
      <div className="ap-clip-infos">
        <p className="ap-clip-titre">{titre}</p>
        <p className="ap-clip-meta">{duree} s · 1080p</p>
        <a href={telecharger} className="bouton bouton-rose bouton-petit mt-1">
          Télécharger
        </a>
      </div>
    </article>
  );
}
