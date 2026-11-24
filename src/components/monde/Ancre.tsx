"use client";
import { useEffect, useRef } from "react";
import { inscrire, type Donnees, type Entree, type Nom, type Pose } from "./store";

const RIEN: Pose = {};
const VIDE: Donnees = {};

/** La place d'un objet 3D dans la page. L'objet tient dans ce rectangle. */
export function Ancre({ nom, className = "", pose = RIEN, donnees = VIDE, style, children }: { nom: Nom; className?: string; pose?: Pose; donnees?: Donnees; style?: React.CSSProperties; children?: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const entree = useRef<Entree | null>(null);
  if (entree.current) {
    entree.current.pose = pose;
    entree.current.donnees = donnees;
  }
  useEffect(() => {
    entree.current = { el: ref.current!, nom, pose, donnees };
    return inscrire(entree.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nom]);
  return (
    <span ref={ref} className={`pointer-events-none block ${className}`} style={style} aria-hidden="true">
      {children}
    </span>
  );
}
