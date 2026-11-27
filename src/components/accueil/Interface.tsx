"use client";
/*
 * L'interface d'XPclip, en vitrine sous le hero : la vidéo longue à gauche, les clips trouvés à droite.
 * Trois temps en boucle : analyse, moments repérés, clips prêts. Une seule vidéo joue à la fois.
 * Vidéos : la démo de demo.ts (vrais clips sortis du moteur).
 */
import { useEffect, useRef, useState } from "react";
import { Boucle } from "./Boucle";
import { DEMO } from "@/components/onboarding/demo";
import { SousTitres } from "./SousTitres";

const CLIPS = DEMO.clips.slice(0, 3);
const ETAPES = ["Vidéo récupérée", "Transcription", "Moments forts", "Montage 9:16"];
const TEMPS = [3400, 2400, 7000];
// Hauteurs fixes de la piste son (pas d'aléatoire : même rendu serveur et client)
const PISTE = Array.from({ length: 56 }, (_, i) => 22 + ((i * 41 + (i % 7) * 13) % 70));

export function Interface() {
  const [pas, setPas] = useState(0);
  const [vue, setVue] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const phase = pas % 3;
  const tour = Math.floor(pas / 3);
  const devant = tour % CLIPS.length;

  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVue(e.isIntersecting), { threshold: 0.15 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!vue) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setPas(2);
    const id = setTimeout(() => setPas((p) => p + 1), TEMPS[phase]);
    return () => clearTimeout(id);
  }, [pas, phase, vue]);

  const etapesFaites = phase === 0 ? 2 : phase === 1 ? 3 : 4;

  return (
    <div ref={boite} className="ui" data-phase={phase} aria-label="Aperçu de l'interface XPclip" role="img">
      <div className="ui-barre" aria-hidden="true">
        <span className="ui-points">
          <i />
          <i />
          <i />
        </span>
        <span className="ui-adresse">xpclip.com/app/creer</span>
        <span className="ui-statut">{phase === 2 ? "3 clips prêts" : phase === 1 ? "3 moments trouvés" : "Analyse en cours"}</span>
      </div>

      <div className="ui-corps" aria-hidden="true">
        {/* La vidéo longue */}
        <div className="ui-source">
          <div className="ui-lecteur">
            <Boucle nom={DEMO.avant} actif={phase !== 2 && vue} suivante />
            <span className="ui-plateforme">{DEMO.plateforme}</span>
            <span className="ui-temps">{DEMO.duree}</span>
          </div>
          <p className="ui-nom">{DEMO.titreVideo}</p>
          <div className="ui-frise">
            {PISTE.map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
            {CLIPS.map((c, i) => (
              <b key={c.nom} style={{ left: `${c.debut}%`, width: `${c.largeur}%`, "--i": i } as React.CSSProperties}>
                <span>{c.score}</span>
              </b>
            ))}
            <em className="ui-tete" />
          </div>
          <ol className="ui-etapes">
            {ETAPES.map((e, i) => (
              <li key={e} data-etat={i < etapesFaites ? "fait" : i === etapesFaites ? "encours" : "attente"}>
                <span className="ui-coche">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="currentColor" strokeWidth="3.400" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {e}
              </li>
            ))}
          </ol>
        </div>

        {/* Les clips trouvés */}
        <div className="ui-clips">
          <p className="ui-clips-titre">
            Tes clips <span>{phase === 2 ? 3 : 0}</span>
          </p>
          <ul>
            {CLIPS.map((c, i) => {
              const joue = phase === 2 && i === devant && vue;
              return (
                <li key={c.nom} className="ui-clip" style={{ "--i": i } as React.CSSProperties} data-actif={i === devant}>
                  <div className="ui-vignette">
                    {i === devant ? (
                      <>
                        <Boucle nom={c.nom} actif={joue} suivante />
                        {DEMO.sousTitresDessines && <SousTitres phrase={c.titre} joue={joue} place="bas" className="ui-st" />}
                      </>
                    ) : (
                      <img src={`/v4/${c.nom}.webp`} alt="" width={432} height={768} loading="lazy" />
                    )}
                  </div>
                  <div className="ui-infos">
                    <span className="ui-score">
                      <b>{c.score}</b>/100
                    </span>
                    <p>{c.titre}</p>
                    <span className="ui-duree">{c.duree} · 1080p</span>
                    <span className="ui-telecharger">Télécharger</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
