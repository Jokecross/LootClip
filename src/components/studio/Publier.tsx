"use client";
/*
 * Écran « Publier » : comptes, jour et heure à la roue, puis départ.
 * Démo du studio : rien n'est envoyé. Le vrai écran est src/app/app/video/[id]/poster.
 */
import { useState } from "react";
import { Duo } from "@/components/ui/Duo";
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

export function Publier({ entete, pseudo, partir }: { entete: React.ReactNode; pseudo: string; partir: (d: Depart) => void }) {
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

  return (
    <Duo
      cle="publier"
      entete={entete}
      action={envoyer}
      fond={plus ? "" : "lg:bg-jaune"}
      gauche={
        <>
          <div className="flex items-start justify-between gap-3 lg:flex-col-reverse lg:gap-3">
            <h1 className="titre text-[30px] lg:text-[clamp(44px,4.5vw,84px)]">Tu postes où ?</h1>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:mt-[min(32px,3vh)] lg:gap-4">
            {(["tiktok", "instagram"] as Reseau[]).map((r, i) => {
              const actif = reseaux.includes(r);
              return (
                <button key={r} type="button" aria-pressed={actif} onClick={() => bascule(r)} style={{ "--d": `${i * 90}ms` } as React.CSSProperties} className={`surgit relative flex min-w-0 flex-col items-start gap-2 p-3 text-left lg:gap-[min(16px,1.6vh)] lg:rounded-3xl lg:p-[min(24px,2.4vh)] ${actif ? "carte-forte bg-jaune" : "carte"}`}>
                  <PictoReseau r={r} />
                  <span className="min-w-0 max-w-full">
                    <span className="titre block text-[17px] lg:text-[clamp(22px,1.9vw,32px)]">{NOMS[r]}</span>
                    <span className="mt-1 block truncate text-[12px] text-encre2 lg:text-[16px]">@{pseudo}</span>
                  </span>
                  {actif && <Coche className="absolute right-3 top-3 h-6 w-6 lg:right-5 lg:top-5 lg:h-8 lg:w-8" />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-[14px] border-2 border-encre bg-blanc p-1" role="radiogroup" aria-label="Moment de la publication">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" role="radio" aria-checked={plus === v} onClick={() => (pop(0.5), setPlus(v))} className={`min-h-12 rounded-[10px] text-[15px] font-bold lg:min-h-14 lg:text-[18px] ${plus === v ? "bg-encre text-fond" : ""}`}>
                {v ? "Programmer" : "Publier maintenant"}
              </button>
            ))}
          </div>

          {plus && (
            <div className="mt-3 grid grid-cols-7 gap-1 lg:mt-4 lg:gap-2" role="radiogroup" aria-label="Jour">
              {l.map((j, i) => (
                <button key={i} type="button" role="radio" aria-checked={jour === i} onClick={() => (pop(i / 7), setJour(i))} className={`flex min-h-[54px] flex-col items-center justify-center rounded-xl border-2 lg:min-h-[min(76px,9vh)] lg:rounded-2xl ${jour === i ? "border-encre bg-rose shadow-[0_3px_0_var(--color-encre)]" : "border-beige bg-blanc"}`}>
                  <span className="text-[11px] font-bold lg:text-[13px]">{j.court}</span>
                  <span className="titre mt-0.5 text-[16px] lg:text-[22px]">{j.num}</span>
                </button>
              ))}
            </div>
          )}
        </>
      }
      droite={
        plus ? (
          <>
            <p className="titre my-3 text-center text-[44px] tabular-nums lg:hidden">{heure(minutes)}</p>
            <Roulette label="Heure de publication" valeurs={HEURES} valeur={minutes} libelle={heure} changer={setMinutes} centre={<p className="titre text-[clamp(60px,6.4vw,120px)] tabular-nums">{heure(minutes)}</p>} />
          </>
        ) : (
          <div className="surgit flex flex-1 flex-col items-center justify-center py-8 text-center">
            <p className="titre text-[34px] lg:text-[clamp(52px,5.4vw,100px)]">Ça part tout de suite.</p>
            <p className="mt-2 text-[15px] text-encre2 lg:mt-6 lg:text-[24px] lg:text-encre">Une vidéo, {reseaux.length > 1 ? "deux comptes" : "un compte"}, un bouton.</p>
          </div>
        )
      }
    />
  );
}
