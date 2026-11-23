"use client";
/*
 * Tutoriel « pas encore de clips » : 3 étapes selon la console,
 * puis « C'est fait, je dépose mes clips » ouvre directement la galerie.
 * Chaque étape montre le chemin exact dans les menus.
 */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Entete } from "@/components/ui/Parcours";
import { modifier, useEtat, type Plateforme } from "@/lib/etat";
import { mettreEnAttente } from "@/lib/onboarding";

const ECRANS: { titre: string; ou: string; fond: string; chemin: Record<Plateforme, string[]>; note: Record<Plateforme, string> }[] = [
  {
    titre: "Active l'envoi automatique.",
    ou: "Sur ta console",
    fond: "bg-jaune",
    chemin: { ps5: ["Paramètres", "Captures et diffusions", "Envoi automatique"], xbox: ["Paramètres", "Préférences", "Capture et partage"] },
    note: { ps5: "Active l'envoi de tes captures. C'est réglé une fois pour toutes.", xbox: "Active l'envoi automatique. C'est réglé une fois pour toutes." },
  },
  {
    titre: "Capture le bon moment.",
    ou: "Pendant que tu joues",
    fond: "bg-orange",
    chemin: { ps5: ["Bouton Créer", "Enregistrer le gameplay récent"], xbox: ["Bouton Partager", "Enregistrer ce qui s'est passé"] },
    note: { ps5: "Juste après un bon moment. Garde 1 à 3 minutes.", xbox: "Juste après un bon moment. Garde 1 à 3 minutes." },
  },
  {
    titre: "Garde-le dans ta galerie.",
    ou: "Sur ton téléphone",
    fond: "bg-turquoise",
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
    <div className="flex min-h-dvh flex-col pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
      <Entete n={i + 1} total={ECRANS.length} retour={() => (i > 0 ? setI(i - 1) : router.back())} />

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-[14px] border-2 border-encre bg-blanc p-1" role="radiogroup" aria-label="Ta console">
        {(["ps5", "xbox"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={plateforme === p}
            onClick={() => changerConsole(p)}
            className={`min-h-10 rounded-[10px] text-[14px] font-bold ${plateforme === p ? "bg-encre text-fond" : ""}`}
          >
            {p === "ps5" ? "PS5" : "Xbox"}
          </button>
        ))}
      </div>

      <div key={`${i}-${plateforme}`} className="entree mt-6 flex-1">
        <span className={`pastille ${ecran.fond}`}>
          Étape {i + 1} · {ecran.ou}
        </span>
        <h1 className="titre mt-3 text-[30px]">{ecran.titre}</h1>

        <ol className="mt-5 flex flex-col gap-2">
          {ecran.chemin[plateforme].map((etape, k, liste) => {
            const cible = k === liste.length - 1;
            return (
              <li key={etape} className={`flex min-h-12 items-center gap-3 rounded-[14px] border-2 border-encre px-4 ${cible ? "bg-jaune shadow-[0_4px_0_var(--color-encre)]" : "bg-blanc"}`}>
                <span className="titre grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-encre bg-fond text-[14px]">{k + 1}</span>
                <span className="text-[16px] font-bold">{etape}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[14px] leading-snug text-encre2">{ecran.note[plateforme]}</p>
      </div>

      <input ref={galerie} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => deposer(e.target.files)} />
      <div className="pt-6">
        <button type="button" onClick={() => (dernier ? galerie.current?.click() : setI(i + 1))} className="bouton bouton-rose w-full">
          {dernier ? "C'est fait, je dépose mes clips" : "Suivant"}
        </button>
        {dernier && (
          <button type="button" onClick={() => deposer(null)} className="lien mx-auto mt-2 flex min-h-11 items-center px-4 text-[14px]">
            Je le ferai plus tard
          </button>
        )}
      </div>
    </div>
  );
}
