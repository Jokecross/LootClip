"use client";
/* Les vidéos qu'il reste ce mois-ci. Le robot se tient dessus, sur ordinateur. */
import Link from "next/link";
import { useEtat } from "@/lib/etat";
import { quota } from "@/lib/montage";

export function Quota() {
  const etat = useEtat();
  const q = quota(etat);
  if (!q.total) return null;
  return (
    <Link href="/app/compte" className="bloc hidden bg-blanc px-7 py-6 lg:block">
      <span className="block text-[16px] font-bold text-encre2">Ce mois-ci</span>
      <span className="titre mt-1 block text-[30px] tabular-nums">
        {q.restant} clip{q.restant > 1 ? "s" : ""} restant{q.restant > 1 ? "s" : ""}
      </span>
      <span className="barre mt-4 block" aria-hidden="true">
        <span style={{ width: `${Math.max(4, (q.restant / q.total) * 100)}%` }} />
      </span>
    </Link>
  );
}
