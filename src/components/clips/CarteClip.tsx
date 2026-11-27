"use client";
/* Un clip fini : la vidéo 9:16, sa note sur 100, son accroche, et les boutons pour le télécharger et le poster. */
import { useRouter } from "next/navigation";
import { useState } from "react";

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

/** Le clip devient une vidéo publiable, puis on ouvre l'écran de publication (réseaux, légende, programmation). */
function BoutonPoster({ lot, fichier }: { lot: string; fichier: string }) {
  const router = useRouter();
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  async function poster() {
    setAttente(true);
    setErreur("");
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const index = Number(fichier.match(/(\d+)/)?.[1] ?? 1) - 1;
    const rep = await fetch(`/api/clips/${lot}/publier`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(data.session ? { authorization: `Bearer ${data.session.access_token}` } : {}) },
      body: JSON.stringify({ index }),
    }).catch(() => null);
    const j = await rep?.json().catch(() => null);
    if (!rep?.ok || !j?.video) {
      setAttente(false);
      return setErreur(j?.erreur === "ferme" ? "La publication arrive bientôt." : "Réessaie dans un instant.");
    }
    const { rafraichir } = await import("@/lib/serveur");
    await rafraichir();
    router.push(`/app/video/${j.video}/poster`);
  }
  return (
    <>
      <button type="button" onClick={poster} disabled={attente} className="bouton bouton-blanc bouton-petit mt-1">
        {attente ? "Un instant…" : "Poster"}
      </button>
      {erreur && <p className="text-[12px] font-semibold text-encre2">{erreur}</p>}
    </>
  );
}

export function CarteClip({ url, titre, score, duree, telecharger, lot, fichier }: { url?: string; titre: string; score?: number; duree: number; telecharger: string; /** En ligne : le lot et le fichier, pour publier. */ lot?: string; fichier?: string }) {
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
        {lot && fichier && <BoutonPoster lot={lot} fichier={fichier} />}
      </div>
    </article>
  );
}
