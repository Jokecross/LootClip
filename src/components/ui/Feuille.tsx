"use client";

import { useEffect, useRef } from "react";

/** Feuille qui monte du bas de l'écran : tout reste sous le pouce. */
export function Feuille({ ouverte, fermer, titre, children }: { ouverte: boolean; fermer: () => void; titre: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    if (!ouverte && d.open) d.close();
  }, [ouverte]);

  return (
    <dialog
      ref={ref}
      onClose={fermer}
      onClick={(e) => e.target === ref.current && fermer()}
      aria-label={titre}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-encre backdrop:bg-encre/40 sm:m-auto"
    >
      <div className="entree pb-sur mx-auto max-w-[480px] rounded-t-[22px] border-2 border-b-0 border-encre bg-fond px-5 pt-3 sm:rounded-[22px] sm:border-b-2">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-beige" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <h2 className="titre text-[26px]">{titre}</h2>
          <button type="button" onClick={fermer} className="bouton bouton-carre" aria-label="Fermer">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-4 pb-3">{children}</div>
      </div>
    </dialog>
  );
}
