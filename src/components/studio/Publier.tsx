"use client";
/*
 * Écran « Publier » : comptes, jour et heure à la roue, puis départ.
 * Démo du studio : rien n'est envoyé. Le vrai écran est src/app/app/video/[id]/poster.
 */
import { useState } from "react";
import { Telephone } from "@/components/studio/Telephone";
import { VideoPortrait } from "@/components/studio/VideoPortrait";
import { Duo, Titre } from "@/components/ui/Duo";
import { Coche } from "@/components/ui/Parcours";
import { Roulette } from "@/components/ui/Roulette";
import { pop } from "@/lib/sons";

export type Reseau = "tiktok" | "instagram";
export type Depart = { reseaux: Reseau[]; quand: string | null };

export const NOMS: Record<Reseau, string> = { tiktok: "TikTok", instagram: "Instagram" };
export const HEURES = Array.from({ length: 33 }, (_, i) => 480 + i * 30);
export const heure = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;

export function jours() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86_400_000);
    return { court: i === 0 ? "Auj." : d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""), num: d.getDate(), long: i === 0 ? "aujourd'hui" : d.toLocaleDateString("fr-FR", { weekday: "long" }) };
  });
}

export function PictoReseau({ r }: { r: Reseau }) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-encre ${r === "tiktok" ? "bg-turquoise" : "bg-rose"}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {r === "tiktok" ? <path d="M10 17.5a3 3 0 11-3-3M10 17.5V5c2 0 5 1.5 6.5 4" /> : <path d="M8 4h8a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4zM12 9a3 3 0 110 6 3 3 0 010-6z" />}
      </svg>
    </span>
  );
}

export function nomsReseaux(l: Reseau[]) {
  return l.map((r) => NOMS[r]).join(" et ");
}

export function Publier({ entete, pseudo, url, titre, partir }: { url: string; titre: string; entete: React.ReactNode; pseudo: string; partir: (d: Depart) => void }) {
  const [reseaux, setReseaux] = useState<Reseau[]>([]);
  const [plus, setPlus] = useState(true);
  const [jour, setJour] = useState(0);
  const [minutes, setMinutes] = useState(19 * 60);
  const [l] = useState(jours);

  const bascule = (r: Reseau) => {
    pop(reseaux.includes(r) ? 0.1 : 0.8);
    setReseaux((x) => (x.includes(r) ? x.filter((y) => y !== r) : (["tiktok", "instagram"] as Reseau[]).filter((y) => y === r || x.includes(y))));
  };

  const envoyer = (
    <button type="button" disabled={!reseaux.length} onClick={() => partir({ reseaux, quand: plus ? `${l[jour].long} à ${heure(minutes)}` : null })} className="bouton bouton-rose w-full">
      {!reseaux.length ? "Choisis une plateforme" : plus ? "Programmer ma vidéo" : "Publier ma vidéo"}
    </button>
  );

  const moment = (
    <div className="segment" role="radiogroup" aria-label="Moment de la publication">
      {[true, false].map((v) => (
        <button key={String(v)} type="button" role="radio" aria-checked={plus === v} onClick={() => (pop(0.5), setPlus(v))}>
          {v ? "Programmer" : "Publier maintenant"}
        </button>
      ))}
    </div>
  );

  return (
    <Duo
      cle="publier"
      entete={entete}
      action={envoyer}
      fond={plus ? "turquoise" : "jaune"}
      gauche={
        <Titre
          plus={
            <div className="grid grid-cols-2 gap-2.5 pt-2 lg:gap-4 lg:pt-6">
              {(["tiktok", "instagram"] as Reseau[]).map((r, i) => {
                const actif = reseaux.includes(r);
                return (
                  <button key={r} type="button" aria-pressed={actif} onClick={() => bascule(r)} style={{ "--d": `${i * 90}ms` } as React.CSSProperties} className="choix surgit !rounded-[20px] items-start gap-2 p-3 lg:gap-3 lg:!rounded-[26px] lg:p-4">
                    <PictoReseau r={r} />
                    <span className="min-w-0 max-w-full">
                      <span className="titre block !text-[18px] lg:!text-[clamp(17px,1.600vw,28px)]">{NOMS[r]}</span>
                      <span className="mt-1 block truncate text-[12px] lg:text-[16px]">@{pseudo}</span>
                    </span>
                    {actif && <Coche className="absolute right-3 top-3 h-7 w-7 lg:right-4 lg:top-4 lg:h-9 lg:w-9" />}
                  </button>
                );
              })}
              <div className="col-span-2 hidden lg:block">{moment}</div>
            </div>
          }
        >
          Tu postes où&nbsp;?
        </Titre>
      }
      droite={
        <>
          <div className="pt-4 lg:pt-0">
            <div className="lg:hidden">{moment}</div>
            {plus && (
              <div className="mt-3 grid grid-cols-7 gap-1.5 lg:mt-0 lg:gap-2.5" role="radiogroup" aria-label="Jour">
                {l.map((j, i) => (
                  <button key={i} type="button" role="radio" aria-checked={jour === i} onClick={() => (pop(i / 7), setJour(i))} className={`flex min-h-[58px] flex-col items-center justify-center rounded-[14px] border-2 border-encre lg:min-h-[min(78px,9vh)] lg:rounded-[18px] ${jour === i ? "bg-rose" : "bg-blanc shadow-[0_3px_0_var(--color-encre)]"}`}>
                    <span className="text-[12px] font-bold lg:text-[14px]">{j.court}</span>
                    <span className="titre mt-0.5 text-[18px] lg:text-[24px]">{j.num}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {plus ? (
            <>
              <p className="titre my-2.5 text-center text-[48px] tabular-nums lg:hidden">{heure(minutes)}</p>
              <div className="flex min-h-0 flex-1 lg:p-[clamp(24px,2.6vw,48px)] lg:pb-0">
                <Roulette nu label="Heure de publication" valeurs={HEURES} valeur={minutes} libelle={heure} changer={setMinutes} centre={<p className="titre pb-[8%] text-[clamp(52px,5.400vw,96px)] tabular-nums">{heure(minutes)}</p>} />
              </div>
            </>
        ) : (
          <div className="relative flex min-h-[260px] flex-1 flex-col items-center justify-end text-center">
            <Telephone className="absolute inset-x-0 bottom-[88px] top-2 lg:bottom-[19%] lg:top-0">
              <VideoPortrait url={url} titre={titre} />
            </Telephone>
            <p className="titre relative z-20 text-[30px] lg:text-[clamp(44px,4.2vw,84px)]">Ça part tout de suite.</p>
            <p className="relative z-20 mt-2 text-[16px] font-bold lg:mt-3 lg:text-[22px]">Une vidéo, {reseaux.length > 1 ? "deux comptes" : "un compte"}, un bouton.</p>
          </div>
          )}
        </>
      }
    />
  );
}
