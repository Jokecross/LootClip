"use client";
/*
 * Le montage mis en scène : les clips du joueur défilent et se coupent dans un cadre 9:16, image entière sur fond flouté comme le vrai rendu.
 * La durée est raccourcie (réglage du studio), d'où la mention « Séquence accélérée ».
 */
import { useEffect, useRef, useState } from "react";
import { Ancre } from "@/components/monde/Ancre";
import { eclats, type Donnees } from "@/components/monde/store";
import { Duo } from "@/components/ui/Duo";
import { Coche } from "@/components/ui/Parcours";
import { ETAPES } from "@/lib/montage";
import { bravo, coupe, cran, pop } from "@/lib/sons";

const MORCEAUX = 14;
const COULEURS = ["bg-rose", "bg-jaune", "bg-turquoise", "bg-orange"];

export function Montage({ entete, urls, titre, secondes, fini }: { entete: React.ReactNode; urls: string[]; titre: string; secondes: number; fini: () => void }) {
  const clips = useRef<(HTMLVideoElement | null)[]>([]);
  // Lus par le moteur 3D à chaque image : l'écran du téléphone et les clips qui y volent.
  const [ecran] = useState<Donnees>({ source: null, titre: "" });
  const [cartes] = useState<Donnees[]>(() => [0, 1, 2].map((i) => ({ flux: { de: "clip3", vers: "telephone", delai: i * 0.5, duree: 1.5 } })));
  const titreRef = useRef(titre);
  titreRef.current = titre;
  const cadre = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  const fin = useRef(fini);
  fin.current = fini;

  useEffect(() => {
    const t0 = performance.now();
    let image = 0;
    let arrete = false;
    let actif = 0;
    let prochaine = 0;
    let morceau = 0;
    let dernierK = -1;
    let derniereEtape = 0;
    const n = Math.min(urls.length, 5);
    clips.current.slice(0, n).forEach((v) => v?.play().catch(() => {}));

    const tic = (t: number) => {
      if (arrete) return;
      const x = Math.min(1, (t - t0) / (secondes * 1000));
      // Les coupes accélèrent vers la fin.
      if (n && t - t0 > prochaine && x < 0.97) {
        prochaine = t - t0 + 620 - x * 430;
        actif = (actif + 1) % n;
        const v = clips.current[actif];
        if (v) {
          const d = v.duration;
          if (Number.isFinite(d) && d > 1) v.currentTime = Math.random() * (d - 0.8);
          if (v.paused) v.play().catch(() => {});
        }
        coupe();
        cadre.current?.animate([{ transform: "scale(1.03) rotate(1.1deg)" }, { transform: "none" }], { duration: 200, easing: "ease-out" });
      }
      const v = clips.current[actif];
      if (v && v.readyState >= 2) ecran.source = v;
      ecran.titre = x > 0.48 ? titreRef.current : "";
      clips.current.slice(0, n).forEach((c, i) => {
        if (c && cartes[i]) cartes[i].source = c;
      });
      const m = Math.min(MORCEAUX, Math.floor(x * MORCEAUX * 1.02));
      if (m !== morceau) {
        morceau = m;
        pop(m / MORCEAUX);
      }
      const etapeIci = Math.floor(x * ETAPES.length);
      if (etapeIci !== derniereEtape) {
        derniereEtape = etapeIci;
        const r = cadre.current?.getBoundingClientRect();
        if (r && x > 0.05) eclats(r.left + r.width / 2, r.top + r.height / 2, 16);
      }
      const p = Math.round(x * 100);
      if (p !== dernierK) {
        dernierK = p;
        if (p % 2) cran(x);
        setK(p);
      }
      if (x < 1) image = requestAnimationFrame(tic);
      else {
        bravo();
        setTimeout(() => !arrete && fin.current(), 450);
      }
    };
    image = requestAnimationFrame(tic);
    return () => {
      arrete = true;
      cancelAnimationFrame(image);
    };
  }, [urls, secondes, ecran, cartes]);

  const etape = Math.min(ETAPES.length - 1, Math.floor((k / 100) * ETAPES.length));
  const poses = Math.min(MORCEAUX, Math.floor((k / 100) * MORCEAUX * 1.02));

  return (
    <Duo
      cle="montage"
      entete={entete}
      fond="orange"
      large
      gauche={
        <>
          {/* Les clips tournent cachés : seul leur dessin est affiché */}
          <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-[0.01]" aria-hidden="true">
            {urls.slice(0, 5).map((u, i) => (
              <video key={u} ref={(v) => { clips.current[i] = v; }} src={u} muted playsInline loop autoPlay preload="auto" />
            ))}
          </div>

          <div className="flex w-full items-end justify-between gap-3">
            <p key={etape} className="surgit titre text-[22px] leading-[1.05] lg:hidden">{ETAPES[etape]}</p>
            <p className="titre shrink-0 text-[46px] tabular-nums lg:text-[clamp(110px,min(12vw,24vh),260px)] lg:leading-[0.8]">{k}&nbsp;%</p>
          </div>
          <ol className="mt-8 hidden flex-col gap-4 lg:flex">
            {ETAPES.map((e, i) => (
              <li key={e} className={`flex items-center gap-4 text-[clamp(18px,1.5vw,26px)] font-bold transition-opacity duration-300 ${i > etape ? "opacity-30" : ""}`}>
                {i < etape || k === 100 ? <Coche className="h-8 w-8 shrink-0" /> : <span className={`h-8 w-8 shrink-0 rounded-full border-2 border-encre ${i === etape ? "clignote bg-rose" : ""}`} />}
                {e}
              </li>
            ))}
          </ol>
        </>
      }
      droite={
        <>
          <div ref={cadre} className="relative min-h-[260px] w-full flex-1 lg:min-h-0">
            <Ancre nom="clip4" className="absolute left-[-2%] top-[40%] h-[22%] w-[32%]" pose={{ ry: 0.5, rz: 0.12, flotte: 5, z: -60 }} donnees={ecran} />
            <Ancre nom="clip3" className="absolute left-[2%] top-[30%] h-[22%] w-[32%]" pose={{ ry: 0.45, rz: 0.05, flotte: 6, z: -20 }} donnees={ecran} />
            {cartes.map((c, i) => (
              <Ancre key={i} nom={`clip${i}` as "clip0"} className="absolute left-[2%] top-[34%] h-[20%] w-[30%]" pose={{ z: 240 }} donnees={c} />
            ))}
            <Ancre nom="telephone" className="absolute inset-y-[1%] left-[30%] right-[4%]" pose={{ ry: -0.22, rz: 0.03, flotte: 4, z: 40 }} donnees={ecran} />
            {k > 78 && <span className="surgit pastille absolute bottom-[8%] right-[6%] z-20 bg-turquoise lg:min-h-12 lg:px-5 lg:text-[20px]">1080 × 1920</span>}
          </div>

          <div className="carte relative z-20 mt-3 flex h-12 w-full items-stretch gap-[3px] p-1.5 lg:mt-[min(24px,3vh)] lg:h-[min(84px,10vh)] lg:gap-1.5 lg:p-2" role="progressbar" aria-valuenow={k} aria-label="Avancement du montage">
            {Array.from({ length: MORCEAUX }, (_, i) =>
              i < poses ? <span key={i} className={`surgit rounded-[5px] border-2 border-encre lg:rounded-lg ${COULEURS[i % 4]}`} style={{ flex: [2, 1, 3, 1, 2, 2, 1][i % 7] }} /> : <span key={i} className="rounded-[5px] bg-beige lg:rounded-lg" style={{ flex: [2, 1, 3, 1, 2, 2, 1][i % 7] }} />,
            )}
          </div>
          <p className="mt-2 text-center text-[11px] font-medium lg:text-[14px]">Séquence accélérée</p>
        </>
      }
    />
  );
}
