/* Une page de l'appli : le robot et sa bulle à gauche, le contenu à droite. Une colonne sur téléphone. */
import { Titre } from "@/components/ui/Duo";

export function Ecran({ titre, sous, plus, socle, children, travaille, xp }: { titre: React.ReactNode; sous?: React.ReactNode; plus?: React.ReactNode; /** Sous les pieds du robot, sur ordinateur. */ socle?: React.ReactNode; children: React.ReactNode; travaille?: boolean; xp?: number }) {
  return (
    <div className="appli-deux">
      <div className="appli-gauche">
        <Titre sous={sous} plus={plus} travaille={travaille} xp={xp}>
          {titre}
        </Titre>
        {socle}
      </div>
      <div className="appli-corps">{children}</div>
    </div>
  );
}

/** Un message court, seul au milieu de la page. */
export function Message({ titre, sous, children, travaille }: { titre: React.ReactNode; sous?: React.ReactNode; children?: React.ReactNode; travaille?: boolean }) {
  return (
    <div className="appli-message mx-auto max-w-[720px] lg:pt-10">
      <Titre sous={sous} travaille={travaille}>
        {titre}
      </Titre>
      {children && <div className="bloc mt-5 flex flex-col gap-3 bg-blanc p-5 lg:mt-0 lg:p-8">{children}</div>}
    </div>
  );
}
