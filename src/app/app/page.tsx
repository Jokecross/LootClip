"use client";
/*
 * Accueil de l'appli : tout ce qui compte, au même endroit.
 * Le lien à coller en premier, les vidéos en cours, les derniers clips, la semaine programmée,
 * le quota du mois, les réseaux, et un guide en 3 étapes tant que l'abonné débute.
 */
import "@/app/lp.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { CarteClip } from "@/components/clips/CarteClip";
import { NOMS, PictoReseau } from "@/components/studio/Publier";
import { cleClip, statutDesPublications, usePublicationsDesClips } from "@/lib/clips-publications";
import { useEtat } from "@/lib/etat";
import { avancementLot, enCours, ilYa, lienTelechargement, nomEtape, plateformeDe, publiable, useApercu, useLots, type Lot } from "@/lib/lots";
import { useComptes, usePublicationOuverte, type Reseau } from "@/lib/publication";
import { useQuotaVideos } from "@/lib/quota-videos";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const lundi = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const heures = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}` : `${Math.floor(sec / 60)} min`);

export default function Accueil() {
  const etat = useEtat();
  const q = useQuotaVideos(etat);
  const { lots } = useLots();
  const { publications, parClip } = usePublicationsDesClips();
  const publier = usePublicationOuverte();
  const { comptes } = useComptes();

  const actifs = (lots ?? []).filter(enCours);
  const ratesRecents = (lots ?? []).filter((l) => l.erreur && !l.clips.length && Date.now() - l.debut < 86_400_000).slice(0, 2);
  const tousLesClips = (lots ?? []).flatMap((l) => l.clips.map((c) => ({ ...c, lot: l.id })));
  const derniers = tousLesClips.slice(0, 6);
  const programmees = (publications ?? []).filter((p) => p.statut === "programmee");
  const relies = (comptes ?? []).filter((c) => c.actif);

  // Le guide des débuts : relier un réseau, lancer une vidéo, poster un clip.
  const etapes = [
    { nom: "Relie TikTok ou Instagram", detail: "Une fois. XPclip poste ensuite pour toi.", fait: relies.length > 0, href: "/app/comptes", action: "Relier", cache: !publier },
    { nom: "Lance ta première vidéo", detail: "Colle un lien, on trouve les meilleurs moments.", fait: (lots ?? []).length > 0, href: "#lien", action: "Coller un lien" },
    { nom: "Poste ton premier clip", detail: "Tout de suite, ou programmé à l'heure choisie.", fait: (publications ?? []).length > 0, href: "/app/videos?filtre=a_poster", action: "Choisir un clip", cache: !publier },
  ].filter((e) => !e.cache);
  const faites = etapes.filter((e) => e.fait).length;
  const debutant = lots !== null && publications !== null && faites < etapes.length;

  // La semaine en cours, jour par jour.
  const semaine = useMemo(() => {
    const l = lundi();
    return JOURS.map((nom, i) => {
      const jour = new Date(l);
      jour.setDate(l.getDate() + i);
      const n = (publications ?? []).filter((p) => ["programmee", "publiee", "envoi", "en_cours"].includes(p.statut) && new Date(p.prevuLe ?? p.creeLe).toDateString() === jour.toDateString()).length;
      return { nom, date: jour.getDate(), aujourdhui: jour.toDateString() === new Date().toDateString(), n };
    });
  }, [publications]);

  return (
    <div className="tb">
      <header className="tb-tete">
        <h1 className="titre">Ton studio</h1>
        <p>{actifs.length ? `${actifs.length} vidéo${actifs.length > 1 ? "s" : ""} en cours d'analyse.` : "Colle un lien. On s'occupe du reste."}</p>
      </header>

      <div className="tb-grille">
        <div className="tb-principal">
          <LienRapide />

          {(actifs.length > 0 || ratesRecents.length > 0) && (
            <section aria-labelledby="t-cours" className="tb-bloc">
              <h2 id="t-cours" className="tb-titre">
                En cours
              </h2>
              <ul className="tb-cours">
                {actifs.map((l) => (
                  <LotEnCours key={l.id} lot={l} />
                ))}
                {ratesRecents.map((l) => (
                  <LotEnCours key={l.id} lot={l} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="t-derniers" className="tb-bloc">
            <div className="tb-titre-ligne">
              <h2 id="t-derniers" className="tb-titre">
                Tes derniers clips
              </h2>
              {tousLesClips.length > 0 && (
                <Link href="/app/videos" className="tb-lien">
                  Tout voir ({tousLesClips.length})
                </Link>
              )}
            </div>
            {lots === null ? (
              <div className="ap-vide" role="status">
                <span className="ap-roue" aria-label="Chargement" />
              </div>
            ) : derniers.length ? (
              <div className="ap-clips tb-clips">
                {derniers.map((c) => (
                  <CarteClip
                    key={cleClip(c.lot, c.fichier)}
                    url={c.url}
                    titre={c.titre}
                    score={c.score}
                    duree={c.duree}
                    telecharger={lienTelechargement(c)}
                    lot={publier && publiable(c) ? c.lot : undefined}
                    fichier={c.fichier}
                    statut={publications ? statutDesPublications(parClip.get(cleClip(c.lot, c.fichier)) ?? []) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="tb-vide">
                <p className="titre">Tes clips arrivent ici.</p>
                <p>Colle le lien d&apos;une vidéo au-dessus. Compte 3 à 5 minutes.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="tb-cote">
          {debutant && (
            <section className="ap-carte tb-guide" aria-labelledby="t-guide">
              <div className="tb-titre-ligne">
                <h2 id="t-guide" className="tb-titre">
                  Bien démarrer
                </h2>
                <span className="ap-pastille bg-jaune tabular-nums">
                  {faites}/{etapes.length}
                </span>
              </div>
              <ol>
                {etapes.map((e, i) => (
                  <li key={e.nom} data-fait={e.fait}>
                    <span className="tb-guide-num" aria-hidden="true">
                      {e.fait ? (
                        <svg viewBox="0 0 24 24">
                          <path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="currentColor" strokeWidth="3.400" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="tb-guide-nom">{e.nom}</p>
                      {!e.fait && <p className="tb-guide-detail">{e.detail}</p>}
                    </div>
                    {!e.fait &&
                      (e.href.startsWith("#") ? (
                        <button type="button" className="bouton bouton-blanc bouton-petit tb-guide-action" onClick={() => document.getElementById("lien-rapide")?.focus()}>
                          {e.action}
                        </button>
                      ) : (
                        <Link href={e.href} className="bouton bouton-blanc bouton-petit tb-guide-action">
                          {e.action}
                        </Link>
                      ))}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="tb-chiffres" aria-label="Ce mois-ci">
            <Chiffre nom="Vidéos restantes" valeur={q.total ? `${q.restant}` : "–"} sous={q.total ? `sur ${q.total} ce mois-ci` : "Choisis une offre"} jauge={q.total ? q.restant / q.total : 0} href="/app/compte" />
            <Chiffre
              nom="Heures restantes"
              valeur={q.secondesTotal ? heures(Math.max(0, q.secondesTotal - (q.secondes ?? 0))) : "–"}
              sous={q.secondesTotal ? `sur ${Math.round(q.secondesTotal / 3600)} h ce mois-ci` : "de vidéo à analyser"}
              jauge={q.secondesTotal ? Math.max(0, 1 - (q.secondes ?? 0) / q.secondesTotal) : 0}
              href="/app/compte"
            />
            <Chiffre nom="Clips créés" valeur={lots ? `${tousLesClips.length}` : "–"} sous="en tout" href="/app/videos" />
            <Chiffre nom="Programmés" valeur={publications ? `${programmees.length}` : "–"} sous="publications à venir" href="/app/calendrier" />
          </section>

          {publier && (
            <section className="ap-carte tb-semaine" aria-labelledby="t-semaine">
              <div className="tb-titre-ligne">
                <h2 id="t-semaine" className="tb-titre">
                  Ta semaine
                </h2>
                <Link href="/app/calendrier" className="tb-lien">
                  Calendrier
                </Link>
              </div>
              <ol>
                {semaine.map((j) => (
                  <li key={j.nom} data-aujourdhui={j.aujourdhui} data-plein={j.n > 0}>
                    <span>{j.nom}</span>
                    <b className="tabular-nums">{j.date}</b>
                    <i>{j.n > 0 ? j.n : ""}</i>
                  </li>
                ))}
              </ol>
              {!programmees.length && <p className="tb-semaine-vide">Rien de programmé. Poste un clip, il arrive ici.</p>}
            </section>
          )}

          {publier && (
            <section className="ap-carte tb-reseaux" aria-labelledby="t-reseaux">
              <div className="tb-titre-ligne">
                <h2 id="t-reseaux" className="tb-titre">
                  Tes réseaux
                </h2>
                <Link href="/app/comptes" className="tb-lien">
                  Gérer
                </Link>
              </div>
              <ul>
                {(["tiktok", "instagram"] as Reseau[]).map((r) => {
                  const c = relies.find((x) => x.reseau === r);
                  return (
                    <li key={r}>
                      <PictoReseau r={r} />
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold">{NOMS[r]}</p>
                        <p className="truncate text-[13px] font-semibold text-encre2">{comptes === null ? " " : c ? `@${c.pseudo ?? "compte relié"}` : "Pas encore relié"}</p>
                      </div>
                      {comptes !== null &&
                        (c ? (
                          <span className="ap-pastille bg-turquoise">Relié</span>
                        ) : (
                          <Link href="/app/comptes" className="bouton bouton-rose bouton-petit tb-relier">
                            Relier
                          </Link>
                        ))}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Coller un lien et partir : le studio s'ouvre directement sur les réglages. */
function LienRapide() {
  const router = useRouter();
  const [lien, setLien] = useState("");
  const [erreur, setErreur] = useState("");
  const champ = useRef<HTMLInputElement>(null);
  async function partir(e: React.FormEvent) {
    e.preventDefault();
    const l = lien.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(l)) {
      setErreur("Colle un lien complet, qui commence par https://");
      champ.current?.focus();
      return;
    }
    const { mettreLienEnAttente } = await import("@/lib/onboarding");
    mettreLienEnAttente(l);
    router.push("/app/creer?auto=1");
  }
  return (
    <form className="ap-carte tb-lien-rapide" onSubmit={partir} noValidate>
      <label htmlFor="lien-rapide" className="ap-libelle">
        Nouvelle vidéo
      </label>
      <div className="cl">
        <div className="cl-boite">
          <svg viewBox="0 0 24 24" className="cl-icone" aria-hidden="true">
            <path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400l-1 1M14 10a4.500 4.500 0 00-6.400 0l-3 3a4.500 4.500 0 006.400 6.400l1-1" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" />
          </svg>
          <input
            id="lien-rapide"
            ref={champ}
            className="cl-champ"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="Colle le lien de ta vidéo"
            value={lien}
            aria-invalid={!!erreur}
            onChange={(e) => {
              setLien(e.target.value);
              setErreur("");
            }}
          />
          <button type="submit" className="gros gros-rose cl-go">
            Créer mes clips
          </button>
        </div>
      </div>
      {erreur ? (
        <p role="alert" className="text-[14px] font-bold">
          {erreur}
        </p>
      ) : (
        <p className="tb-lien-aide">
          Pas de lien ?{" "}
          <Link href="/app/creer" className="lien">
            Envoie ton fichier vidéo
          </Link>
        </p>
      )}
    </form>
  );
}

function LotEnCours({ lot }: { lot: Lot }) {
  const a = useApercu(lot.lien);
  const rate = !!lot.erreur;
  const part = avancementLot(lot);
  return (
    <li className="ap-carte tb-lot">
      <div className="tb-lot-image">{a?.miniature ? <img src={a.miniature} alt="" referrerPolicy="no-referrer" /> : <span className="titre">{plateformeDe(lot.lien)}</span>}</div>
      <div className="min-w-0 flex-1">
        <p className="tb-lot-titre">{a?.titre ?? (lot.lien ? `Vidéo ${plateformeDe(lot.lien)}` : "Ton fichier vidéo")}</p>
        {rate ? (
          <p className="tb-lot-etat">{lot.erreur}</p>
        ) : (
          <>
            <p className="tb-lot-etat">
              {nomEtape(lot)} · {ilYa(lot.debut)}
            </p>
            <span className="ap-mini-jauge" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.max(0.04, part)})`, background: "var(--color-rose)" }} />
            </span>
          </>
        )}
      </div>
      {rate ? (
        <Link href="/app/creer" className="bouton bouton-blanc bouton-petit">
          Réessayer
        </Link>
      ) : (
        <Link href={`/app/creer?lot=${lot.id}`} className="tb-lot-pc tabular-nums" aria-label={`Suivre, ${Math.round(part * 100)} %`}>
          {Math.round(part * 100)} %
        </Link>
      )}
    </li>
  );
}

function Chiffre({ nom, valeur, sous, jauge, href }: { nom: string; valeur: string; sous: string; jauge?: number; href: string }) {
  return (
    <Link href={href} className="ap-carte tb-chiffre">
      <span className="tb-chiffre-nom">{nom}</span>
      <b className="titre tabular-nums">{valeur}</b>
      <span className="tb-chiffre-sous">{sous}</span>
      {jauge !== undefined && (
        <span className="ap-mini-jauge" aria-hidden="true">
          <span style={{ transform: `scaleX(${jauge})` }} />
        </span>
      )}
    </Link>
  );
}
