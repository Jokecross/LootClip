/*
 * Cadre des écrans « une colonne » (onboarding, connexion, tutoriel) sur ordinateur :
 * à gauche un grand panneau de marque avec l'image du hero, à droite l'écran centré.
 * Sur téléphone, il ne fait rien : l'écran garde sa mise en page d'origine.
 */
import Link from "next/link";
import { NON_AFFILIATION } from "@/lib/config";
import { Logo } from "./Logo";

const ETIQUETTES = [
  { texte: "Vidéo prête en 1 minute", fond: "bg-turquoise", angle: "-rotate-3" },
  { texte: "Format 9:16", fond: "bg-jaune", angle: "rotate-2" },
  { texte: "PS5 et Xbox", fond: "bg-rose", angle: "-rotate-1" },
];

/** `accroche` : false quand l'écran de droite affiche déjà la même phrase. */
export function CadreBureau({ children, accroche = true }: { children: React.ReactNode; accroche?: boolean }) {
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-hidden border-r-2 border-encre bg-encre px-12 py-10 text-fond lg:flex xl:px-16">
        <Link href="/" className="w-fit [&_.titre]:text-fond" aria-label="Retour à l'accueil">
          <Logo taille={36} />
        </Link>

        <div>
          <div className="carte-forte mx-auto w-full max-w-[560px] rotate-[-1.5deg] overflow-hidden border-fond shadow-[0_8px_0_rgb(0_0_0/0.45)]">
            <img
              src="/visuels/hero-900.jpg"
              srcSet="/visuels/hero-900.jpg 900w, /visuels/hero-1672.jpg 1672w"
              sizes="560px"
              width={1672}
              height={941}
              alt=""
              className="block h-auto w-full"
            />
          </div>
          {accroche && <p className="titre mt-12 max-w-[14ch] text-[52px] text-fond xl:text-[60px]">Ta manette peut devenir un salaire.</p>}
          <ul className={`flex flex-wrap gap-2.5 ${accroche ? "mt-7" : "mt-12"}`} aria-label="En bref">
            {ETIQUETTES.map((e) => (
              <li key={e.texte} className={`pastille px-3.5 py-1.5 text-[14px] text-encre shadow-[0_3px_0_rgb(0_0_0/0.45)] ${e.fond} ${e.angle}`}>
                {e.texte}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] text-fond/55">{NON_AFFILIATION}</p>
      </aside>

      <div className="lg:flex lg:items-center lg:justify-center lg:px-10 lg:py-12">{children}</div>
    </div>
  );
}
