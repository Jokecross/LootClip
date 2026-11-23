"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DefiSeptJours } from "@/components/app/DefiSeptJours";
import { Lecteur } from "@/components/app/Lecteur";
import { Paywall, type MomentPaywall } from "@/components/app/Paywall";
import { Feuille } from "@/components/ui/Feuille";
import { Coche } from "@/components/ui/Parcours";
import { afficherToast } from "@/components/ui/Toast";
import { STYLES, type Style } from "@/lib/config";
import { modifier, useEtat, type Video } from "@/lib/etat";
import { supabase } from "@/lib/supabase";
import { chrono } from "@/lib/format";
import { ETAPES, LIBELLES_STATUT, quota, refaire, retirerFiligrane, sourcesDe, statutDe, useMaintenant } from "@/lib/montage";
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
      <div className="entree">
        <h1 className="titre text-[32px]">Vidéo introuvable.</h1>
        <p className="mt-2 text-[15px] text-encre2">Elle a peut-être été supprimée.</p>
        <Link href="/app/videos" className="bouton bouton-blanc mt-6 w-full">
          Voir mes vidéos
        </Link>
      </div>
    );
  }

  const { statut, etape, avancement } = statutDe(video, t);
  if (statut === "termine") return <Resultat video={video} />;

  if (statut === "echoue") {
    return (
      <div className="entree lg:mx-auto lg:max-w-[720px]">
        <span className="pastille bg-rose">Échoué</span>
        <h1 className="titre mt-3 text-[32px]">Le montage a échoué.</h1>
        <p className="mt-2 text-[15px] text-encre2">{video.echec}</p>
        <p className="mt-1 text-[14px] font-bold">Cette tentative ne compte pas dans ton quota.</p>
        <Link href="/app/creer" className="bouton bouton-rose mt-6 w-full">
          Réessayer
        </Link>
      </div>
    );
  }

  const conseil = CONSEILS[etape % CONSEILS.length];
  return (
    <div className="entree lg:mx-auto lg:max-w-[720px]">
      <span className={`pastille ${statut === "en_cours" ? "bg-jaune" : "bg-blanc"}`}>{LIBELLES_STATUT[statut]}</span>
      <h1 className="titre mt-3 text-[32px] lg:text-[48px]">{statut === "en_attente" ? "Ta vidéo est dans la file." : "Montage en cours."}</h1>
      <p className="mt-2 text-[15px] text-encre2">Tu peux fermer l&apos;appli. On te prévient quand c&apos;est prêt.</p>

      <div className="carte-forte mt-5 bg-jaune p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-bold">{STYLES[video.style].nom}</span>
          <span className="titre text-[34px] tabular-nums">{Math.round(avancement * 100)} %</span>
        </div>
        <div className="barre mt-3 h-4" role="progressbar" aria-valuenow={Math.round(avancement * 100)} aria-label="Avancement du montage">
          <span style={{ width: `${Math.max(3, avancement * 100)}%` }} />
        </div>
      </div>

      <ol className="carte mt-3 divide-y-2 divide-beige px-4">
        {ETAPES.map((nom, i) => {
          const fait = statut === "en_cours" && i < etape;
          const actif = statut === "en_cours" && i === etape;
          return (
            <li key={nom} className={`flex min-h-12 items-center justify-between gap-3 text-[15px] ${fait || actif ? "font-bold" : "text-encre2"}`}>
              {nom}
              {fait ? (
                <Coche className="h-5 w-5" />
              ) : actif ? (
                <span className="h-5 w-5 rounded-full border-[3px] border-encre border-t-transparent" style={{ animation: "tourne .8s linear infinite" }} aria-label="en cours" />
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-beige" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      <section className="carte mt-3 bg-fond p-4" aria-labelledby="t-conseil">
        <span className="pastille bg-turquoise">Pendant que ça monte</span>
        <h2 id="t-conseil" className="titre mt-3 text-[20px]">
          {conseil.titre}
        </h2>
        <p className="mt-1.5 text-[14px] leading-snug text-encre2">{conseil.texte}</p>
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

  /** Partage vers TikTok : titre, légende et hashtags copiés d'abord, puis ouverture de TikTok. */
  async function partager() {
    const texte = `${video.titre}\n\n${video.legende}\n\n${video.hashtags.join(" ")}`;
    await navigator.clipboard?.writeText(texte).catch(() => {});
    const le = new Date().toISOString();
    modifier((e) => ({
      ...e,
      compte: e.compte && !e.compte.defiDebut ? { ...e.compte, defiDebut: le } : e.compte,
      videos: e.videos.map((v) => (v.id === video.id ? { ...v, partageeLe: le } : v)),
    }));
    suivre("partage_tiktok", { video: video.id });
    afficherToast("Titre et hashtags copiés. Colle-les dans TikTok.");
    // Une fois le MP4 réel disponible : navigator.share({ files: [mp4] }) ouvre TikTok dans le menu de partage.
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

  return (
    <div className="entree lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-x-8 xl:grid-cols-[380px_1fr] xl:gap-x-12 [&>*]:lg:col-start-2">
      <div className="flex items-start justify-between gap-3">
        <h1 className="titre text-[30px] lg:text-[38px] xl:text-[48px]">Ta vidéo est prête.</h1>
        {!gratuit && <span className="pastille mt-1 shrink-0 rotate-2 bg-turquoise lg:mt-3">{q.restant} restantes</span>}
      </div>

      {/* Ordinateur : « contents » libère le lecteur et les infos dans la grille de la page */}
      <div className="mt-4 grid grid-cols-[1.55fr_1fr] gap-2.5 lg:contents">
        <div className="lg:sticky lg:top-10 lg:col-start-1 lg:row-span-6 lg:row-start-1">
          <Lecteur video={video} sources={sources} />
        </div>
        <div className="flex flex-col gap-2.5 lg:col-start-2 lg:mt-6 lg:grid lg:grid-cols-3 lg:gap-3">
          <Info libelle="Durée" valeur={chrono(video.duree).replace(":", " min ")} />
          <Info libelle="Format" valeur="9:16" />
          <Info libelle="Style" valeur={STYLES[video.style].nom} />
          <p className="carte-pointillee p-2.5 text-[11px] leading-snug text-encre2 lg:col-span-3 lg:px-4 lg:py-3 lg:text-[14px]">Prête pour TikTok, Shorts et Reels.</p>
        </div>
      </div>

      <div className="carte mt-3 p-3.5 lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-bold">Légende proposée</p>
          <button type="button" onClick={() => copier(description)} className="lien min-h-9 text-[13px]">
            Copier
          </button>
        </div>
        <p className="mt-1 text-[14px] leading-snug lg:mt-2 lg:text-[16px]">
          {video.legende} <span className="text-encre2">{video.hashtags.join(" ")}</span>
        </p>
      </div>

      <div className="lg:mt-6 lg:grid lg:gap-3 xl:grid-cols-2">
        <button type="button" onClick={partager} className="bouton bouton-rose mt-5 w-full lg:mt-0">
          Partager sur TikTok
        </button>
        <button type="button" onClick={() => telecharger()} className="bouton bouton-blanc mt-3 w-full lg:mt-0">
          {video.filigrane ? "Télécharger sans filigrane" : "Télécharger la vidéo"}
        </button>
      </div>
      <button type="button" onClick={() => setRefaireOuvert(true)} className="lien mx-auto mt-2 flex min-h-11 items-center text-[14px] lg:mx-0 lg:mt-3">
        Refaire avec un autre style
      </button>

      {video.partageeLe && (
        <div className="mt-4">
          <DefiSeptJours />
        </div>
      )}

      <Feuille ouverte={refaireOuvert} fermer={() => setRefaireOuvert(false)} titre="Autre style">
        <p className="text-[14px] text-encre2">Mêmes clips, nouveau montage. Ça compte comme une vidéo.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {(Object.keys(STYLES) as Style[])
            .filter((s) => s !== video.style)
            .map((s) => (
              <button key={s} type="button" onClick={() => choisirStyle(s)} className="option min-h-[68px]">
                <span>
                  <span className="titre block text-[18px] font-bold tracking-[-0.01em]">{STYLES[s].nom}</span>
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

function Info({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="carte px-2.5 py-2 lg:px-3 lg:py-3 xl:px-4">
      <p className="text-[11px] text-encre2 lg:text-[13px]">{libelle}</p>
      <p className="titre mt-0.5 text-[15px] font-bold tracking-[-0.01em] lg:text-[17px] xl:text-[20px]">{valeur}</p>
    </div>
  );
}

