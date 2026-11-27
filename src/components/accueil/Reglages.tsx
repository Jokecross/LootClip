"use client";
/*
 * Les réglages d'un clip, à essayer dès l'accueil : type, couleur des sous-titres, placement, format.
 * Le téléphone change tout de suite. Une seule vidéo à la fois : extraits sans sous-titres de la vidéo de démo (demo.ts),
 * cadrés en Auto (facecam en haut), Plein écran ou Fond flou ; les sous-titres sont dessinés par-dessus.
 */
import { useState } from "react";
import { Boucle } from "./Boucle";
import { SousTitres } from "./SousTitres";

const TYPES = [
  { cle: "meilleur", nom: "Le meilleur", clip: "m1", phrase: "Le passage que tout le monde va partager" },
  { cle: "drole", nom: "Moments drôles", clip: "m3", phrase: "Un alligator m'a avalé en entier" },
  { cle: "conseils", nom: "Conseils", clip: "m2", phrase: "Le secret c'est de commencer par la fin" },
  { cle: "reactions", nom: "Réactions", clip: "m2", phrase: "Non mais tu as vu ce qu'il vient de faire" },
  { cle: "histoires", nom: "Histoires", clip: "m1", phrase: "Et là tout a basculé en une seconde" },
] as const;

const COULEURS = [
  { nom: "Jaune", valeur: "var(--color-jaune)" },
  { nom: "Rose", valeur: "var(--color-rose)" },
  { nom: "Turquoise", valeur: "var(--color-turquoise)" },
  { nom: "Orange", valeur: "var(--color-orange)" },
  { nom: "Blanc", valeur: "var(--color-blanc)" },
];

const PLACES = [
  { cle: "haut", nom: "Haut" },
  { cle: "milieu", nom: "Milieu" },
  { cle: "bas", nom: "Bas" },
] as const;

const FORMATS = [
  { cle: "auto", nom: "Auto", detail: "Visage ou facecam en haut, l'action en bas." },
  { cle: "plein", nom: "Plein écran", detail: "L'image remplit tout le téléphone." },
  { cle: "flou", nom: "Fond flou", detail: "L'image entière, sur un fond flouté." },
] as const;

type Format = (typeof FORMATS)[number]["cle"];
type Place = (typeof PLACES)[number]["cle"];

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={titre}>
      <p className="reg-titre">{titre}</p>
      <div className="reg-choix">{children}</div>
    </div>
  );
}

export function Reglages() {
  const [type, setType] = useState<(typeof TYPES)[number]["cle"]>("meilleur");
  const [couleur, setCouleur] = useState(COULEURS[0].valeur);
  const [place, setPlace] = useState<Place>("bas");
  const [format, setFormat] = useState<Format>("auto");
  const t = TYPES.find((x) => x.cle === type)!;
  const f = FORMATS.find((x) => x.cle === format)!;

  return (
    <div className="reglages">
      <div className="reg-texte">
        <h2 id="t-reglages" className="titre titre-v4">
          Ton clip, à&nbsp;ta&nbsp;façon.
        </h2>
        <p className="mt-3 text-[17px] font-medium leading-snug lg:mt-5 lg:text-[21px]">Tu règles avant de lancer. Le téléphone te montre le rendu.</p>
      </div>

      <div className="reg-tel-boite">
        <div className="tel-grand">
          <div className="m-tel-ecran">
            <Boucle key={`${format}-${t.clip}`} nom={`demo/reg-${t.clip}-${format}`} />
            {format === "auto" && <span className="reg-cam-pastille">Facecam</span>}
            <SousTitres phrase={t.phrase} couleur={couleur} place={place} />
          </div>
        </div>
      </div>

      <div className="reg-panneau">
        <Groupe titre="Type de clip">
          {TYPES.map((x) => (
            <button key={x.cle} type="button" role="radio" aria-checked={type === x.cle} onClick={() => setType(x.cle)} className="reg-bouton">
              {x.nom}
            </button>
          ))}
        </Groupe>
        <Groupe titre="Couleur des sous-titres">
          {COULEURS.map((c) => (
            <button
              key={c.nom}
              type="button"
              role="radio"
              aria-checked={couleur === c.valeur}
              aria-label={c.nom}
              onClick={() => setCouleur(c.valeur)}
              className="reg-pastille"
              style={{ background: c.valeur }}
            />
          ))}
        </Groupe>
        <Groupe titre="Placement">
          {PLACES.map((x) => (
            <button key={x.cle} type="button" role="radio" aria-checked={place === x.cle} onClick={() => setPlace(x.cle)} className="reg-bouton reg-large">
              {x.nom}
            </button>
          ))}
        </Groupe>
        <Groupe titre="Format">
          {FORMATS.map((x) => (
            <button key={x.cle} type="button" role="radio" aria-checked={format === x.cle} onClick={() => setFormat(x.cle)} className="reg-bouton reg-large">
              {x.nom}
            </button>
          ))}
        </Groupe>
        <p className="text-[15px] font-medium leading-snug">{f.detail}</p>
      </div>
    </div>
  );
}
