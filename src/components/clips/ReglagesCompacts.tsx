"use client";
/*
 * Les réglages des clips en un seul écran, sans aperçu ni défilement (téléphone et ordinateur).
 * Utilisé par le studio de tournage. Mêmes options que Reglages.tsx.
 */
import { COULEURS_SOUS_TITRES, DUREES_CLIP, FORMATS, NOMBRES_CLIPS, PLACEMENTS, TYPES_CLIP, type OptionsClips } from "@/lib/clips-options";

type Changer = (o: Partial<OptionsClips>) => void;

function Groupe({ titre, children, className = "" }: { titre: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="mb-1.5 text-[13px] font-extrabold lg:text-[14px]">{titre}</legend>
      {children}
    </fieldset>
  );
}

function Puce({ actif, onClick, children, className = "" }: { actif: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`flex min-h-12 min-w-0 shrink-0 items-center [@media(max-height:760px)]:min-h-10 justify-center rounded-xl border-2 border-encre px-1.5 text-center text-[13px] font-bold leading-tight transition-transform active:scale-95 lg:text-[14px] ${actif ? "bg-encre text-fond" : "bg-blanc"} ${className}`}
    >
      {children}
    </button>
  );
}

export function ReglagesCompacts({ options: o, changer }: { options: OptionsClips; changer: Changer }) {
  return (
    <div className="carte-forte grid w-full gap-3 bg-blanc p-3 sm:p-4 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-4 lg:p-6">
      <Groupe titre="Type de clips" className="lg:col-span-2">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {(Object.keys(TYPES_CLIP) as OptionsClips["type"][]).map((k) => (
            <Puce key={k} actif={o.type === k} onClick={() => changer({ type: k })} className="whitespace-nowrap px-3 lg:whitespace-normal lg:px-1.5">
              {TYPES_CLIP[k].nom}
            </Puce>
          ))}
        </div>
      </Groupe>

      <Groupe titre="Durée">
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(DUREES_CLIP) as OptionsClips["duree"][]).map((k) => (
            <Puce key={k} actif={o.duree === k} onClick={() => changer({ duree: k })} className="flex-col">
              <span>{DUREES_CLIP[k].nom}</span>
              <span className={`text-[11px] font-medium ${o.duree === k ? "text-fond/75" : "text-encre2"}`}>{DUREES_CLIP[k].detail}</span>
            </Puce>
          ))}
        </div>
      </Groupe>

      <Groupe titre="Format">
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(FORMATS) as OptionsClips["format"][]).map((k) => (
            <Puce key={k} actif={o.format === k} onClick={() => changer({ format: k })}>
              {FORMATS[k].nom}
            </Puce>
          ))}
        </div>
      </Groupe>

      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <Groupe titre="Nombre de clips">
          <div className="grid grid-cols-4 gap-1.5">
            {NOMBRES_CLIPS.map((n) => (
              <Puce key={n} actif={o.nombre === n} onClick={() => changer({ nombre: n })} className="text-[16px] font-extrabold">
                {n}
              </Puce>
            ))}
          </div>
        </Groupe>
        <Groupe titre="Accroche">
          <div className="grid grid-cols-2 gap-1.5">
            <Puce actif={o.accroche} onClick={() => changer({ accroche: true })}>
              Oui
            </Puce>
            <Puce actif={!o.accroche} onClick={() => changer({ accroche: false })}>
              Non
            </Puce>
          </div>
        </Groupe>
      </div>

      <Groupe titre="Place des sous-titres">
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(PLACEMENTS) as OptionsClips["placement"][]).map((k) => (
            <Puce key={k} actif={o.placement === k} onClick={() => changer({ placement: k })}>
              {k === "auto" ? "Auto" : PLACEMENTS[k].nom.replace(/^(En |Au )/, "").replace(/^./, (c) => c.toUpperCase())}
            </Puce>
          ))}
        </div>
      </Groupe>

      <Groupe titre="Couleur des sous-titres" className="lg:col-span-2">
        <div className="grid grid-cols-6 gap-1.5">
          {(Object.keys(COULEURS_SOUS_TITRES) as OptionsClips["couleur"][]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={o.couleur === k}
              aria-label={COULEURS_SOUS_TITRES[k].nom}
              onClick={() => changer({ couleur: k })}
              className={`min-h-12 rounded-xl border-2 border-encre text-[12px] [@media(max-height:760px)]:min-h-10 font-bold transition-transform active:scale-95 ${o.couleur === k ? "ring-[3px] ring-encre ring-offset-2" : ""}`}
              style={{ background: COULEURS_SOUS_TITRES[k].valeur || "var(--color-fond)" }}
            >
              {k === "aucun" ? "Sans" : k === "blanc" ? "Blanc" : ""}
            </button>
          ))}
        </div>
      </Groupe>
    </div>
  );
}
