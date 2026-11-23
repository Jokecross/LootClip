/*
 * Illustration de XPclip : un coucher de soleil en aplats (orange, soleil jaune, sol rose),
 * un téléphone avec une vidéo prête, et trois étiquettes. Emplacement d'image remplaçable.
 */
type Etiquette = { texte: string; fond: string; ou: string; angle: number };

export function Scene({ etiquettes, className = "" }: { etiquettes: [Etiquette, Etiquette, Etiquette]; className?: string }) {
  return (
    <div className={`carte-forte relative aspect-[4/3] overflow-hidden bg-orange ${className}`} role="img" aria-label="Un téléphone affiche une vidéo prête, devant un coucher de soleil">
      <div className="absolute bottom-[26%] left-1/2 aspect-square w-[62%] -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-encre bg-jaune" />
      <div className="absolute inset-x-0 bottom-0 h-[26%] border-t-2 border-encre bg-rose" />
      <div className="absolute left-1/2 top-[13%] flex aspect-[9/14] w-[30%] -translate-x-1/2 items-center justify-center rounded-[18px] border-2 border-encre bg-encre shadow-[6px_6px_0_rgb(26_11_46/0.35)]">
        <span className="grid aspect-square w-[42%] place-items-center rounded-full bg-fond">
          <svg viewBox="0 0 24 24" className="ml-[8%] w-[46%]" fill="#1A0B2E" aria-hidden="true">
            <path d="M7 4.5v15l12-7.5z" />
          </svg>
        </span>
      </div>
      {etiquettes.map((e) => (
        <span key={e.texte} className={`pastille absolute px-3 text-[12px] ${e.fond} ${e.ou}`} style={{ transform: `rotate(${e.angle}deg)` }}>
          {e.texte}
        </span>
      ))}
    </div>
  );
}
