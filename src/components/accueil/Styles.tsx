"use client";
/* Même partie, trois styles : on touche, le téléphone change. Vidéos sorties du vrai moteur de montage. */
import { useState } from "react";
import { STYLES, type Style } from "@/lib/config";
import { Boucle } from "./Boucle";

const CHOIX: { s: Style; rythme: number[]; note?: string }[] = [
  { s: "defi", rythme: [3, 2, 2, 3, 2, 2] },
  { s: "drole", rythme: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { s: "mission", rythme: [5, 4, 5], note: "Dès Pro" },
];
const COULEURS = ["bg-rose", "bg-jaune", "bg-turquoise", "bg-orange"];

export function Styles() {
  const [actif, setActif] = useState<Style>("defi");
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-10">
      <h2 id="t-styles" className="titre titre-v4 max-lg:text-center lg:self-end">
        Choisis l&apos;ambiance. On&nbsp;monte.
      </h2>
      <div className="order-2 flex flex-col gap-3.5 lg:order-none lg:col-start-1 lg:row-start-2 lg:gap-5 lg:self-start" role="radiogroup" aria-label="Style de montage">
        {CHOIX.map(({ s, rythme, note }) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={actif === s}
            onClick={() => setActif(s)}
            className="touche"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="titre text-[23px] lg:text-[32px]">{STYLES[s].nom}</span>
              {note && <span className="pastille bg-turquoise">{note}</span>}
            </span>
            <span className="mt-1 block text-[15px] leading-snug lg:text-[18px]">{STYLES[s].detail}</span>
            <span className="mt-3 flex h-5 gap-1 lg:h-6 lg:gap-1.5" aria-hidden="true">
              {rythme.map((n, k) => (
                <span key={k} className={`rounded-md border-2 border-encre ${actif === s ? COULEURS[k % 4] : "bg-beige"}`} style={{ flex: n }} />
              ))}
            </span>
          </button>
        ))}
      </div>
      <div className="order-1 grid place-items-center lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="tel-grand">
          <div className="m-tel-ecran">
            {CHOIX.map(({ s }) => (
              <Boucle key={s} nom={`clips/${s}`} actif={actif === s} className={actif === s ? "" : "invisible"} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
