"use client";
/*
 * xpclip.com sur l'appareil qui filme : le premier écran s'affiche tout de suite, sans page blanche.
 * Le droit est vérifié derrière : sans compte de l'équipe, le vrai site revient.
 */
import { useEffect } from "react";
import { PlateauClips as Plateau } from "@/components/studio/PlateauClips";
import { droitStudio, poserTournage } from "@/lib/tournage";

export default function Tournage() {
  useEffect(() => {
    droitStudio().then((d) => {
      if (d !== false) return;
      poserTournage(false);
      location.replace("/");
    });
  }, []);
  return <Plateau direct />;
}
