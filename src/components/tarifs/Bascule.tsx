"use client";

import { REMISE_ANNUELLE, type Periodicite } from "@/lib/config";

export function Bascule({ valeur, changer }: { valeur: Periodicite; changer: (p: Periodicite) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-[14px] border-2 border-encre bg-blanc p-1 lg:mx-auto lg:w-[440px]" role="radiogroup" aria-label="Facturation">
      {(["mensuel", "annuel"] as const).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={valeur === p}
          onClick={() => changer(p)}
          className={`flex min-h-10 items-center justify-center rounded-[10px] text-[14px] font-bold transition-colors ${valeur === p ? "bg-encre text-fond" : "text-encre"}`}
        >
          {p === "mensuel" ? "Mensuel" : `Annuel, -${Math.round(REMISE_ANNUELLE * 100)} %`}
        </button>
      ))}
    </div>
  );
}
