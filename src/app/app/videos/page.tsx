"use client";

import Link from "next/link";
import { Message, TetePage } from "@/components/app/Ecran";
import { Vignette } from "@/components/app/Vignette";
import { MesClips } from "@/components/clips/MesClips";
import { STYLES } from "@/lib/config";
import { useEtat } from "@/lib/etat";
import { date, duree } from "@/lib/format";
import { LIBELLES_STATUT, statutDe, useMaintenant, type Statut } from "@/lib/montage";

const FOND: Record<Statut, string> = {
  en_attente: "bg-blanc",
  en_cours: "bg-jaune",
  termine: "bg-turquoise",
  echoue: "bg-rose",
};

export default function MesVideos() {
  const etat = useEtat();
  const anciennes = etat.videos.filter((v) => !v.deClip);
  const t = useMaintenant(1000);

  const vide = (
    <Message titre="Pas encore de clip." sous="Colle le lien d'une vidéo. Tes clips arrivent en 3 à 5 minutes.">
      <Link href="/app/creer" className="bouton bouton-rose w-full">
        Créer mes premiers clips
      </Link>
    </Message>
  );

  return (
    <>
      <TetePage
        titre="Mes clips"
        sous="Regarde, télécharge, poste ou programme tes clips."
        action={
          <Link href="/app/creer" className="bouton bouton-rose hidden lg:inline-flex lg:px-9">
            Nouveaux clips
          </Link>
        }
      />
      <MesClips vide={anciennes.length ? null : vide} />
      {anciennes.length > 0 && <h2 className="titre mb-4 mt-12 text-[24px] lg:text-[32px]">Anciennes vidéos</h2>}
      {anciennes.length > 0 && <ul className="etagere">
        {anciennes.map((v) => {
          const { statut, avancement } = statutDe(v, t);
          const enCours = statut === "en_cours" || statut === "en_attente";
          return (
            <li key={v.id}>
              <Link href={`/app/video/${v.id}`} className="etagere-carte">
                <span className="etagere-tel block">
                  <Vignette video={v} avancement={avancement} enCours={enCours} />
                  <span className={`pastille absolute bottom-3.5 left-3.5 z-10 ${FOND[statut]}`}>
                    {statut === "termine" ? (v.partageeLe ? "Partagée" : duree(v.duree)) : statut === "en_cours" ? `${Math.round(avancement * 100)} %` : LIBELLES_STATUT[statut]}
                  </span>
                </span>
                <span className="titre mt-4 line-clamp-2 block text-[17px] leading-[1.08] lg:text-[20px]">{v.titre}</span>
                <span className="mt-1 block text-[13px] font-medium lg:text-[15px]">
                  {STYLES[v.style].nom}, {date(v.creeLe)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>}
    </>
  );
}
