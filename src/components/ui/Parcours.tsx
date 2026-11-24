"use client";
import { useEffect, useState } from "react";
/* Briques des écrans en plusieurs étapes : en-tête (retour, progression, compteur) et cartes de choix. */

export function Coche({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1A0B2E" />
      <path d="M7 12.4l3.2 3.2L17 8.8" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoutonRetour({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="bouton bouton-carre shrink-0" aria-label="Retour">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 6l-6 6 6 6" />
      </svg>
    </button>
  );
}

let dernierN = 0;

/** La barre d'XP : chaque écran passé rapporte 100 XP (pour le plaisir, sans valeur). */
export function Entete({ n, total, retour }: { n: number; total: number; retour?: () => void }) {
  const [large, setLarge] = useState(((Math.min(dernierN, n) || n) / total) * 100);
  useEffect(() => {
    dernierN = n;
    const id = setTimeout(() => setLarge((n / total) * 100), 60);
    return () => clearTimeout(id);
  }, [n, total]);
  return (
    <div className="flex items-center gap-3">
      {retour ? <BoutonRetour onClick={retour} /> : null}
      <div className="xp h-[14px] min-w-0 flex-1 overflow-hidden rounded-full border-2 border-encre bg-blanc" role="progressbar" aria-valuenow={n} aria-valuemin={1} aria-valuemax={total} aria-label={`Étape ${n} sur ${total}`}>
        <span style={{ width: `${large}%` }} />
      </div>
      <span className="titre w-[62px] text-right text-[14px] font-bold tabular-nums tracking-normal">{n * 100} XP</span>
    </div>
  );
}

/** Liste de cartes de choix : libellé à gauche, indice ou coche à droite. */
export function Options({
  options,
  valeur,
  choisir,
  label,
}: {
  options: { valeur: string; libelle: string; indice?: string }[];
  valeur?: string;
  choisir: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const actif = valeur === o.valeur;
        return (
          <button key={o.valeur} type="button" role="radio" aria-checked={actif} onClick={() => choisir(o.valeur)} className="option">
            <span className="titre text-[18px] font-bold tracking-[-0.01em]">{o.libelle}</span>
            {actif ? <Coche /> : o.indice ? <span className="text-right text-[12px] text-encre2">{o.indice}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
