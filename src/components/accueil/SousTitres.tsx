"use client";
/*
 * Sous-titres « mot à mot », dessinés en HTML par-dessus une vidéo de l'accueil.
 * Même style que le moteur : capitales Bricolage, contour encre, mot prononcé en couleur.
 * Seul le texte change : aucune animation coûteuse.
 */
import { useEffect, useMemo, useRef, useState } from "react";

const PAS_MS = 360;

/** Coupe la phrase en groupes de 3 mots au plus, comme le moteur. */
function grouper(phrase: string) {
  const mots = phrase.trim().toUpperCase().split(/\s+/);
  const groupes: string[][] = [];
  for (let i = 0; i < mots.length; i += 3) groupes.push(mots.slice(i, i + 3));
  return groupes;
}

export function SousTitres({
  phrase,
  couleur = "var(--color-jaune)",
  place = "bas",
  joue = true,
  className = "",
}: {
  phrase: string;
  /** Couleur du mot prononcé. */
  couleur?: string;
  place?: "haut" | "milieu" | "bas";
  /** Faux : le premier groupe reste affiché, sans défiler. */
  joue?: boolean;
  className?: string;
}) {
  const groupes = useMemo(() => grouper(phrase), [phrase]);
  const total = groupes.reduce((s, g) => s + g.length, 0);
  const [n, setN] = useState(0);
  const [vu, setVu] = useState(false);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => setN(0), [phrase]);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVu(e.isIntersecting), { threshold: 0.2 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!joue || !vu || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Petite pause en fin de phrase avant de reprendre
    const id = setTimeout(() => setN((x) => (x + 1) % (total + 2)), PAS_MS);
    return () => clearTimeout(id);
  }, [n, joue, vu, total]);

  // Quel groupe, quel mot actif
  let reste = Math.min(n, total - 1);
  let g = 0;
  while (g < groupes.length - 1 && reste >= groupes[g].length) {
    reste -= groupes[g].length;
    g++;
  }
  return (
    <div ref={boite} className={`st st-${place} ${className}`} aria-hidden="true">
      <p key={g} className="st-groupe">
        {groupes[g].map((m, i) => (
          <span key={i} style={i === reste ? { color: couleur } : undefined}>
            {m}
          </span>
        ))}
      </p>
    </div>
  );
}
