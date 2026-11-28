"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DefiSeptJours } from "@/components/app/DefiSeptJours";
import { Message } from "@/components/app/Ecran";
import { Lecteur } from "@/components/app/Lecteur";
import { Paywall, type MomentPaywall } from "@/components/app/Paywall";
import { Publications } from "@/components/app/Publications";
import { Feuille } from "@/components/ui/Feuille";
import { Coche } from "@/components/ui/Parcours";
import { afficherToast } from "@/components/ui/Toast";
import { STYLES, type Style } from "@/lib/config";
import { modifier, useEtat, type Video } from "@/lib/etat";
import { supabase } from "@/lib/supabase";
import { chrono } from "@/lib/format";
import { ETAPES, quota, refaire, retirerFiligrane, sourcesDe, statutDe, useMaintenant } from "@/lib/montage";
import { usePublicationOuverte } from "@/lib/publication";
import { suivre } from "@/lib/suivi";

/** Conseils pour poster, affichés pendant le montage. */
const CONSEILS = [
  { titre: "Poste en fin de journée.", texte: "Entre 18 h et 21 h, ton public a le téléphone en main. Garde la même heure chaque jour." },
  { titre: "Une légende courte.", texte: "Une phrase, ou une question. Les commentaires font remonter ta vidéo." },
  { titre: "Trois à cinq hashtags.", texte: "Mets toujours #gta6. Ajoute ceux de ton style. Pas plus de cinq." },
  { titre: "Ne coupe pas l'accroche.", texte: "Les 2 premières secondes décident si on reste. XPclip les soigne pour toi." },
  { titre: "Réponds aux premiers commentaires.", texte: "Dans la première heure, chaque réponse compte. Ta vidéo vit plus longtemps." },
];

export default function PageVideo() {
  const { id } = useParams<{ id: string }>();
  const etat = useEtat();
  const t = useMaintenant(400);
  const video = etat.videos.find((v) => v.id === id);

  if (!video) {
    return (
      <Message titre="Vidéo introuvable." sous="Elle a peut-être été supprimée.">
        <Link href="/app/videos" className="bouton bouton-blanc w-full">
          Voir mes vidéos
        </Link>
      </Message>
    );
  }

  const { statut, etape, avancement } = statutDe(video, t);
  if (statut === "termine") return <Resultat video={video} />;

  if (statut === "echoue") {
    return (
      <Message titre="Le montage a échoué." sous={video.echec}>
        <p className="text-[16px] font-bold">Cette tentative ne compte pas dans ton quota.</p>
        <Link href="/app/creer" className="bouton bouton-rose w-full">
          Réessayer
        </Link>
      </Message>
    );
  }

  const conseil = CONSEILS[etape % CONSEILS.length];
  const pourcent = Math.round(avancement * 100);
  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="titre text-center text-[38px] lg:text-[68px]">{statut === "en_attente" ? "Ta vidéo est dans la file." : "Montage en cours."}</h1>
      <p className="mt-2 text-center text-[16px] font-medium lg:mt-4 lg:text-[20px]">Tu peux fermer l&apos;appli. On te prévient quand c&apos;est prêt.</p>

      <div className="ap-carte mx-auto mt-6 max-w-[640px] overflow-hidden lg:mt-10">
        <div className="p-5 lg:p-9">
          <div className="flex items-baseline justify-between gap-3">
            <span className="titre text-[20px] lg:text-[24px]">{STYLES[video.style].nom}</span>
            <span className="titre text-[48px] tabular-nums lg:text-[72px]">{pourcent}&nbsp;%</span>
          </div>
          <div className="barre mt-3" role="progressbar" aria-valuenow={pourcent} aria-label="Avancement du montage">
            <span style={{ width: `${Math.max(3, avancement * 100)}%` }} />
          </div>
          <ol className="mt-5 flex flex-col gap-3.5 lg:mt-7">
            {ETAPES.map((nom, i) => {
              const fait = statut === "en_cours" && i < etape;
              const actif = statut === "en_cours" && i === etape;
              return (
                <li key={nom} className={`flex items-center gap-3.5 text-[16px] lg:text-[18px] ${fait || actif ? "font-bold" : "text-encre2"}`}>
                  {fait ? (
                    <Coche className="h-7 w-7 shrink-0" />
                  ) : (
                    <span className={`h-7 w-7 shrink-0 rounded-full border-2 ${actif ? "clignote border-encre bg-rose" : "border-beige bg-fond"}`} aria-label={actif ? "en cours" : undefined} />
                  )}
                  {nom}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <section className="bloc mt-5 bg-turquoise p-5 lg:mt-7 lg:p-8" aria-labelledby="t-conseil">
        <span className="pastille bg-blanc">Pendant que ça monte</span>
        <h2 id="t-conseil" className="titre mt-3 text-[24px] lg:text-[34px]">
          {conseil.titre}
        </h2>
        <p className="mt-2 text-[16px] leading-snug lg:text-[19px]">{conseil.texte}</p>
      </section>
    </div>
  );
}

function Resultat({ video }: { video: Video }) {
  const etat = useEtat();
  const router = useRouter();
  const [refaireOuvert, setRefaireOuvert] = useState(false);
  const [paywall, setPaywall] = useState<MomentPaywall | null>(null);
  const [styleEnAttente, setStyleEnAttente] = useState<Style | null>(null);
  const compte = etat.compte!;
  const q = quota(etat);
  const sources = sourcesDe(video.id);
  const description = `${video.legende} ${video.hashtags.join(" ")}`;

  const copier = (texte: string) =>
    navigator.clipboard
      ?.writeText(texte)
      .then(() => afficherToast("Copié."))
      .catch(() => afficherToast("Copie impossible sur cet appareil."));

  function choisirStyle(s: Style) {
    setRefaireOuvert(false);
    if (q.restant === 0) {
      if (compte.offre !== "gratuit") return afficherToast("Tes vidéos du mois sont utilisées.");
      // Lancement de la deuxième vidéo : l'un des deux moments où l'écran des offres apparaît.
      setStyleEnAttente(s);
      return setPaywall("deuxieme_video");
    }
    lancer(s);
  }

  async function lancer(s: Style) {
    try {
      const id = await refaire(video, s);
      router.push(`/app/video/${id}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      afficherToast(m === "quota_atteint" ? "Ton offre s'ouvre dans un instant. Réessaie." : m || "Une erreur est survenue.");
    }
  }

  // Le MP4 est chargé d'avance : le menu de partage du téléphone doit s'ouvrir au toucher, sans attente.
  const partageNatif = usePartageNatif();
  const [fichier, setFichier] = useState<File | null>(null);
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    if (!partageNatif || !video.videoChemin) return;
    const stop = new AbortController();
    supabase.storage
      .from("videos")
      .createSignedUrl(video.videoChemin, 600)
      .then(async ({ data }) => {
        if (!data?.signedUrl) return;
        const r = await fetch(data.signedUrl, { signal: stop.signal });
        if (r.ok) setFichier(new File([await r.blob()], `xpclip-${video.id.slice(0, 8)}.mp4`, { type: "video/mp4" }));
      })
      .catch(() => {})
      .finally(() => setCharge(true));
    return () => stop.abort();
  }, [partageNatif, video.videoChemin, video.id]);

  const enPreparation = partageNatif && !!video.videoChemin && !charge;

  function noterPartage() {
    const le = new Date().toISOString();
    modifier((e) => ({
      ...e,
      compte: e.compte && !e.compte.defiDebut ? { ...e.compte, defiDebut: le } : e.compte,
      videos: e.videos.map((v) => (v.id === video.id ? { ...v, partageeLe: le } : v)),
    }));
    suivre("partage_tiktok", { video: video.id });
  }

  /** Téléphone : menu de partage avec la vidéo (TikTok, Instagram…). Ordinateur : textes copiés, puis TikTok. */
  async function partager() {
    const texte = `${video.titre}\n\n${video.legende}\n\n${video.hashtags.join(" ")}`;
    // Sans « await » : le menu de partage exige de s'ouvrir tout de suite après le toucher.
    navigator.clipboard?.writeText(texte).catch(() => {});
    if (fichier && navigator.canShare?.({ files: [fichier] })) {
      try {
        await navigator.share({ files: [fichier] });
        noterPartage();
        afficherToast("Titre et hashtags copiés. Colle-les dans ta publication.");
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    noterPartage();
    afficherToast("Titre et hashtags copiés. Colle-les dans TikTok.");
    setTimeout(() => window.open("https://www.tiktok.com/upload", "_blank", "noopener"), 600);
  }

  /** Offre payante : la vidéo gratuite est refaite sans filigrane, sans compter dans le quota. */
  async function sansFiligrane() {
    try {
      await retirerFiligrane(video.id);
      afficherToast("On refait ta vidéo sans filigrane.");
    } catch {
      afficherToast("Ton offre s'ouvre dans un instant. Réessaie.");
    }
  }

  async function telecharger(avecFiligrane = false) {
    // Téléchargement sans filigrane : l'un des deux moments où l'écran des offres apparaît.
    if (!avecFiligrane && video.filigrane && compte.offre === "gratuit") return setPaywall("telechargement");
    if (!avecFiligrane && video.filigrane) return sansFiligrane();
    if (!video.videoChemin) return afficherToast("Le fichier MP4 arrive avec le serveur de montage.");
    const { data } = await supabase.storage.from("videos").createSignedUrl(video.videoChemin, 600, { download: `xpclip-${video.id.slice(0, 8)}.mp4` });
    if (data?.signedUrl) window.location.href = data.signedUrl;
    else afficherToast("Téléchargement impossible. Réessaie.");
  }

  const gratuit = compte.offre === "gratuit";
  const publier = usePublicationOuverte();

  return (
    <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-x-14 xl:grid-cols-[370px_minmax(0,1fr)]">
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="titre text-[36px]">Ta vidéo est prête.</h1>
      </div>
      <div className="mx-auto w-[66%] max-w-[270px] lg:sticky lg:top-10 lg:mx-0 lg:w-full lg:max-w-none">
        <div className="tel-lecteur">
          <Lecteur video={video} sources={sources} />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 lg:mt-0 lg:gap-6">
        <h1 className="titre hidden text-[64px] lg:block xl:text-[80px]">Ta vidéo est prête.</h1>
        <div className="flex flex-wrap justify-center gap-2 lg:justify-start lg:gap-3">
          {[chrono(video.duree).replace(":", " min "), "9:16", STYLES[video.style].nom, ...(gratuit ? [] : [`${q.restant} restantes`])].map((x, i) => (
            <span key={x} className={`pastille lg:min-h-10 lg:px-4 lg:text-[17px] ${["bg-turquoise", "bg-blanc", "bg-jaune", "bg-blanc"][i]}`}>
              {x}
            </span>
          ))}
        </div>

        <div className="bloc flex flex-col gap-3.5 bg-blanc p-5 lg:p-8">
          {publier && !gratuit && (
            <Link href={`/app/video/${video.id}/poster`} className="bouton bouton-rose w-full">
              Poster ma vidéo
            </Link>
          )}
          <div className="grid gap-3.5 xl:grid-cols-2">
            <button type="button" onClick={partager} disabled={enPreparation} className={`bouton w-full ${publier && !gratuit ? "bouton-blanc" : "bouton-rose"}`}>
              {enPreparation ? "Préparation…" : partageNatif ? "Partager sur TikTok ou Instagram" : "Partager sur TikTok"}
            </button>
            <button type="button" onClick={() => telecharger()} className="bouton bouton-blanc w-full">
              {video.filigrane ? "Télécharger sans filigrane" : "Télécharger la vidéo"}
            </button>
          </div>
          <button type="button" onClick={() => setRefaireOuvert(true)} className="lien mx-auto flex min-h-11 items-center text-[16px]">
            Refaire avec un autre style
          </button>
        </div>

        <div className="bloc bg-blanc p-5 lg:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="libelle">Légende proposée</p>
            <button type="button" onClick={() => copier(description)} className="pastille min-h-11 bg-jaune px-5">
              Copier
            </button>
          </div>
          <p className="mt-3 text-[16px] leading-snug lg:text-[18px]">
            {video.legende} <span className="text-encre2">{video.hashtags.join(" ")}</span>
          </p>
        </div>

        {publier && <Publications video={video.id} titre="Tes publications" />}
        {video.partageeLe && <DefiSeptJours />}
      </div>

      <Feuille ouverte={refaireOuvert} fermer={() => setRefaireOuvert(false)} titre="Autre style">
        <p className="text-[14px] text-encre2">Mêmes clips, nouveau montage. Ça compte comme une vidéo.</p>
        <div className="mt-4 flex flex-col gap-4">
          {(Object.keys(STYLES) as Style[])
            .filter((s) => s !== video.style)
            .map((s) => (
              <button key={s} type="button" onClick={() => choisirStyle(s)} className="touche">
                <span>
                  <span className="titre block text-[22px]">{STYLES[s].nom}</span>
                  <span className="mt-0.5 block text-[13px] text-encre2">{STYLES[s].detail}</span>
                </span>
              </button>
            ))}
        </div>
      </Feuille>

      <Paywall
        ouvert={!!paywall}
        moment={paywall ?? "telechargement"}
        fermer={() => {
          const etait = paywall;
          setPaywall(null);
          if (etait === "telechargement") telecharger(true);
        }}
        apresPaiement={() => {
          const etait = paywall;
          setPaywall(null);
          if (etait === "telechargement") {
            sansFiligrane();
          } else if (styleEnAttente) lancer(styleEnAttente);
        }}
      />
    </div>
  );
}

/** Le téléphone sait-il partager un fichier vidéo ? */
function usePartageNatif() {
  const [oui, setOui] = useState(false);
  useEffect(() => {
    try {
      setOui(matchMedia("(pointer: coarse)").matches && !!navigator.canShare?.({ files: [new File([""], "x.mp4", { type: "video/mp4" })] }));
    } catch {}
  }, []);
  return oui;
}
