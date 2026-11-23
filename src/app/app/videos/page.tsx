"use client";

import Link from "next/link";
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
      <div className="entree lg:mx-auto lg:max-w-[720px]">
        <h1 className="titre text-[32px] lg:text-[48px]">Mes vidéos</h1>
        <div className="carte-pointillee mt-5 bg-blanc px-5 py-10 text-center lg:mt-8 lg:py-16">
          <p className="titre text-[22px]">Pas encore de vidéo.</p>
          <p className="mt-2 text-[14px] text-encre2">Dépose tes clips, on s&apos;occupe du montage.</p>
          <Link href="/app/creer" className="bouton bouton-rose mt-6 w-full lg:w-auto lg:px-10">
            Créer ma première vidéo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="entree">
      <div className="flex items-center justify-between gap-4">
        <h1 className="titre text-[32px] lg:text-[48px]">Mes vidéos</h1>
        <Link href="/app/creer" className="bouton bouton-rose bouton-petit hidden lg:inline-flex">
          Nouvelle vidéo
        </Link>
      </div>
      <ul className="mt-5 flex flex-col gap-2.5 lg:mt-8 lg:grid lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
        {etat.videos.map((v) => {
          const { statut, avancement } = statutDe(v, t);
          return (
            <li key={v.id}>
              <Link href={`/app/video/${v.id}`} className="carte flex items-center gap-3 p-2.5 pr-4 active:bg-fond lg:h-full lg:flex-col lg:items-stretch lg:p-3 lg:transition-transform lg:hover:-translate-y-1">
                {/* Ordinateur : vignette avec l'accroche, comme dans la vidéo */}
                <span className="relative hidden aspect-[4/5] place-items-center overflow-hidden rounded-xl border-2 border-encre bg-nuit2 px-4 lg:grid" aria-hidden="true">
                  <span className="-rotate-2 rounded-lg border-2 border-encre bg-jaune px-3 py-2 text-center font-[family-name:var(--font-titre)] text-[16px] font-extrabold leading-tight text-encre shadow-[0_3px_0_var(--color-encre)]">
                    {v.accroche || v.titre}
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 rounded-md bg-encre/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-fond">{duree(v.duree)}</span>
                </span>
                <span className="grid h-[68px] w-[40px] shrink-0 place-items-center rounded-lg border-2 border-encre bg-encre lg:hidden" aria-hidden="true">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-fond">
                    <svg viewBox="0 0 24 24" className="ml-px h-2.5 w-2.5" fill="#1A0B2E">
                      <path d="M7 4.5v15l12-7.5z" />
                    </svg>
                  </span>
                </span>
                <div className="min-w-0 flex-1 lg:mt-3 lg:px-1">
                  <p className="truncate text-[15px] font-bold">{v.titre}</p>
                  <p className="mt-0.5 text-[13px] text-encre2">
                    {STYLES[v.style].nom} · {date(v.creeLe)} · {duree(v.duree)}
                  </p>
                  <span className={`pastille mt-1.5 ${FOND[statut]} ${statut === "en_cours" ? "clignote" : ""}`}>
                    {LIBELLES_STATUT[statut]}
                    {statut === "en_cours" ? ` · ${Math.round(avancement * 100)} %` : ""}
                    {statut === "termine" && v.partageeLe ? " · partagée" : ""}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-[13px] text-encre2">
        Tes clips bruts sont supprimés après {PURGE_CLIPS_JOURS} jours. Tes vidéos restent.
      </p>
    </div>
  );
}
