/*
 * Les objets illustrés du site : des images fixes (public/objets), posées dans la page.
 * Elles tiennent dans la case donnée par className et ne bougent pas toutes seules.
 */
export type NomObjet = "manette" | "manette2" | "telephone" | "abonnes" | "vide" | "non" | "clip-a" | "clip-b" | "cadenas" | "pieces-1" | "pieces-2" | "pieces-3" | "pieces-4";

const TAILLES: Record<NomObjet, [number, number]> = {
  manette: [720, 443],
  manette2: [720, 443],
  telephone: [764, 1300],
  abonnes: [534, 900],
  vide: [546, 900],
  non: [534, 900],
  "clip-a": [640, 423],
  "clip-b": [640, 419],
  cadenas: [355, 420],
  "pieces-1": [700, 131],
  "pieces-2": [700, 183],
  "pieces-3": [700, 240],
  "pieces-4": [700, 346],
};

export function Objet({ nom, className = "", bas = false, plusTard = false }: { nom: NomObjet; className?: string; /** Posé au bas de sa case. */ bas?: boolean; /** Chargé quand il approche de l'écran. */ plusTard?: boolean }) {
  const [l, h] = TAILLES[nom];
  return (
    <span className={`pointer-events-none block ${className}`} aria-hidden="true">
      <img src={`/objets/${nom}.webp`} width={l} height={h} alt="" draggable={false} loading={plusTard ? "lazy" : "eager"} decoding={plusTard ? "async" : "sync"} className={`block h-full w-full select-none object-contain ${bas ? "object-bottom" : ""}`} />
    </span>
  );
}

/** De 0 à 1 : plus c'est grand, plus il y a de pièces. Toutes les tailles sont posées d'avance, rien ne clignote. */
export function Pieces({ part, className = "" }: { part: number; className?: string }) {
  const niveau = Math.min(4, Math.max(1, Math.ceil(part * 4)));
  return (
    <span className={`pointer-events-none block ${className.includes("absolute") ? "" : "relative"} ${className}`} aria-hidden="true">
      <span className="absolute inset-0 block">
        {([1, 2, 3, 4] as const).map((n) => {
          const [l, h] = TAILLES[`pieces-${n}`];
          return (
            <img key={n} src={`/objets/pieces-${n}.webp`} width={l} height={h} alt="" draggable={false} decoding="sync" className={`absolute inset-0 h-full w-full select-none object-contain object-bottom ${n === niveau ? "" : "opacity-0"}`} />
          );
        })}
      </span>
    </span>
  );
}

/** À l'entrée d'un parcours : les images des écrans suivants sont déjà là quand on y arrive. */
export function precharger() {
  for (const n of Object.keys(TAILLES)) new Image().src = `/objets/${n}.webp`;
}
