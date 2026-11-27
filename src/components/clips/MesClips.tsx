"use client";
/* Les clips déjà faits, un bloc par vidéo d'origine (page « Mes clips »). */
import Link from "next/link";
import { useEffect, useState } from "react";
import { date } from "@/lib/format";
import { CarteClip } from "./CarteClip";

type Lot = { id: string; debut: number; etape: string; erreur: string | null; clips: { fichier: string; titre: string; score?: number; duree: number; url?: string }[] };

async function enTetes(): Promise<Record<string, string>> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}

const lienTelechargement = (c: Lot["clips"][number]) => (c.url?.startsWith("/") ? `${c.url}?telecharger` : `${c.url}&download=xpclip-${c.fichier}`);

export function MesClips({ vide }: { /** Affiché quand il n'y a encore aucun clip. */ vide?: React.ReactNode }) {
  const [lots, setLots] = useState<Lot[] | null>(null);
  useEffect(() => {
    (async () => {
      const rep = await fetch("/api/clips", { cache: "no-store", headers: await enTetes() }).catch(() => null);
      const d = rep?.ok ? ((await rep.json()) as { lots: Lot[] }) : { lots: [] };
      setLots(d.lots.filter((l) => l.clips.length || (!l.erreur && l.etape !== "fini")));
    })();
  }, []);

  if (lots === null)
    return (
      <div className="ap-vide mt-6" role="status">
        <span className="ap-roue" aria-label="Chargement" />
      </div>
    );
  if (!lots.length) return <>{vide}</>;
  return (
    <div className="ap-lots">
      {lots.map((l) => {
        const fini = l.etape === "fini";
        const meilleur = Math.max(0, ...l.clips.map((c) => c.score ?? 0));
        return (
          <section key={l.id} className="ap-carte ap-lot" aria-label={`Vidéo du ${l.debut ? date(new Date(l.debut).toISOString()) : ""}`}>
            <div className="ap-lot-tete">
              <h2 className="titre">{l.debut ? `Vidéo du ${date(new Date(l.debut).toISOString())}` : "Ta vidéo"}</h2>
              <span className={`ap-pastille ${fini ? "bg-turquoise" : "bg-jaune"}`}>{fini ? "Prêt" : "En cours"}</span>
              <span className="ap-pastille">
                {l.clips.length} clip{l.clips.length > 1 ? "s" : ""}
              </span>
              {meilleur > 0 && <span className="ap-pastille">Meilleur {meilleur}/100</span>}
            </div>
            <div className="ap-clips">
              {l.clips.map((c) => (
                <CarteClip key={c.fichier} url={c.url} titre={c.titre} score={c.score} duree={c.duree} telecharger={lienTelechargement(c)} />
              ))}
              {!fini && (
                <Link href="/app/creer" className="ap-clip-attente">
                  <span className="ap-roue" aria-hidden="true" />
                  <span>Clips en cours de montage</span>
                </Link>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
