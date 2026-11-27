/* Une page de l'appli, look outil : le titre et ses à-côtés à gauche, le contenu à droite. Une colonne sur téléphone. */

/** Le titre d'une page : grand titre, une ligne dessous, et une action à droite si besoin. */
export function TetePage({ titre, sous, action, id }: { titre: React.ReactNode; sous?: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <header className="ap-tete">
      <div className="min-w-0">
        <h1 id={id} className="titre">
          {titre}
        </h1>
        {sous && <p>{sous}</p>}
      </div>
      {action}
    </header>
  );
}

export function Ecran({ titre, sous, plus, socle, children }: { titre: React.ReactNode; sous?: React.ReactNode; plus?: React.ReactNode; /** Sous le titre, à gauche sur ordinateur. */ socle?: React.ReactNode; children: React.ReactNode; travaille?: boolean; xp?: number }) {
  return (
    <div className="ap-deux">
      <div className="ap-gauche">
        <TetePage titre={titre} sous={sous} />
        {plus}
        {socle}
      </div>
      <div className="ap-corps">{children}</div>
    </div>
  );
}

/** Un message court, seul au milieu de la page. */
export function Message({ titre, sous, children, travaille }: { titre: React.ReactNode; sous?: React.ReactNode; children?: React.ReactNode; travaille?: boolean }) {
  return (
    <div className="ap-message lg:pt-10">
      {travaille && <span className="ap-roue mx-auto mb-5 block" aria-hidden="true" />}
      <TetePage titre={titre} sous={sous} />
      {children && <div className="ap-carte mt-6 flex flex-col gap-3 p-5 lg:p-8">{children}</div>}
    </div>
  );
}
