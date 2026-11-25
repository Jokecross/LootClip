"use client";
/*
 * Tutoriel « pas encore de clips » : 3 étapes selon la console,
 * puis « C'est fait, je dépose mes clips » ouvre directement la galerie.
 * Chaque étape montre le chemin exact dans les menus.
 */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Duo, Titre } from "@/components/ui/Duo";
import { Entete } from "@/components/ui/Parcours";
import { modifier, useEtat, type Plateforme } from "@/lib/etat";
import { mettreEnAttente } from "@/lib/onboarding";

const ECRANS: { titre: string; ou: string; fond: string; chemin: Record<Plateforme, string[]>; note: Record<Plateforme, string> }[] = [
  {
    titre: "Active l'envoi automatique.",
    ou: "Sur ta console",
    fond: "jaune",
    chemin: { ps5: ["Paramètres", "Captures et diffusions", "Envoi automatique"], xbox: ["Paramètres", "Préférences", "Capture et partage"] },
    note: { ps5: "Active l'envoi de tes captures. C'est réglé une fois pour toutes.", xbox: "Active l'envoi automatique. C'est réglé une fois pour toutes." },
  },
  {
    titre: "Capture le bon moment.",
    ou: "Pendant que tu joues",
    fond: "orange",
    chemin: { ps5: ["Bouton Créer", "Enregistrer le gameplay récent"], xbox: ["Bouton Partager", "Enregistrer ce qui s'est passé"] },
    note: { ps5: "Juste après un bon moment. Garde 1 à 3 minutes.", xbox: "Juste après un bon moment. Garde 1 à 3 minutes." },
  },
  {
    titre: "Garde-le dans ta galerie.",
    ou: "Sur ton téléphone",
    fond: "turquoise",
    chemin: { ps5: ["Appli PlayStation", "Bibliothèque", "Captures", "Enregistrer"], xbox: ["Appli Xbox", "Ma bibliothèque", "Captures", "Enregistrer"] },
    note: { ps5: "Le clip arrive dans la galerie de ton téléphone.", xbox: "Le clip arrive dans la galerie de ton téléphone." },
  },
];

export default function Demarrage() {
  const etat = useEtat();
  const router = useRouter();
  const [i, setI] = useState(0);
  const plateforme = etat.compte?.plateforme ?? "ps5";
  const galerie = useRef<HTMLInputElement>(null);
  const ecran = ECRANS[i];
  const dernier = i === ECRANS.length - 1;

  const changerConsole = (p: Plateforme) => modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, plateforme: p } : e.compte }));

  function deposer(fichiers: FileList | null) {
    if (fichiers?.length) mettreEnAttente(fichiers);
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, tutoVu: true } : e.compte }));
    router.push("/app/creer");
  }

  return (
    <Duo
      cle={`${i}-${plateforme}`}
      marque
      entete={<Entete n={i + 1} total={ECRANS.length} retour={() => (i > 0 ? setI(i - 1) : router.back())} />}
      fond={ecran.fond}
      gauche={
        <Titre avant={`Étape ${i + 1}, ${ecran.ou.toLowerCase()}`} sous={ecran.note[plateforme]}>
          {ecran.titre}
        </Titre>
      }
      droite={
        <div className="flex flex-1 flex-col justify-center gap-5 pt-5 lg:gap-8 lg:pt-0">
          <div className="segment" role="radiogroup" aria-label="Ta console">
            {(["ps5", "xbox"] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={plateforme === p} onClick={() => changerConsole(p)}>
                {p === "ps5" ? "PS5" : "Xbox"}
              </button>
            ))}
          </div>
          <ol className="flex flex-col gap-3.5 lg:gap-5">
            {ecran.chemin[plateforme].map((etape, k, liste) => (
              <li key={etape} className={`bloc surgit flex min-h-[72px] items-center gap-4 px-4 lg:min-h-[104px] lg:gap-6 lg:px-7 ${k === liste.length - 1 ? "bg-rose" : "bg-blanc"}`} style={{ "--d": `${k * 90}ms` } as React.CSSProperties}>
                <span className="titre grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border-2 border-encre bg-fond text-[22px] lg:h-16 lg:w-16 lg:rounded-[20px] lg:text-[32px]">{k + 1}</span>
                <span className="titre text-[21px] leading-[1.05] lg:text-[34px]">{etape}</span>
              </li>
            ))}
          </ol>
          <input ref={galerie} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => deposer(e.target.files)} />
        </div>
      }
      action={
        <button type="button" onClick={() => (dernier ? galerie.current?.click() : setI(i + 1))} className="bouton bouton-rose w-full">
          {dernier ? "C'est fait, je dépose mes clips" : "Suivant"}
        </button>
      }
      pied={
        dernier && (
          <button type="button" onClick={() => deposer(null)} className="lien mx-auto flex min-h-10 items-center lg:mx-0">
            Je le ferai plus tard
          </button>
        )
      }
    />
  );
}
