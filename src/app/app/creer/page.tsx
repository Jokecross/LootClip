"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { DefiSeptJours } from "@/components/app/DefiSeptJours";
import { Ecran, Message } from "@/components/app/Ecran";
import { Paywall } from "@/components/app/Paywall";
import { Quota } from "@/components/app/Quota";
import { Objet } from "@/components/objets/Objet";
import { Essai } from "@/components/studio/Essai";
import { Coche } from "@/components/ui/Parcours";
import { afficherToast } from "@/components/ui/Toast";
import { CLIPS, OFFRES_PAYANTES, STYLES, TITRE_MAX, type Duree, type Style } from "@/lib/config";
import { cheminClip, deposer, lireDuree } from "@/lib/depot";
import { utilisateurActuel } from "@/lib/serveur";
import { supabase } from "@/lib/supabase";
import { useEtat } from "@/lib/etat";
import { chrono, duree as dureeLisible, taille } from "@/lib/format";
import { dureeParDefaut, lancerMontage, optionsDuree, quota, stylesOuverts, verifierClips } from "@/lib/montage";
import { prendreEnAttente } from "@/lib/onboarding";

/** Longueur des plans de chaque style, dessinée sur sa touche. */
const RYTHMES: Record<Style, number[]> = { defi: [3, 2, 2, 3, 2, 2], drole: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], mission: [5, 4, 5] };
const FONDS = ["bg-rose", "bg-blanc", "bg-turquoise", "bg-orange"];

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
  // L'aperçu du style ne joue que sur ordinateur.
  const [large, setLarge] = useState(false);
  useEffect(() => setLarge(matchMedia("(min-width: 1024px)").matches), []);
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
    <div className="appli-sol">
      <div>
        <p className="tabular-nums">{info}</p>
        {bouton}
      </div>
    </div>
  );

  /* ---------- Offre payante : quota du mois atteint ---------- */
  if (bloque && compte.offre !== "gratuit" && etape === "clips" && !elements.length) {
    return (
      <Message titre="Mois bouclé." sous={`Tes ${OFFRES_PAYANTES[compte.offre].videosParMois} vidéos reviennent le 1er du mois.`}>
        <Link href="/app/videos" className="bouton bouton-rose w-full">
          Voir mes vidéos
        </Link>
      </Message>
    );
  }

  /* ---------- Étape 2 : le titre et le style ---------- */
  if (etape === "style") {
    return (
      <>
        <Ecran
          titre="Titre et style."
          sous="C'est toi qui as joué. Raconte ce qui se passe."
          plus={
            <div className="pt-3 lg:pt-6">
              <label htmlFor="titre-video" className="libelle">
                Ton titre
              </label>
              <input
                id="titre-video"
                maxLength={TITRE_MAX}
                placeholder="Ex. Mon chien conduit mieux que moi"
                className="champ mt-2"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                aria-describedby="titre-aide"
              />
              <p id="titre-aide" className="!mt-2 flex justify-between gap-3 !text-[13px] lg:!text-[14px]">
                <span>Il s&apos;affiche au début. Vide : on t&apos;en propose un.</span>
                <span className="shrink-0 tabular-nums">
                  {titre.length}/{TITRE_MAX}
                </span>
              </p>
            </div>
          }
        >
          <button type="button" onClick={() => setEtape("clips")} className="lien flex min-h-11 w-fit items-center text-[16px] lg:text-[18px]">
            ‹ Mes clips
          </button>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_230px] lg:gap-8">
            <div className="flex flex-col gap-6">
              <div>
                <p className="libelle">Durée</p>
                <div className="mt-3 grid grid-cols-3 gap-2.5 lg:gap-3.5" role="radiogroup" aria-label="Durée de la vidéo">
                  {optionsDuree(total, compte.offre).map((o) => (
                    <button key={o.cle} type="button" role="radio" aria-checked={duree === o.cle} disabled={!o.dispo} onClick={() => setDuree(o.cle)} className="puce !min-h-[74px]">
                      <span className="titre block text-[18px] lg:text-[21px]">{o.nom}</span>
                      <span className="mt-1 block text-[12px] font-medium lg:text-[14px]">{o.ferme ? "Pro et Max" : o.dispo ? dureeLisible(o.secondes) : "Pas assez de clips"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="libelle">Style</p>
                <div className="mt-3 flex flex-col gap-3.5" role="radiogroup" aria-label="Style de la vidéo">
                  {(Object.keys(STYLES) as Style[]).map((s) => {
                    const actif = style === s;
                    const ferme = !ouverts.includes(s);
                    return (
                      <button key={s} type="button" role="radio" aria-checked={actif} disabled={ferme} onClick={() => setStyle(s)} className="touche disabled:opacity-60">
                        <span className="flex items-center justify-between gap-3">
                          <span className="titre text-[22px] lg:text-[26px]">{STYLES[s].nom}</span>
                          {ferme ? <span className="pastille bg-turquoise">Dès Pro</span> : actif ? <Coche className="h-7 w-7 shrink-0" /> : null}
                        </span>
                        <span className="mt-1 block text-[14px] lg:text-[16px]">{STYLES[s].detail}</span>
                        <span className="mt-3 flex h-4 gap-1 lg:h-5" aria-hidden="true">
                          {RYTHMES[s].map((n, k) => (
                            <span key={k} className={`rounded-md border-2 border-encre ${actif ? FONDS[k % 4] : "bg-beige"}`} style={{ flex: n }} />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="bloc flex min-h-[68px] cursor-pointer items-center justify-between gap-4 bg-blanc px-5 text-[16px] font-bold lg:text-[18px]">
                Préviens-moi quand c&apos;est prêt
                <input type="checkbox" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} className="peer sr-only" />
                <span
                  className="relative h-8 w-14 shrink-0 rounded-full border-2 border-encre bg-beige transition-colors peer-checked:bg-turquoise peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-turquoise after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:border-2 after:border-encre after:bg-blanc after:transition-transform peer-checked:after:translate-x-6"
                  aria-hidden="true"
                />
              </label>
            </div>
            {large && valides[0] && (
              <div className="sticky top-[138px] h-[430px]">
                <Essai url={valides[0].url} titre={titre} style={style} />
              </div>
            )}
          </div>
        </Ecran>
        {barreBas(
          `${STYLES[style].nom}, en 9:16. On garde les meilleurs passages.`,
          <button type="button" onClick={() => generer()} disabled={creation} className="bouton bouton-rose">
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
      <Ecran titre="Dépose tes clips." sous={`Jusqu'à ${CLIPS.max} clips, 3 minutes maximum chacun.`} socle={<Quota />}>
        {!enLigne && (
          <p className="bloc bg-orange px-5 py-3.5 text-[16px] font-bold" role="status">
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
            className={`depot ${elements.length ? "depot-court" : ""} ${survol ? "depot-survol" : ""}`}
          >
            {!elements.length && (
              <>
                <Objet nom="clip-b" className="absolute right-[5%] top-[7%] h-[24%] w-[30%]" />
                <Objet nom="manette" className="absolute bottom-[3%] left-[3%] h-[20%] w-[26%] lg:h-[24%] lg:w-[28%]" />
              </>
            )}
            <span className="depot-plus" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="relative z-10">
              <span className="titre block text-[22px] lg:text-[34px]">
                <span className="lg:hidden">{valides.length ? "Ajouter des clips" : "Choisir dans ma galerie"}</span>
                <span className="hidden lg:inline">{valides.length ? "Glisse d'autres clips ici" : "Glisse tes clips ici"}</span>
              </span>
              <span className="mt-1.5 hidden text-[18px] lg:block">ou clique pour les choisir</span>
            </span>
          </button>
        )}

        {elements.length > 0 && (
          <ul className="flex flex-col gap-3">
            {elements.map((e) => (
              <li key={e.id} className="clip">
                <video src={`${e.url}#t=0.5`} muted playsInline preload="metadata" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold">{e.fichier.name}</p>
                  {e.etat === "refuse" ? (
                    <p className="mt-0.5 text-[14px] font-bold">{e.erreur}</p>
                  ) : (
                    <>
                      <p className="mt-0.5 text-[14px] tabular-nums text-encre2">
                        {e.duree ? chrono(e.duree) : "…"} · {taille(e.fichier.size)}
                        {e.etat === "pret" ? " · envoyé" : e.enPause ? " · en pause" : ` · ${Math.round(e.envoye * 100)} %`}
                      </p>
                      {e.etat !== "pret" && (
                        <div className="barre mt-2 !h-[14px]" role="progressbar" aria-valuenow={Math.round(e.envoye * 100)} aria-label={`Envoi de ${e.fichier.name}`}>
                          <span style={{ width: `${e.envoye * 100}%`, "--remplissage": "var(--color-turquoise)" } as React.CSSProperties} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {e.etat === "pret" && <Coche className="h-7 w-7 shrink-0" />}
                <button type="button" onClick={() => retirer(e.id)} className="grid h-12 w-11 shrink-0 place-items-center rounded-full" aria-label={`Retirer ${e.fichier.name}`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {etat.videos.length > 0 && <DefiSeptJours />}
      </Ecran>

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
            window.scrollTo({ top: 0 });
          }}
          disabled={!!probleme || enCours}
          className="bouton bouton-rose"
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
