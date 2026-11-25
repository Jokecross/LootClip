"use client";
/* Poster une vidéo : réseaux, légende, moment. Les réglages TikTok demandés par TikTok sont choisis par le joueur. */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Ecran, Message } from "@/components/app/Ecran";
import { Publications } from "@/components/app/Publications";
import { Confettis } from "@/components/studio/Confettis";
import { HEURES, heure, jours, NOMS, PictoReseau } from "@/components/studio/Publier";
import { Coche } from "@/components/ui/Parcours";
import { Roulette } from "@/components/ui/Roulette";
import { afficherToast } from "@/components/ui/Toast";
import { useEtat } from "@/lib/etat";
import { active, publier, relier, useComptes, usePublications, type OptionsTiktok, type Reseau } from "@/lib/publication";
import { pop, tampon } from "@/lib/sons";

const TEXTE_MAX = 2200;
const CLE_OPTIONS = "xpclip:options-tiktok";
const OPTIONS: OptionsTiktok = { visibilite: null, commentaires: false, duos: false, collages: false, maMarque: false, partenaire: false };
const VISIBILITES = [
  ["public", "Tout le monde"],
  ["friends", "Mes amis"],
  ["private", "Moi"],
] as const;

export default function Poster() {
  const { id } = useParams<{ id: string }>();
  const etat = useEtat();
  const video = etat.videos.find((v) => v.id === id);
  const { comptes, erreur } = useComptes();
  const { liste, relire } = usePublications(id);
  const [reseaux, setReseaux] = useState<Reseau[]>([]);
  const [texte, setTexte] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionsTiktok>(OPTIONS);
  const [sponsor, setSponsor] = useState(false);
  const [plus, setPlus] = useState(true);
  const [jour, setJour] = useState(() => (new Date().getHours() >= 18 ? 1 : 0));
  const [minutes, setMinutes] = useState(19 * 60);
  const [l] = useState(jours);
  const [attente, setAttente] = useState(false);
  const [fini, setFini] = useState<"programmee" | "partie" | null>(null);

  // Les choix TikTok du joueur sont repris la fois d'après, sauf la mention commerciale.
  useEffect(() => {
    try {
      const o = JSON.parse(localStorage.getItem(CLE_OPTIONS) || "null");
      if (o) setOptions({ ...OPTIONS, visibilite: ["public", "friends", "private"].includes(o.visibilite) ? o.visibilite : null, commentaires: !!o.commentaires, duos: !!o.duos, collages: !!o.collages });
    } catch {}
  }, []);

  if (!video || video.statut !== "termine" || video.filigrane)
    return (
      <Message titre="Pas encore prête." sous={video?.filigrane ? "Refais d'abord ta vidéo sans filigrane." : "Ta vidéo doit être terminée pour partir."}>
        <Link href={video ? `/app/video/${id}` : "/app/videos"} className="bouton bouton-blanc w-full">
          Retour
        </Link>
      </Message>
    );

  const legende = texte ?? `${video.legende} ${video.hashtags.join(" ")}`.trim();
  const occupe = (r: Reseau) => liste?.find((p) => p.reseau === r && active(p));
  const quand = () => {
    const d = new Date();
    d.setDate(d.getDate() + jour);
    d.setHours(0, minutes, 0, 0);
    return d;
  };
  const passe = plus && quand().getTime() < Date.now() + 3 * 60_000;
  const tiktok = reseaux.includes("tiktok");
  const manque = !reseaux.length
    ? "Choisis une plateforme"
    : tiktok && !options.visibilite
      ? "Choisis qui peut voir"
      : tiktok && sponsor && !options.maMarque && !options.partenaire
        ? "Précise le contenu sponsorisé"
        : tiktok && options.partenaire && options.visibilite === "private"
          ? "Un partenariat ne peut pas être privé"
          : passe
            ? "Choisis une heure à venir"
            : null;

  async function bascule(r: Reseau) {
    const c = comptes?.find((x) => x.reseau === r && x.actif);
    if (!c) {
      setAttente(true);
      try {
        await relier(r, `/app/video/${id}/poster`);
      } catch (e) {
        setAttente(false);
        afficherToast((e as Error).message);
      }
      return;
    }
    pop(reseaux.includes(r) ? 0.1 : 0.8);
    setReseaux((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));
  }

  async function partir() {
    setAttente(true);
    const iso = plus ? quand().toISOString() : null;
    const restants: Reseau[] = [];
    let message = "";
    for (const r of reseaux) {
      try {
        await publier({ video: id, reseau: r, texte: legende, quand: iso, ...(r === "tiktok" ? { options: { ...options, maMarque: sponsor && options.maMarque, partenaire: sponsor && options.partenaire } } : {}) });
      } catch (e) {
        restants.push(r);
        message = `${NOMS[r]} : ${(e as Error).message}`;
      }
    }
    try {
      localStorage.setItem(CLE_OPTIONS, JSON.stringify(options));
    } catch {}
    await relire();
    setAttente(false);
    if (message) afficherToast(message);
    if (restants.length < reseaux.length) {
      tampon();
      setFini(plus ? "programmee" : "partie");
    }
    setReseaux(restants);
  }

  if (fini)
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 pt-6 lg:pt-12">
        <Confettis />
        <p className="tampon titre mx-auto w-fit rounded-[24px] border-4 border-encre bg-rose px-6 py-4 text-[42px] shadow-[0_8px_0_var(--color-encre)] lg:rounded-[36px] lg:px-10 lg:py-7 lg:text-[84px]">{fini === "programmee" ? "Programmée !" : "C'est parti !"}</p>
        <p className="mt-2 text-center text-[17px] font-medium lg:mt-6 lg:text-[21px]">{fini === "programmee" ? "Tu peux fermer XPclip. Elle partira toute seule." : "L'envoi prend souvent une à deux minutes."}</p>
        <Publications video={id} titre="Tes publications" />
        <Link href="/app/creer" className="bouton bouton-rose w-full">
          Créer une autre vidéo
        </Link>
      </div>
    );

  return (
    <>
      <Ecran
        titre="Tu postes où ?"
        plus={
          <div className="grid grid-cols-2 gap-2.5 pt-2 lg:gap-4 lg:pt-5">
            {(["tiktok", "instagram"] as Reseau[]).map((r) => {
              const c = comptes?.find((x) => x.reseau === r && x.actif);
              const deja = occupe(r);
              const actif = reseaux.includes(r);
              return (
                <button key={r} type="button" aria-pressed={actif} disabled={!comptes || !!deja || attente} onClick={() => bascule(r)} className="choix !rounded-[20px] items-start gap-2 p-3 disabled:opacity-60 lg:gap-3 lg:p-5">
                  <PictoReseau r={r} />
                  <span className="min-w-0 max-w-full">
                    <span className="titre block text-[18px] lg:text-[24px]">{NOMS[r]}</span>
                    <span className={`mt-1 block truncate text-[13px] lg:text-[15px] ${c && !deja ? "" : "font-bold"}`}>{!comptes ? "Un instant…" : deja ? (deja.statut === "programmee" ? "Déjà programmée" : "Déjà postée") : c ? `@${c.pseudo ?? "relié"}` : "Relier mon compte"}</span>
                  </span>
                  {actif && <Coche className="absolute right-3 top-3 h-7 w-7" />}
                </button>
              );
            })}
          </div>
        }
        socle={
          <Link href={`/app/video/${id}`} className="bloc hidden bg-blanc px-7 py-5 text-[18px] font-bold lg:block">
            ‹ Ma vidéo
          </Link>
        }
      >
        <Link href={`/app/video/${id}`} className="lien flex min-h-11 w-fit items-center text-[16px] lg:hidden">
          ‹ Ma vidéo
        </Link>
        {erreur && (
          <p role="alert" className="bloc bg-rose p-4 text-[16px] font-bold">
            {erreur}
          </p>
        )}

        <div className="bloc overflow-hidden bg-orange">
          <div className="p-4 lg:p-6">
            <div className="segment" role="radiogroup" aria-label="Moment de la publication">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" role="radio" aria-checked={plus === v} onClick={() => (pop(0.5), setPlus(v))}>
                  {v ? "Programmer" : "Maintenant"}
                </button>
              ))}
            </div>
            {plus && (
              <div className="mt-4 grid grid-cols-7 gap-1.5 lg:gap-2.5" role="radiogroup" aria-label="Jour">
                {l.map((j, i) => (
                  <button key={i} type="button" role="radio" aria-checked={jour === i} onClick={() => (pop(i / 7), setJour(i))} className={`flex min-h-[62px] flex-col items-center justify-center rounded-[14px] border-2 border-encre lg:min-h-[78px] lg:rounded-[18px] ${jour === i ? "bg-rose" : "bg-blanc shadow-[0_3px_0_var(--color-encre)]"}`}>
                    <span className="text-[12px] font-bold lg:text-[14px]">{j.court}</span>
                    <span className="titre mt-0.5 text-[19px] lg:text-[25px]">{j.num}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {plus ? (
            <>
              <p className="titre text-center text-[56px] tabular-nums lg:text-[76px]">{heure(minutes)}</p>
              <div className="flex h-[230px] px-4 lg:h-[300px] lg:px-[clamp(24px,2.6vw,48px)] lg:pt-[clamp(24px,2.6vw,48px)]">
                <Roulette nu page label="Heure de publication" valeurs={HEURES} valeur={minutes} libelle={heure} changer={setMinutes} />
              </div>
            </>
          ) : (
            <p className="titre px-5 pb-8 pt-2 text-center text-[30px] lg:pb-12 lg:text-[44px]">Ça part tout de suite.</p>
          )}
        </div>

        <div className="bloc bg-blanc p-5 lg:p-7">
          <label htmlFor="legende" className="libelle">
            Ta légende
          </label>
          <textarea id="legende" rows={4} maxLength={TEXTE_MAX} value={legende} onChange={(e) => setTexte(e.target.value)} className="champ mt-3 h-auto resize-y py-3 leading-snug" />
        </div>

        {tiktok && (
          <section className="bloc bg-blanc p-5 lg:p-7" aria-labelledby="t-tk">
            <h2 id="t-tk" className="titre text-[26px] lg:text-[32px]">
              Sur TikTok
            </h2>
            <p className="mt-4 text-[15px] font-bold">Qui peut la voir ?</p>
            <div className="mt-2 grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Qui peut la voir">
              {VISIBILITES.map(([v, nom]) => (
                <button key={v} type="button" role="radio" aria-checked={options.visibilite === v} onClick={() => setOptions((o) => ({ ...o, visibilite: v }))} className="puce">
                  {nom}
                </button>
              ))}
            </div>
            <p className="mt-5 text-[15px] font-bold">Ce que tu autorises</p>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              {(
                [
                  ["commentaires", "Commenter"],
                  ["duos", "Duo"],
                  ["collages", "Collage"],
                ] as const
              ).map(([k, nom]) => (
                <button key={k} type="button" aria-pressed={options[k]} onClick={() => setOptions((o) => ({ ...o, [k]: !o[k] }))} className="puce">
                  {nom}
                </button>
              ))}
            </div>
            <button type="button" role="switch" aria-checked={sponsor} onClick={() => setSponsor((s) => !s)} className="mt-4 flex min-h-12 w-full items-center justify-between gap-3 text-left text-[16px] font-bold">
              Vidéo sponsorisée
              <span className={`pastille ${sponsor ? "bg-jaune" : "bg-fond"}`}>{sponsor ? "Oui" : "Non"}</span>
            </button>
            {sponsor && (
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <button type="button" aria-pressed={options.maMarque} onClick={() => setOptions((o) => ({ ...o, maMarque: !o.maMarque }))} className="puce">
                  Ma marque
                </button>
                <button type="button" aria-pressed={options.partenaire} onClick={() => setOptions((o) => ({ ...o, partenaire: !o.partenaire }))} className="puce">
                  Un partenaire
                </button>
              </div>
            )}
            <p className="mt-4 text-[13px] leading-snug text-encre2">
              En publiant, tu acceptes la{" "}
              <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer" className="underline">
                confirmation d&apos;utilisation de la musique
              </a>
              {sponsor && options.partenaire ? (
                <>
                  {" "}
                  et la{" "}
                  <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener noreferrer" className="underline">
                    politique de contenu de marque
                  </a>
                </>
              ) : null}{" "}
              de TikTok.
            </p>
          </section>
        )}

        <Publications video={id} titre="Déjà fait" />
      </Ecran>

      <div className="appli-sol">
        <div>
          <p>{plus ? `${l[jour].long} à ${heure(minutes)}`.replace(/^./, (x) => x.toUpperCase()) : "Elle part tout de suite."}</p>
          <button type="button" disabled={!!manque || attente} onClick={partir} className="bouton bouton-rose">
            {attente ? "Un instant…" : (manque ?? (plus ? "Programmer ma vidéo" : "Publier ma vidéo"))}
          </button>
        </div>
      </div>
    </>
  );
}
