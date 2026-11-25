/* Un téléphone dessiné, ouvert sur une page de profil : pleine, vide, ou à créer. */
const VIGNETTES = ["chien", "canard", "saut", "poursuite", "chien", "saut", "canard", "poursuite", "chien"];

export function TelProfil({ etat }: { etat: "abonnes" | "vide" | "non" }) {
  return (
    <span className="tp" aria-hidden="true">
      <span className="tp-ecran">
        <i className="tp-encoche" />
        {etat === "non" ? (
          <svg viewBox="0 0 60 60" className="tp-plus">
            <circle cx="30" cy="30" r="26" fill="#FFFFFF" stroke="#1A0B2E" strokeWidth="2.500" strokeDasharray="6 5" />
            <path d="M30 18v24M18 30h24" stroke="#1A0B2E" strokeWidth="4.500" strokeLinecap="round" />
          </svg>
        ) : (
          <>
            <svg viewBox="0 0 60 60" className="tp-tete">
              <circle cx="30" cy="30" r="27" fill={etat === "abonnes" ? "#6FE3D6" : "#EDE3D6"} stroke="#1A0B2E" strokeWidth="3" />
              {etat === "abonnes" && (
                <>
                  <circle cx="21" cy="26" r="3.200" fill="#1A0B2E" />
                  <circle cx="39" cy="26" r="3.200" fill="#1A0B2E" />
                  <path d="M19 36c4 7.500 18 7.500 22 0" fill="none" stroke="#1A0B2E" strokeWidth="3.400" strokeLinecap="round" />
                </>
              )}
            </svg>
            <i className={`tp-nom ${etat === "abonnes" ? "bg-encre" : "bg-beige"}`} />
            <span className="tp-grille">{VIGNETTES.map((v, i) => (etat === "abonnes" ? <img key={i} src={`/v4/${v}.webp`} alt="" width={480} height={270} /> : <i key={i} />))}</span>
          </>
        )}
      </span>
    </span>
  );
}
