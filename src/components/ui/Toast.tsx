"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Toast = { id: number; texte: string; lien?: { href: string; libelle: string } };

let suivant = 1;
const ecouteurs = new Set<(t: Toast) => void>();

export function afficherToast(texte: string, lien?: Toast["lien"]) {
  const t = { id: suivant++, texte, lien };
  ecouteurs.forEach((f) => f(t));
}

/** Messages courts en haut de l'écran, à portée de vue sans gêner le pouce. */
export function Toasts() {
  const [liste, setListe] = useState<Toast[]>([]);
  useEffect(() => {
    const f = (t: Toast) => {
      setListe((l) => [...l, t]);
      setTimeout(() => setListe((l) => l.filter((x) => x.id !== t.id)), 4500);
    };
    ecouteurs.add(f);
    return () => {
      ecouteurs.delete(f);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))]" aria-live="polite">
      {liste.map((t) => (
        <div key={t.id} className="entree pointer-events-auto flex w-full max-w-[448px] items-center justify-between gap-3 rounded-2xl border-2 border-encre bg-blanc px-4 py-3 shadow-[0_4px_0_var(--color-encre)]">
          <p className="text-[15px] font-medium">{t.texte}</p>
          {t.lien && (
            <Link href={t.lien.href} className="lien flex min-h-11 shrink-0 items-center text-[15px]">
              {t.lien.libelle}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
