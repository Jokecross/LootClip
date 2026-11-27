"use client";
/*
 * Studio de tournage = une pub de 20 à 30 s, à filmer en enregistrement d'écran sur le téléphone.
 * Pas d'inscription ni de questions : l'accroche, le lien, l'IA qui trouve les moments, les clips,
 * les réglages en direct, l'objectif qui monte, la fin. Régie sur /studio (réservée à l'équipe).
 * Mode auto : tout défile seul. Un tap passe à la scène suivante. Appui long : retour à la régie.
 * Clips : ceux de la démo (components/onboarding/demo.ts). Rien n'est écrit dans un vrai compte.
 */
import "@/app/accueil.css";
import "./pub.css";
import { useEffect, useRef, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { SousTitres } from "@/components/accueil/SousTitres";
import { Logo } from "@/components/marque/Logo";
import { DEMO } from "@/components/onboarding/demo";
import { Confettis } from "@/components/studio/Confettis";
import { ecrireReglages, lireReglages, REGLAGES_DEFAUT, type Reglages } from "@/lib/studio";
import { poserTournage } from "@/lib/tournage";

const SCENES = [
  { cle: "accroche", nom: "L'accroche", duree: 2.8 },
  { cle: "lien", nom: "Le lien collé", duree: 3.4 },
  { cle: "analyse", nom: "L'IA trouve les moments", duree: 4 },
  { cle: "clips", nom: "Les clips sortent", duree: 8 },
  { cle: "style", nom: "À ta façon", duree: 4 },
  { cle: "objectif", nom: "L'objectif qui monte", duree: 3.8 },
  { cle: "fin", nom: "La fin", duree: 3.2 },
] as const;
type Scene = (typeof SCENES)[number]["cle"];

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

/** `direct` : xpclip.com sur l'appareil qui filme, la pub démarre sans passer par la régie. */
export function PubStudio({ direct = false }: { direct?: boolean }) {
  const [regl, setRegl] = useState<Reglages>(REGLAGES_DEFAUT);
  const [scene, setScene] = useState<Scene | "regie">(direct ? "accroche" : "regie");
  const [prise, setPrise] = useState(0);
  const appui = useRef<ReturnType<typeof setTimeout>>(undefined);
  const long = useRef(false);

  useEffect(() => setRegl(lireReglages()), []);
  useEffect(() => poserTournage(regl.tournage), [regl.tournage]);

  const gardees = SCENES.filter((s) => !regl.scenes?.length || regl.scenes.includes(s.cle));
  const vitesse = regl.vitesse || 1;
  const i = gardees.findIndex((s) => s.cle === scene);
  const suivante = () => {
    if (i < 0) return;
    if (i < gardees.length - 1) setScene(gardees[i + 1].cle);
  };
  const regler = (x: Partial<Reglages>) => {
    const n = { ...regl, ...x };
    setRegl(n);
    ecrireReglages(n);
  };

  // Mode auto : chaque scène dure son temps, la dernière reste.
  useEffect(() => {
    if (scene === "regie" || regl.auto === false || i < 0 || i >= gardees.length - 1) return;
    const id = setTimeout(suivante, gardees[i].duree * 1000 * vitesse);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, prise, regl.auto, vitesse]);

  if (scene === "regie") return <Regie regl={regl} regler={regler} gardees={gardees.length} lancer={() => (setPrise((p) => p + 1), setScene(gardees[0].cle))} />;

  const lien = regl.lien?.trim() || DEMO.lien;
  const objectif = regl.objectif || 500;
  return (
    <main
      className="v4 pub"
      onPointerDown={() => {
        long.current = false;
        appui.current = setTimeout(() => {
          long.current = true;
          setScene("regie");
        }, 1100);
      }}
      onPointerUp={() => {
        clearTimeout(appui.current);
        if (!long.current) suivante();
      }}
      onPointerLeave={() => clearTimeout(appui.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div key={`${scene}-${prise}`} className="pub-scene">
        {scene === "accroche" && <Accroche />}
        {scene === "lien" && <Lien lien={lien} />}
        {scene === "analyse" && <Analyse duree={4 * vitesse} />}
        {scene === "clips" && <Clips duree={8 * vitesse} />}
        {scene === "style" && <Style />}
        {scene === "objectif" && <Objectif montant={objectif} />}
        {scene === "fin" && <Fin />}
      </div>
    </main>
  );
}

/* ---------- La régie ---------- */
function Regie({ regl, regler, gardees, lancer }: { regl: Reglages; regler: (x: Partial<Reglages>) => void; gardees: number; lancer: () => void }) {
  const choisies = regl.scenes?.length ? regl.scenes : SCENES.map((s) => s.cle);
  const total = SCENES.filter((s) => choisies.includes(s.cle)).reduce((t, s) => t + s.duree, 0) * (regl.vitesse || 1);
  return (
    <main className="v4 pub-regie">
      <div className="pub-regie-tete">
        <Logo taille={30} />
        <span className="pub-pastille">Studio de tournage</span>
      </div>
      <h1 className="titre">Prêt à filmer ?</h1>
      <p className="pub-gris">Personne ne voit cette page. Lance l&apos;enregistrement d&apos;écran, puis « Lancer la pub ».</p>

      <section className="pub-carte">
        <p className="pub-label">Scènes ({gardees} · environ {Math.round(total)} s)</p>
        {SCENES.map((s) => {
          const oui = choisies.includes(s.cle);
          return (
            <label key={s.cle} className="pub-ligne">
              <span>
                {s.nom} <small>{s.duree} s</small>
              </span>
              <input
                type="checkbox"
                checked={oui}
                onChange={() => {
                  const l = oui ? choisies.filter((x) => x !== s.cle) : [...choisies, s.cle];
                  regler({ scenes: l.length ? l : [s.cle] });
                }}
              />
            </label>
          );
        })}
      </section>

      <section className="pub-carte">
        <label className="pub-ligne">
          <span>Défilement automatique</span>
          <input type="checkbox" checked={regl.auto !== false} onChange={(e) => regler({ auto: e.target.checked })} />
        </label>
        <p className="pub-label mt-2">Vitesse</p>
        <div className="pub-choix">
          {[
            [0.8, "Rapide"],
            [1, "Normale"],
            [1.3, "Lente"],
          ].map(([v, nom]) => (
            <button key={nom} type="button" aria-pressed={(regl.vitesse || 1) === v} onClick={() => regler({ vitesse: v as number })}>
              {nom}
            </button>
          ))}
        </div>
        <label className="pub-champ">
          Lien qui se colle
          <input placeholder={DEMO.lien} value={regl.lien ?? ""} onChange={(e) => regler({ lien: e.target.value })} />
        </label>
        <label className="pub-champ">
          Objectif affiché (€ par mois)
          <input inputMode="numeric" value={String(regl.objectif || 500)} onChange={(e) => regler({ objectif: Math.min(99999, Number(e.target.value.replace(/\D/g, "")) || 0) })} />
        </label>
        <label className="pub-ligne">
          <span>Taper xpclip.com lance la pub sur ce téléphone</span>
          <input type="checkbox" checked={regl.tournage} onChange={(e) => regler({ tournage: e.target.checked })} />
        </label>
      </section>

      <p className="pub-gris">Pendant la pub : un tap passe à la scène suivante, un appui long revient ici.</p>
      <button type="button" className="bouton bouton-rose w-full" onClick={lancer}>
        Lancer la pub
      </button>
    </main>
  );
}

/* ---------- Les scènes ---------- */
function Accroche() {
  return (
    <div className="pub-accroche">
      <p className="pub-pastille">Clips GTA avec l&apos;IA</p>
      <h1 className="titre">
        <span className="pub-petit">Tout le monde regarde GTA.</span>
        <span className="pub-gros">
          Encaisse sur <br />
          leurs vues.
        </span>
      </h1>
      <div className="pub-eventail">
        {DEMO.clips.slice(0, 3).map((c, i) => (
          <div key={c.nom} className="pub-tel" style={{ "--i": i } as React.CSSProperties}>
            {i === 1 ? <Boucle nom={c.nom} /> : <img src={`/v4/${c.nom}.webp`} alt="" width={432} height={768} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Lien({ lien }: { lien: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= lien.length) return;
    const id = setTimeout(() => setN((x) => x + 1), 900 / lien.length);
    return () => clearTimeout(id);
  }, [n, lien.length]);
  const fini = n >= lien.length;
  return (
    <div className="pub-centre">
      <h2 className="titre pub-titre">Colle le lien.</h2>
      <div className="pub-champ-lien" data-fini={fini}>
        <span>https://{lien.slice(0, n)}</span>
        <b>{fini ? "OK" : "Go"}</b>
      </div>
      {fini && (
        <div className="pub-video">
          <img src={`/v4/${DEMO.avant}.webp`} alt="" width={800} height={450} />
          <span className="pub-video-plateforme">{DEMO.plateforme}</span>
          <span className="pub-video-duree">{DEMO.duree}</span>
          <p>{DEMO.titreVideo ?? "Ta vidéo"}</p>
        </div>
      )}
    </div>
  );
}

const PISTE = Array.from({ length: 46 }, (_, i) => 18 + ((i * 41 + (i % 7) * 13) % 74));
function Analyse({ duree }: { duree: number }) {
  return (
    <div className="pub-centre" style={{ "--d": `${duree}s` } as React.CSSProperties}>
      <h2 className="titre pub-titre">
        L&apos;IA regarde <span className="pub-surligne">tout.</span>
      </h2>
      <div className="pub-frise">
        {PISTE.map((h, k) => (
          <i key={k} style={{ height: `${h}%` }} />
        ))}
        {DEMO.clips.slice(0, 3).map((c, k) => (
          <b key={c.nom} style={{ left: `${Math.min(88, c.debut)}%`, "--k": k } as React.CSSProperties}>
            <span>{c.score}</span>
          </b>
        ))}
        <em />
      </div>
      <p className="pub-compte">
        <span>3</span> moments forts trouvés
      </p>
    </div>
  );
}

function Clips({ duree }: { duree: number }) {
  const clips = DEMO.clips.slice(0, 3);
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setK((x) => Math.min(clips.length - 1, x + 1)), (duree * 1000) / clips.length);
    return () => clearInterval(id);
  }, [duree, clips.length]);
  const c = clips[k];
  return (
    <div className="pub-clips">
      <div key={c.nom} className="pub-plein">
        <Boucle nom={c.nom} />
        <span className="pub-note">
          <b>{c.score}</b>/100
        </span>
        <span className="pub-num">
          Clip {k + 1} / {DEMO.clips.length}
        </span>
      </div>
    </div>
  );
}

const COULEURS = ["var(--color-jaune)", "var(--color-rose)", "var(--color-turquoise)", "var(--color-orange)"];
function Style() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setK((x) => (x + 1) % COULEURS.length), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pub-centre">
      <h2 className="titre pub-titre">
        À ta <span className="pub-surligne">façon.</span>
      </h2>
      <div className="pub-apercu">
        <Boucle nom="demo/reg-m1-auto" />
        <SousTitres phrase="Le passage que tout le monde va partager" couleur={COULEURS[k]} place="bas" />
      </div>
      <div className="pub-pastilles">
        {COULEURS.map((c, j) => (
          <span key={c} data-actif={j === k} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function Objectif({ montant }: { montant: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const debut = performance.now();
    let id = 0;
    const tic = () => {
      const t = Math.min(1, (performance.now() - debut) / 2200);
      setV(Math.round(montant * (1 - Math.pow(1 - t, 3))));
      if (t < 1) id = requestAnimationFrame(tic);
    };
    id = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(id);
  }, [montant]);
  return (
    <div className="pub-centre">
      <h2 className="titre pub-titre">Poste. Vise plus haut.</h2>
      <div className="pub-objectif">
        <p>Ton objectif</p>
        <b className="titre">{fmt(v)} €</b>
        <span>par mois</span>
      </div>
      <p className="pub-mention">Objectif, pas un gain garanti. Tout dépend de tes vues.</p>
    </div>
  );
}

function Fin() {
  return (
    <div className="pub-centre pub-fin">
      <Confettis />
      <Logo taille={64} />
      <h2 className="titre pub-titre">Ton premier clip en un lien.</h2>
      <span className="pub-site titre">xpclip.com</span>
      <span className="bouton bouton-rose pub-bouton">Créer mon premier clip</span>
    </div>
  );
}
