"use client";
/*
 * Les réglages des clips, avec un aperçu qui change en direct :
 * type de clip, durée, nombre, format, couleur et placement des sous-titres, accroche.
 */
import { COULEURS_SOUS_TITRES, DUREES_CLIP, FORMATS, NOMBRES_CLIPS, PLACEMENTS, TYPES_CLIP, type OptionsClips } from "@/lib/clips-options";

type Changer = (o: Partial<OptionsClips>) => void;

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-[14px] font-extrabold">{titre}</legend>
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
      className={`min-h-12 rounded-xl border-2 border-encre px-3 text-[14px] font-bold transition-transform active:scale-95 ${actif ? "bg-encre text-fond" : "bg-blanc"} ${className}`}
    >
      {children}
    </button>
  );
}

/** Le téléphone d'aperçu : une vidéo de démonstration, habillée avec les réglages choisis. */
function Apercu({ o }: { o: OptionsClips }) {
  const couleur = COULEURS_SOUS_TITRES[o.couleur].valeur;
  const haut = o.placement === "haut" ? "18%" : o.placement === "milieu" ? "50%" : o.placement === "bas" ? "70%" : o.format === "flou" ? "72%" : "64%";
  const accrocheEnBas = o.placement === "haut";
  return (
    <div className="mx-auto w-[168px] shrink-0 lg:w-[220px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border-[3px] border-encre bg-encre shadow-[4px_5px_0_var(--color-encre)]">
        {o.format === "flou" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/v4/clips/brut-defi.webp" alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-md" />
        )}
        <video
          src="/v4/clips/brut-defi.mp4"
          poster="/v4/clips/brut-defi.webp"
          muted
          autoPlay
          loop
          playsInline
          className={`absolute inset-0 h-full w-full ${o.format === "flou" ? "object-contain" : "object-cover"}`}
        />
        {o.accroche && (
          <span
            className="absolute left-1/2 w-[78%] -translate-x-1/2 -rotate-2 rounded-lg border-2 border-encre bg-jaune px-2 py-1 text-center text-[11px] font-extrabold leading-tight text-encre shadow-[0_3px_0_var(--color-encre)] lg:text-[13px]"
            style={{ top: accrocheEnBas ? "80%" : "10%" }}
          >
            Le moment le plus fou
          </span>
        )}
        {o.couleur !== "aucun" && (
          <p
            className="absolute inset-x-2 -translate-y-1/2 text-center text-[17px] font-extrabold uppercase leading-none tracking-tight text-blanc lg:text-[21px]"
            style={{ top: haut, fontFamily: "var(--font-titre, inherit)", WebkitTextStroke: "5px var(--color-encre)", paintOrder: "stroke fill" }}
          >
            Il a <span style={{ color: couleur }}>vraiment</span> fait ça
          </p>
        )}
      </div>
      <p className="mt-2 text-center text-[12px] font-bold text-encre2">Aperçu</p>
    </div>
  );
}

export function Reglages({ options: o, changer }: { options: OptionsClips; changer: Changer }) {
  return (
    <div className="carte-forte flex flex-col gap-5 bg-blanc p-4 sm:p-5 lg:flex-row lg:gap-7">
      <div className="lg:sticky lg:top-4 lg:self-start">
        <Apercu o={o} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Groupe titre="Type de clips">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(TYPES_CLIP) as OptionsClips["type"][]).map((k) => (
              <Puce key={k} actif={o.type === k} onClick={() => changer({ type: k })} className="flex flex-col items-start justify-center py-2 text-left">
                <span>{TYPES_CLIP[k].nom}</span>
                <span className={`text-[11px] font-medium leading-tight ${o.type === k ? "text-fond/80" : "text-encre2"}`}>{TYPES_CLIP[k].detail}</span>
              </Puce>
            ))}
          </div>
        </Groupe>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Groupe titre="Durée">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DUREES_CLIP) as OptionsClips["duree"][]).map((k) => (
                <Puce key={k} actif={o.duree === k} onClick={() => changer({ duree: k })} className="flex flex-col items-center justify-center px-1 py-1.5">
                  <span>{DUREES_CLIP[k].nom}</span>
                  <span className={`whitespace-nowrap text-[11px] font-medium ${o.duree === k ? "text-fond/80" : "text-encre2"}`}>{DUREES_CLIP[k].detail}</span>
                </Puce>
              ))}
            </div>
          </Groupe>
          <Groupe titre="Nombre de clips">
            <div className="grid grid-cols-4 gap-2">
              {NOMBRES_CLIPS.map((n) => (
                <Puce key={n} actif={o.nombre === n} onClick={() => changer({ nombre: n })} className="text-[17px] font-extrabold">
                  {n}
                </Puce>
              ))}
            </div>
          </Groupe>
        </div>

        <Groupe titre="Format">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FORMATS) as OptionsClips["format"][]).map((k) => (
              <Puce key={k} actif={o.format === k} onClick={() => changer({ format: k })}>
                {FORMATS[k].nom}
              </Puce>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-encre2">{FORMATS[o.format].detail}</p>
        </Groupe>

        <Groupe titre="Couleur des sous-titres">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(COULEURS_SOUS_TITRES) as OptionsClips["couleur"][]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={o.couleur === k}
                aria-label={COULEURS_SOUS_TITRES[k].nom}
                onClick={() => changer({ couleur: k })}
                className={`flex h-12 min-w-12 items-center justify-center rounded-xl border-2 border-encre px-3 text-[13px] font-bold transition-transform active:scale-95 ${o.couleur === k ? "ring-[3px] ring-encre ring-offset-2" : ""}`}
                style={{ background: COULEURS_SOUS_TITRES[k].valeur || "var(--color-fond)" }}
              >
                {k === "aucun" ? "Sans" : k === "blanc" ? "Blanc" : ""}
              </button>
            ))}
          </div>
        </Groupe>

        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <Groupe titre="Place des sous-titres">
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PLACEMENTS) as OptionsClips["placement"][]).map((k) => (
                <Puce key={k} actif={o.placement === k} onClick={() => changer({ placement: k })} className="px-1 text-[13px]">
                  {PLACEMENTS[k].nom}
                </Puce>
              ))}
            </div>
          </Groupe>
          <Groupe titre="Accroche écrite">
            <div className="grid grid-cols-2 gap-2">
              <Puce actif={o.accroche} onClick={() => changer({ accroche: true })}>
                Oui
              </Puce>
              <Puce actif={!o.accroche} onClick={() => changer({ accroche: false })}>
                Non
              </Puce>
            </div>
          </Groupe>
        </div>
      </div>
    </div>
  );
}
