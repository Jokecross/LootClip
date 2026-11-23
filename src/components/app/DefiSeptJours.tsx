"use client";

import { DEFI_JOURS } from "@/lib/config";
import { modifier, useEtat } from "@/lib/etat";

const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Objectif de l'accueil après la première vidéo : 1 vidéo partagée par jour pendant 7 jours. */
export function DefiSeptJours() {
  const etat = useEtat();
  const compte = etat.compte;
  if (!compte || !etat.videos.length) return null;

  const debut = compte.defiDebut ? jour(new Date(compte.defiDebut)) : null;
  const aujourdHui = jour(new Date());
  const joursPartages = new Set(etat.videos.filter((v) => v.partageeLe).map((v) => jour(new Date(v.partageeLe!))));
  const cases = Array.from({ length: DEFI_JOURS }, (_, k) => {
    const j = debut === null ? null : debut + k * 86_400_000;
    return { fait: j !== null && joursPartages.has(j), aujourdhui: j === aujourdHui };
  });
  const faits = cases.filter((c) => c.fait).length;
  const fini = debut !== null && aujourdHui >= debut + DEFI_JOURS * 86_400_000;

  return (
    <section className="carte p-4" aria-labelledby="t-defi">
      <div className="flex items-center justify-between gap-3">
        <h2 id="t-defi" className="text-[14px] font-bold">
          Objectif : 1 vidéo par jour pendant {DEFI_JOURS} jours
        </h2>
        <span className="titre text-[20px] tabular-nums">
          {faits}/{DEFI_JOURS}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5" role="progressbar" aria-valuenow={faits} aria-valuemax={DEFI_JOURS} aria-label="Jours réussis">
        {cases.map((c, k) => (
          <span key={k} className={`h-5 rounded-md border-2 ${c.fait ? "border-encre bg-jaune" : c.aujourdhui ? "border-encre bg-blanc" : "border-beige bg-blanc"}`} />
        ))}
      </div>
      <p className="mt-2 text-[13px] text-encre2">
        {debut === null
          ? "Partage ta vidéo sur TikTok pour lancer le défi."
          : fini
            ? `Défi terminé. ${faits} jour${faits > 1 ? "s" : ""} sur ${DEFI_JOURS}.`
            : cases.find((c) => c.aujourdhui)?.fait
              ? "Jour validé. Reviens demain."
              : "Poste ta vidéo du jour pour valider la case."}
      </p>
      {fini && (
        <button
          type="button"
          onClick={() => modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, defiDebut: new Date().toISOString() } : e.compte }))}
          className="lien mt-1 flex min-h-11 items-center text-[14px]"
        >
          Relancer le défi
        </button>
      )}
    </section>
  );
}
