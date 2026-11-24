/*
 * Les écrans de l'onboarding et du studio.
 * Téléphone : une colonne, bouton en bas (gauche, puis droite, puis action).
 * Ordinateur : tout l'écran. À gauche la question et le bouton, à droite un grand panneau de couleur.
 */
import { Logo } from "@/components/marque/Logo";

export function Duo({
  cle,
  entete,
  gauche,
  droite,
  action,
  pied,
  fond = "",
  marque = false,
}: {
  /** Change à chaque écran : relance l'animation d'entrée. */
  cle: string | number;
  entete: React.ReactNode;
  gauche: React.ReactNode;
  droite: React.ReactNode;
  action?: React.ReactNode;
  pied?: React.ReactNode;
  /** Couleur du panneau sur ordinateur. Vide : le contenu remplit lui-même le panneau. */
  fond?: string;
  /** Affiche le logo à côté de la progression, sur ordinateur. */
  marque?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-x-clip px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] lg:grid lg:min-h-[max(100dvh,620px)] lg:max-w-[1800px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:grid-rows-[auto_minmax(16px,1fr)_auto_auto_minmax(32px,1fr)] lg:gap-x-[4vw] lg:py-[min(28px,3vh)] lg:pl-[4vw] lg:pr-7">
      <div className="lg:col-start-1 lg:row-start-1 lg:flex lg:items-center lg:gap-6">
        {marque && (
          <span className="hidden lg:block">
            <Logo taille={34} />
          </span>
        )}
        <div className="lg:min-w-0 lg:flex-1">{entete}</div>
      </div>
      <div key={cle} className="entree mt-5 flex flex-1 flex-col lg:contents">
        <div className="contents lg:col-start-1 lg:row-start-3 lg:flex lg:min-w-0 lg:flex-col lg:[animation:entree_380ms_cubic-bezier(0.2,0.8,0.2,1)_both]">{gauche}</div>
        <div
          className={`contents lg:relative lg:col-start-2 lg:row-span-full lg:row-start-1 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col lg:[animation:panneau_420ms_cubic-bezier(0.2,0.8,0.2,1)_both] ${
            fond ? `lg:overflow-hidden lg:rounded-[32px] lg:border-2 lg:border-encre lg:p-[clamp(24px,2.6vw,48px)] lg:shadow-[0_8px_0_var(--color-encre)] ${fond}` : ""
          } lg:mb-2`}
        >
          {droite}
        </div>
      </div>
      {action && <div className="pt-6 lg:col-start-1 lg:row-start-4 lg:pt-[min(40px,4.4vh)] lg:[&_.bouton]:h-[min(68px,8.4vh)] lg:[&_.bouton]:max-w-[420px] lg:[&_.bouton]:rounded-[18px] lg:[&_.bouton]:text-[21px]">{action}</div>}
      {pied && <div className="lg:col-start-1 lg:row-start-5 lg:self-end [&_p]:lg:text-left [&_p]:lg:text-[13px]">{pied}</div>}
    </main>
  );
}

/** Le grand titre d'un écran. */
export function Titre({ children, sous }: { children: React.ReactNode; sous?: string }) {
  return (
    <div className="mb-5 lg:mb-0">
      <h1 className="titre text-[30px] lg:text-[clamp(40px,min(4.5vw,7.6vh),84px)]">{children}</h1>
      {sous && <p className="mt-2 text-[14px] text-encre2 lg:mt-[min(24px,2.8vh)] lg:text-[clamp(18px,1.5vw,26px)] lg:leading-snug">{sous}</p>}
    </div>
  );
}
