"use client";

import { REMISE_ANNUELLE, type Periodicite } from "@/lib/config";

export function Bascule({ valeur, changer }: { valeur: Periodicite; changer: (p: Periodicite) => void }) {
  return (
    <div className="segment lg:mx-auto lg:w-[440px]" role="radiogroup" aria-label="Facturation">
      {(["mensuel", "annuel"] as const).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={valeur === p}
          onClick={() => changer(p)}
        >
          {p === "mensuel" ? "Mensuel" : `Annuel, -${Math.round(REMISE_ANNUELLE * 100)} %`}
        </button>
      ))}
    </div>
  );
}
