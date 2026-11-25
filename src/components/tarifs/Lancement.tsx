"use client";

import { useEffect, useState } from "react";
import { LANCEMENT } from "@/lib/config";
import { finLancement, lancementActif } from "@/lib/prix";

const deux = (n: number) => String(n).padStart(2, "0");

/** Offre de lancement avec un vrai compte à rebours (même fin pour tout le monde). */
export function Lancement() {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    setT(Date.now());
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (t === null || !lancementActif(t)) return null;

  const reste = Math.max(0, finLancement() - t) / 1000;
  const j = Math.floor(reste / 86400);
  const h = Math.floor((reste % 86400) / 3600);
  const m = Math.floor((reste % 3600) / 60);
  const s = Math.floor(reste % 60);

  return (
    <div className="flex items-center justify-between gap-3 min-h-[52px] rounded-[18px] border-2 border-encre bg-turquoise px-4 py-2 lg:min-h-[62px]" role="timer" aria-live="off">
      <span className="text-[14px] font-bold">-{Math.round(LANCEMENT.remise * 100)} % de lancement</span>
      <span className="text-[13px] font-bold tabular-nums">
        {j} j {deux(h)} h {deux(m)} min {deux(s)} s
      </span>
    </div>
  );
}
