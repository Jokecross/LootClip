"use client";

import Link from "next/link";
import { Message } from "@/components/app/Ecran";
import { Vignette } from "@/components/app/Vignette";
import { PURGE_CLIPS_JOURS, STYLES } from "@/lib/config";
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
  const t = useMaintenant(1000);

  if (!etat.videos.length) {
    return (
      <Message titre="Pas encore de vidéo." sous="Dépose tes clips, on s'occupe du montage.">
        <Link href="/app/creer" className="bouton bouton-rose w-full">
          Créer ma première vidéo
        </Link>
      </Message>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 lg:mb-10">
        <h1 className="titre text-[40px] lg:text-[72px]">Mes vidéos</h1>
        <Link href="/app/creer" className="bouton bouton-rose hidden lg:inline-flex lg:px-9">
          Nouvelle vidéo
        </Link>
      </div>
      <ul className="etagere">
        {etat.videos.map((v) => {
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
      </ul>
      <p className="mt-8 text-[14px] font-medium">Tes clips bruts sont supprimés après {PURGE_CLIPS_JOURS} jours. Tes vidéos restent.</p>
    </>
  );
}
