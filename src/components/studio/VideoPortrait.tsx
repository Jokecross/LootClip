"use client";
/*
 * Une vidéo dans un cadre 9:16, comme le vrai rendu XPclip.
 * Déjà verticale en 9:16 : affichée telle quelle. Sinon : image entière au centre, fond flouté, titre par-dessus.
 */
import { useState, type Ref } from "react";

export function VideoPortrait({ url, titre = "", lecteur, muet = !lecteur }: { url: string; titre?: string; lecteur?: Ref<HTMLVideoElement>; muet?: boolean }) {
  const [entiere, setEntiere] = useState(true);
  return (
    <span className="absolute inset-0 block overflow-hidden bg-encre">
      {!entiere && <video src={url} muted playsInline loop autoPlay aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-xl" />}
      <video
        ref={lecteur}
        src={url}
        muted={muet}
        playsInline
        loop
        autoPlay
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setEntiere(Math.abs(v.videoWidth / v.videoHeight - 9 / 16) < 0.03);
        }}
        className={`absolute inset-0 h-full w-full ${entiere ? "object-cover" : "object-contain"}`}
      />
      {!entiere && titre && (
        <span className="absolute inset-x-[6%] top-[11%] text-center">
          <span className="titre box-decoration-clone rounded-md border-2 border-encre bg-jaune px-2 py-0.5 text-[20px] leading-[1.5] text-encre lg:text-[28px]">{titre}</span>
        </span>
      )}
    </span>
  );
}
