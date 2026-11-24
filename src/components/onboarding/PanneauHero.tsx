/** Le panneau de droite de l'accroche, sur ordinateur : l'image du hero et trois étiquettes. */
const ETIQUETTES = [
  { texte: "Vidéo prête en 1 minute", fond: "bg-turquoise", angle: "-rotate-3" },
  { texte: "Format 9:16", fond: "bg-jaune", angle: "rotate-2" },
  { texte: "PS5 et Xbox", fond: "bg-rose", angle: "-rotate-1" },
];

export function PanneauHero() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center lg:flex">
      <div className="carte-forte w-full -rotate-[1.5deg] overflow-hidden rounded-3xl border-fond shadow-[0_10px_0_rgb(0_0_0/0.45)]">
        <img src="/visuels/hero-1672.jpg" width={1672} height={941} alt="" className="block h-auto w-full" />
      </div>
      <ul className="mt-12 flex flex-wrap justify-center gap-3.5" aria-label="En bref">
        {ETIQUETTES.map((e, i) => (
          <li key={e.texte} className="surgit" style={{ "--d": `${350 + i * 140}ms` } as React.CSSProperties}>
            <span className={`pastille px-5 py-2 text-[clamp(15px,1.3vw,22px)] shadow-[0_4px_0_rgb(0_0_0/0.45)] ${e.fond} ${e.angle}`}>{e.texte}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
