"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { DefiSeptJours } from "@/components/app/DefiSeptJours";
import { Paywall } from "@/components/app/Paywall";
import { BoutonRetour, Coche } from "@/components/ui/Parcours";
import { afficherToast } from "@/components/ui/Toast";
import { CLIPS, OFFRES_PAYANTES, STYLES, TITRE_MAX, type Duree, type Style } from "@/lib/config";
import { cheminClip, deposer, lireDuree } from "@/lib/depot";
import { utilisateurActuel } from "@/lib/serveur";
import { supabase } from "@/lib/supabase";
import { useEtat } from "@/lib/etat";
import { chrono, duree as dureeLisible, taille } from "@/lib/format";
import { dureeParDefaut, lancerMontage, optionsDuree, quota, stylesOuverts, verifierClips } from "@/lib/montage";
import { prendreEnAttente } from "@/lib/onboarding";

type Element = {
  id: string;
  fichier: File;
  url: string;
  duree: number;
  envoye: number;
  enPause: boolean;
  etat: "lecture" | "envoi" | "pret" | "refuse";
  erreur?: string;
  chemin?: string;
};

function Creer() {
  const etat = useEtat();
  const router = useRouter();
  const [survol, setSurvol] = useState(false);
  const [elements, setElements] = useState<Element[]>([]);
  const [etape, setEtape] = useState<"clips" | "style">("clips");
  const [style, setStyle] = useState<Style>("defi");
  const [titre, setTitre] = useState("");
  const [duree, setDuree] = useState<Duree>("moyenne");
  const [prevenir, setPrevenir] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [creation, setCreation] = useState(false);
  const [enLigne, setEnLigne] = useState(true);
  const entree = useRef<HTMLInputElement>(null);
  const annulations = useRef(new Map<string, AbortController>());

  const q = quota(etat);
  const bloque = q.restant === 0;
  const compte = etat.compte!;
  const ouverts = stylesOuverts(compte.offre);
  const premierPassage = useRef(true);

  // Clips choisis dans la galerie pendant l'onboarding ou le tutoriel : on les dépose tout de suite.
  useEffect(() => {
    if (!premierPassage.current) return;
    premierPassage.current = false;
    const f = prendreEnAttente();
    if (f.length) ajouter(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  const maj = (id: string, p: Partial<Element>) => setElements((l) => l.map((e) => (e.id === id ? { ...e, ...p } : e)));

  async function ajouter(fichiers: FileList | File[] | null) {
    if (!fichiers?.length) return;
    const place = CLIPS.max - elements.filter((e) => e.etat !== "refuse").length;
    const videos = Array.from(fichiers).filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
    if (videos.length < fichiers.length) afficherToast("Seules les vidéos sont acceptées.");
    if (videos.length > place) afficherToast(`${CLIPS.max} clips maximum. Les autres sont ignorés.`);
    const nouveaux: Element[] = videos.slice(0, Math.max(0, place)).map((f) => ({
      id: Math.random().toString(36).slice(2),
      fichier: f,
      url: URL.createObjectURL(f),
      duree: 0,
      envoye: 0,
      enPause: false,
      etat: "lecture",
    }));
    setElements((l) => [...l, ...nouveaux]);

    for (const el of nouveaux) {
      const d = await lireDuree(el.url);
      if (d > CLIPS.dureeMaxSec + 0.5) {
        maj(el.id, { duree: d, etat: "refuse", erreur: "Plus de 3 minutes. Coupe-le avant de l'envoyer." });
        continue;
      }
      if (!d) {
        maj(el.id, { etat: "refuse", erreur: "Vidéo illisible. Essaie un autre fichier." });
        continue;
      }
      const user = utilisateurActuel();
      if (!user) {
        maj(el.id, { etat: "refuse", erreur: "Ta session a expiré. Reconnecte-toi." });
        continue;
      }
      const chemin = cheminClip(user.id, el.fichier);
      maj(el.id, { duree: d, etat: "envoi", chemin });
      const ctrl = new AbortController();
      annulations.current.set(el.id, ctrl);
      deposer(el.fichier, chemin, (a) => maj(el.id, { envoye: a.envoye / a.total, enPause: a.enPause }), ctrl.signal)
        .then(() => maj(el.id, { etat: "pret", envoye: 1 }))
        .catch((e) => {
          if (e?.name !== "AbortError") maj(el.id, { etat: "refuse", erreur: "L'envoi a échoué. Retire ce clip et réessaie." });
        });
    }
  }

  function retirer(id: string) {
    annulations.current.get(id)?.abort();
    const el = elements.find((e) => e.id === id);
    // Un clip déjà envoyé puis retiré ne doit pas traîner dans le stockage.
    if (el?.etat === "pret" && el.chemin) supabase.storage.from("clips").remove([el.chemin]).then(() => {});
    setElements((l) => l.filter((e) => e.id !== id));
  }

  const valides = elements.filter((e) => e.etat !== "refuse");
  const total = valides.reduce((s, e) => s + e.duree, 0);
  const enCours = valides.some((e) => e.etat !== "pret");
  const probleme = verifierClips(valides.map((e) => ({ nom: e.fichier.name, duree: e.duree, taille: e.fichier.size })));

  async function generer(apresPaiement = false) {
    // Deuxième vidéo en Gratuit : c'est l'un des deux moments où l'écran des offres apparaît.
    if (bloque && !apresPaiement) return compte.offre === "gratuit" ? setPaywall(true) : afficherToast("Tes vidéos du mois sont utilisées.");
    if (prevenir && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }
    setCreation(true);
    try {
      const id = await lancerMontage({
        style,
        titre,
        duree: optionsDuree(total, compte.offre).find((o) => o.cle === duree)?.secondes ?? 30,
        clips: valides.map((e) => ({ nom: e.fichier.name, duree: Math.round(e.duree), taille: e.fichier.size, chemin: e.chemin })),
        urls: valides.map((e) => e.url),
      });
      router.push(`/app/video/${id}`);
    } catch (e) {
      setCreation(false);
      const m = e instanceof Error ? e.message : "";
      if (m === "quota_atteint") {
        if (apresPaiement) return afficherToast("Ton offre s'ouvre dans un instant. Réessaie.");
        return compte.offre === "gratuit" ? setPaywall(true) : afficherToast("Tes vidéos du mois sont utilisées.");
      }
      afficherToast(m || "Une erreur est survenue. Réessaie.");
    }
  }

  const barreBas = (info: React.ReactNode, bouton: React.ReactNode) => (
    <div className="au-dessus-onglets fixed inset-x-0 z-20 border-t-2 border-encre bg-fond px-4 pb-3 pt-3 lg:static lg:z-auto lg:mt-8 lg:border-t-0 lg:bg-transparent lg:p-0">
      {/* Ordinateur : la barre n'est plus collée en bas, elle suit le contenu */}
      <div className="mx-auto max-w-[448px] lg:flex lg:max-w-[720px] lg:items-center lg:justify-between lg:gap-6 lg:rounded-[18px] lg:border-2 lg:border-encre lg:bg-blanc lg:p-4 lg:pl-6">
        <p className="mb-2 text-center text-[13px] font-bold tabular-nums lg:mb-0 lg:text-left lg:text-[15px]">{info}</p>
        <div className="lg:w-[300px] lg:shrink-0">{bouton}</div>
      </div>
    </div>
  );

  /* ---------- Offre payante : quota du mois atteint ---------- */
  if (bloque && compte.offre !== "gratuit" && etape === "clips" && !elements.length) {
    return (
      <div className="entree lg:mx-auto lg:max-w-[720px]">
        <h1 className="titre text-[32px] lg:text-[48px]">Mois bouclé.</h1>
        <p className="mt-2 text-[15px] text-encre2">Tes {OFFRES_PAYANTES[compte.offre].videosParMois} vidéos reviennent le 1er du mois.</p>
      </div>
    );
  }

  /* ---------- Étape 2 : le style ---------- */
  if (etape === "style") {
    return (
      <>
        <div className="entree lg:mx-auto lg:max-w-[720px]">
          <BoutonRetour onClick={() => setEtape("clips")} />
          <h1 className="titre mt-4 text-[32px] lg:text-[48px]">Titre et style.</h1>
          <p className="mt-2 text-[15px] text-encre2">C&apos;est toi qui as joué. Raconte ce qui se passe.</p>

          <label htmlFor="titre-video" className="mt-5 block text-[14px] font-bold">
            Ton titre
          </label>
          <input
            key="titre-video"
            id="titre-video"
            maxLength={TITRE_MAX}
            placeholder="Ex. Mon chien conduit mieux que moi"
            className="champ mt-2"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            aria-describedby="titre-aide"
          />
          <p id="titre-aide" className="mt-2 flex justify-between gap-3 text-[13px] text-encre2">
            <span>Il s&apos;affiche au début de la vidéo. Vide : on t&apos;en propose un.</span>
            <span className="shrink-0 tabular-nums">
              {titre.length}/{TITRE_MAX}
            </span>
          </p>

          <p className="mt-6 text-[14px] font-bold">Durée de la vidéo</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Durée de la vidéo">
            {optionsDuree(total, compte.offre).map((o) => {
              const actif = duree === o.cle;
              return (
                <button
                  key={o.cle}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  disabled={!o.dispo}
                  onClick={() => setDuree(o.cle)}
                  className={`flex min-h-[68px] flex-col items-center justify-center rounded-[14px] border-2 border-encre px-1 text-center transition-colors disabled:opacity-40 ${actif ? "bg-jaune" : "bg-blanc"}`}
                >
                  <span className="titre text-[17px] font-bold tracking-[-0.01em]">{o.nom}</span>
                  <span className="mt-0.5 text-[12px] text-encre2">{o.ferme ? "Pro et Max" : o.dispo ? dureeLisible(o.secondes) : "Pas assez de clips"}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-[14px] font-bold">Ton style</p>
          <div className="mt-2 flex flex-col gap-2.5" role="radiogroup" aria-label="Style de la vidéo">
            {(Object.keys(STYLES) as Style[]).map((s) => {
              const actif = style === s;
              const ferme = !ouverts.includes(s);
              return (
                <button key={s} type="button" role="radio" aria-checked={actif} disabled={ferme} onClick={() => setStyle(s)} className="option min-h-[72px] disabled:opacity-50">
                  <span>
                    <span className="titre block text-[19px] font-bold tracking-[-0.01em]">{STYLES[s].nom}</span>
                    <span className="mt-0.5 block text-[13px] text-encre2">{ferme ? "Inclus dans Pro et Max" : STYLES[s].detail}</span>
                  </span>
                  {actif && <Coche />}
                </button>
              );
            })}
          </div>

          <label className="carte mt-4 flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 text-[15px] font-bold">
            Préviens-moi quand c&apos;est prêt
            <input type="checkbox" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} className="peer sr-only" />
            <span
              className="relative h-7 w-12 shrink-0 rounded-full border-2 border-encre bg-beige transition-colors peer-checked:bg-turquoise peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-turquoise after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border-2 after:border-encre after:bg-blanc after:transition-transform peer-checked:after:translate-x-5"
              aria-hidden="true"
            />
          </label>
          <p className="mt-4 text-[13px] text-encre2">En 9:16, 1080 × 1920. On garde les meilleurs passages de tes clips.</p>
          <div className="h-36 lg:hidden" aria-hidden="true" />
        </div>
        {barreBas(
          `Style : ${STYLES[style].nom}`,
          <button type="button" onClick={() => generer()} disabled={creation} className="bouton bouton-rose w-full">
            {creation ? "Lancement…" : "Générer ma vidéo"}
          </button>,
        )}
        <Paywall
          ouvert={paywall}
          moment="deuxieme_video"
          fermer={() => setPaywall(false)}
          apresPaiement={() => {
            setPaywall(false);
            generer(true);
          }}
        />
      </>
    );
  }

  /* ---------- Étape 1 : les clips ---------- */
  return (
    <>
      <div className="entree lg:mx-auto lg:max-w-[720px]">
        {etat.videos.length > 0 && (
          <div className="mb-6">
            <DefiSeptJours />
          </div>
        )}

        <h1 className="titre text-[32px] lg:text-[48px]">Dépose tes clips.</h1>
        <p className="mt-2 text-[15px] text-encre2">
          Jusqu&apos;à {CLIPS.max} clips, 3 minutes maximum chacun.
        </p>

        {!enLigne && (
          <p className="mt-4 rounded-xl border-2 border-encre bg-orange px-4 py-2.5 text-[14px] font-bold" role="status">
            Connexion perdue. L&apos;envoi reprend tout seul.
          </p>
        )}

        <input ref={entree} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => (ajouter(e.target.files), (e.target.value = ""))} />

        {valides.length < CLIPS.max && (
          <button
            type="button"
            onClick={() => entree.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setSurvol(true);
            }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSurvol(false);
              ajouter(e.dataTransfer.files);
            }}
            className={`carte-pointillee mt-5 flex w-full flex-col items-center justify-center gap-3 py-9 transition-colors active:bg-fond lg:mt-8 lg:py-16 ${survol ? "bg-jaune" : "bg-blanc lg:hover:bg-fond"}`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-encre bg-rose shadow-[0_3px_0_var(--color-encre)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="titre text-[18px] font-bold tracking-[-0.01em] lg:hidden">{valides.length ? "Ajouter des clips" : "Choisir dans ma galerie"}</span>
            <span className="hidden text-center lg:block">
              <span className="titre block text-[24px] font-bold tracking-[-0.01em]">{valides.length ? "Glisse d'autres clips ici" : "Glisse tes clips ici"}</span>
              <span className="mt-1 block text-[15px] text-encre2">ou clique pour les choisir</span>
            </span>
          </button>
        )}

        {elements.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2.5">
            {elements.map((e) => (
              <li key={e.id} className="carte flex items-center gap-3 p-2.5 pr-1">
                <video src={`${e.url}#t=0.5`} muted playsInline preload="metadata" className="h-14 w-10 shrink-0 rounded-lg border-2 border-encre bg-encre object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{e.fichier.name}</p>
                  {e.etat === "refuse" ? (
                    <p className="mt-0.5 text-[13px] font-bold">{e.erreur}</p>
                  ) : (
                    <>
                      <p className="mt-0.5 text-[13px] text-encre2 tabular-nums">
                        {e.duree ? chrono(e.duree) : "…"} · {taille(e.fichier.size)}
                        {e.etat === "pret" ? " · envoyé" : e.enPause ? " · en pause" : ` · ${Math.round(e.envoye * 100)} %`}
                      </p>
                      {e.etat !== "pret" && (
                        <div className="barre mt-1.5 h-[10px]" role="progressbar" aria-valuenow={Math.round(e.envoye * 100)} aria-label={`Envoi de ${e.fichier.name}`}>
                          <span style={{ width: `${e.envoye * 100}%`, "--remplissage": "var(--color-turquoise)" } as React.CSSProperties} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {e.etat === "pret" && <Coche className="h-5 w-5 shrink-0" />}
                <button type="button" onClick={() => retirer(e.id)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full" aria-label={`Retirer ${e.fichier.name}`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="h-36 lg:hidden" aria-hidden="true" />
      </div>

      {barreBas(
        <>
          {valides.length}/{CLIPS.max} clips{total ? ` · ${dureeLisible(total)} de jeu` : ""}
          {valides.length > 0 && probleme ? ` · ${probleme}` : ""}
        </>,
        <button
          type="button"
          onClick={() => {
            setDuree(dureeParDefaut(total, compte.offre));
            setEtape("style");
          }}
          disabled={!!probleme || enCours}
          className="bouton bouton-rose w-full"
        >
          {enCours && valides.length ? "Envoi en cours…" : "Titre et style"}
        </button>,
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Creer />
    </Suspense>
  );
}
