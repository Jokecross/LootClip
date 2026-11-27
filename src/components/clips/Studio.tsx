"use client";
/*
 * Le studio « lien → clips » : le joueur colle le lien d'une vidéo, choisit ses réglages,
 * puis XPclip trouve les meilleurs moments et les monte en clips verticaux sous-titrés.
 * Utilisé par /app/creer (dans l'appli) et /clips (page d'essai). Look outil : étapes, cartes, grille de clips.
 */
import "@/app/lp.css";
import "@/app/app/outil.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TetePage } from "@/components/app/Ecran";
import type { EtatClips } from "@/lib/clips-local";
import { OPTIONS_PAR_DEFAUT, type OptionsClips } from "@/lib/clips-options";
import { CarteClip, Score } from "./CarteClip";
import { Reglages } from "./Reglages";

const ETAPES = [
  { cle: "telechargement", libelle: "Vidéo récupérée", poids: [0, 0.25] },
  { cle: "transcription", libelle: "Transcription", poids: [0.25, 0.35] },
  { cle: "choix", libelle: "Moments forts", poids: [0.35, 0.45] },
  { cle: "montage", libelle: "Montage 9:16", poids: [0.45, 1] },
] as const;

const PLATEFORMES = ["YouTube", "Twitch", "Kick", "X"];
const PAS = ["Lien", "Style", "Montage", "Clips"];

/** Le nom de la plateforme, d'après le lien. */
function plateformeDe(lien: string) {
  const l = lien.toLowerCase();
  if (/youtu\.?be/.test(l)) return "YouTube";
  if (l.includes("twitch.tv")) return "Twitch";
  if (l.includes("kick.com")) return "Kick";
  if (/\/\/(www\.)?(x|twitter)\.com/.test(l)) return "X";
  return "Lien";
}

function Pas({ n }: { n: number }) {
  return (
    <ol className="ap-pas" aria-label={`Étape ${n} sur 4`}>
      {PAS.map((p, i) => (
        <li key={p} data-etat={i + 1 < n ? "fait" : i + 1 === n ? "encours" : "attente"} aria-current={i + 1 === n ? "step" : undefined}>
          {p}
        </li>
      ))}
    </ol>
  );
}

function Coche() {
  return (
    <span className="ap-coche" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="currentColor" strokeWidth="3.400" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Le jeton de session, si le joueur est connecté (les routes en ligne en ont besoin). */
async function enTetes(): Promise<Record<string, string>> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}

function avancementGlobal(e: EtatClips) {
  if (e.etape === "fini") return 1;
  const etape = ETAPES.find((x) => x.cle === e.etape) ?? ETAPES[0];
  const [a, b] = etape.poids;
  return a + (b - a) * Math.min(1, e.avancement || 0);
}

export function Studio({
  avantLancer,
  appli = false,
}: {
  /** Vérifie l'offre avant de lancer (appli) : false bloque. */
  avantLancer?: () => boolean;
  /** Dans l'appli : liens vers « Mes clips ». */
  appli?: boolean;
}) {
  const [lien, setLien] = useState("");
  const [options, setOptions] = useState<OptionsClips>(OPTIONS_PAR_DEFAUT);
  const [etape, setEtape] = useState<"lien" | "reglages">("lien");
  const [id, setId] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatClips | null>(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const entreeFichier = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<{ nom: string; chemin?: string; part: number } | null>(null);

  // Ce que le joueur a dit à l'onboarding : son type de clip préféré, et le lien déjà collé
  useEffect(() => {
    import("@/lib/onboarding").then(({ lirePreferences, prendreLienEnAttente }) => {
      const style = lirePreferences()?.styleClips;
      if (style) setOptions((o) => ({ ...o, type: style === "auto" ? "meilleur" : style }));
      const enAttente = prendreLienEnAttente();
      if (enAttente) setLien(enAttente);
    });
  }, []);

  // Suivi : une question par seconde tant que les clips ne sont pas finis
  useEffect(() => {
    if (!id) return;
    let fini = false;
    const tour = async () => {
      const rep = await fetch(`/api/clips/${id}`, { cache: "no-store", headers: await enTetes() }).catch(() => null);
      if (rep?.ok) {
        const e = (await rep.json()) as EtatClips;
        setEtat(e);
        if (e.etape === "fini" || e.erreur) fini = true;
      }
      if (!fini) minuteur = setTimeout(tour, 1000);
    };
    let minuteur = setTimeout(tour, 300);
    return () => {
      fini = true;
      clearTimeout(minuteur);
    };
  }, [id]);

  function continuer() {
    setErreur("");
    if (fichier?.chemin) return setEtape("reglages");
    if (!/^https?:\/\/\S+\.\S+/.test(lien.trim())) {
      setErreur("Colle un lien complet, qui commence par https://");
      champ.current?.focus();
      return;
    }
    setEtape("reglages");
  }

  async function lancer() {
    if (avantLancer && !avantLancer()) return;
    setErreur("");
    setEnvoi(true);
    const rep = await fetch("/api/clips", { method: "POST", headers: { "content-type": "application/json", ...(await enTetes()) }, body: JSON.stringify(fichier?.chemin ? { fichier: fichier.chemin, options } : { lien: lien.trim(), options }) }).catch(() => null);
    setEnvoi(false);
    if (!rep?.ok) {
      const code = rep ? ((await rep.json().catch(() => ({}))) as { erreur?: string }).erreur : "";
      setErreur(
        code === "bientot" ? "Cette fonction arrive bientôt en ligne." : code === "quota" ? "Tu as utilisé tous tes clips du mois." : code === "heures" ? "Tu as utilisé toutes tes heures de vidéo du mois." : code === "non_connecte" ? "Connecte-toi pour lancer tes clips." : "Le lien n'est pas passé. Réessaie.",
      );
      setEtape("lien");
      return;
    }
    const { id: nouveau } = await rep.json();
    setEtat(null);
    setId(nouveau);
  }

  /** Envoi du fichier vidéo dans le stockage (compte connecté), avec l'avancement. */
  async function envoyerFichier(f: File) {
    setErreur("");
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      setErreur("Connecte-toi pour envoyer un fichier.");
      return;
    }
    const { cheminClip, deposer } = await import("@/lib/depot");
    const chemin = cheminClip(userId, f);
    setFichier({ nom: f.name, part: 0 });
    try {
      await deposer(f, chemin, (a) => setFichier({ nom: f.name, part: a.total ? a.envoye / a.total : 0 }));
      setFichier({ nom: f.name, chemin, part: 1 });
      setLien("");
    } catch {
      setFichier(null);
      setErreur("L'envoi n'est pas passé. Vérifie ta connexion et réessaie.");
    }
  }

  function recommencer() {
    setFichier(null);
    setEtape("lien");
    setId(null);
    setEtat(null);
    setLien("");
    setErreur("");
  }

  const source = fichier?.chemin ? { nom: "Fichier", texte: fichier.nom } : { nom: plateformeDe(lien), texte: lien.replace(/^https?:\/\/(www\.)?/, "") };
  const telecharger = (c: { fichier: string; url?: string }) => (c.url ? `${c.url}&download=xpclip-${c.fichier}` : `/api/clips/${id}/${c.fichier}?telecharger`);

  // 2. Les réglages
  if (!id && etape === "reglages") {
    return (
      <section aria-labelledby="t-studio">
        <Pas n={2} />
        <TetePage id="t-studio" titre="Ton style de clips" sous="Tout est déjà réglé. Change ce que tu veux." />
        <p className="ap-source">
          <span className="ap-pastille bg-turquoise">{source.nom}</span>
          <span>{source.texte}</span>
          <button type="button" onClick={() => setEtape("lien")}>
            Changer
          </button>
        </p>
        <Reglages options={options} changer={(o) => setOptions((x) => ({ ...x, ...o }))} />
        {erreur && (
          <p role="alert" className="mt-3 text-[14px] font-bold">
            {erreur}
          </p>
        )}
        <div className="ap-action">
          <button type="button" onClick={lancer} disabled={envoi} className="bouton bouton-rose">
            {envoi ? "J'envoie…" : `Créer mes ${options.nombre} clips`}
          </button>
        </div>
      </section>
    );
  }

  // 1. Le lien
  if (!id) {
    return (
      <section aria-labelledby="t-studio">
        <Pas n={1} />
        <TetePage
          id="t-studio"
          titre="Nouveaux clips"
          sous="Colle un lien ou envoie ton fichier. On trouve les meilleurs moments."
          action={
            appli ? (
              <Link href="/app/videos" className="bouton bouton-blanc bouton-petit hidden lg:inline-flex">
                Voir mes clips
              </Link>
            ) : undefined
          }
        />
        <div className="ap-carte ap-depart">
          <label htmlFor="lien" className="ap-libelle">
            Lien de la vidéo
          </label>
          <div className="cl">
            <div className="cl-boite">
              <svg viewBox="0 0 24 24" className="cl-icone" aria-hidden="true">
                <path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400l-1 1M14 10a4.500 4.500 0 00-6.400 0l-3 3a4.500 4.500 0 006.400 6.400l1-1" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" />
              </svg>
              <input
                id="lien"
                ref={champ}
                className="cl-champ"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://www.youtube.com/watch?v=…"
                value={lien}
                onChange={(e) => {
                  setLien(e.target.value);
                  setErreur("");
                }}
                onKeyDown={(e) => e.key === "Enter" && continuer()}
              />
              <button type="button" onClick={continuer} disabled={Boolean(fichier && !fichier.chemin)} className="gros gros-rose cl-go">
                Continuer
              </button>
            </div>
          </div>
          {erreur && (
            <p role="alert" className="cl-erreur !mt-0">
              {erreur}
            </p>
          )}
          <ul className="ap-plateformes" aria-label="Plateformes acceptées">
            {PLATEFORMES.map((p) => (
              <li key={p} className="ap-pastille bg-fond">
                {p}
              </li>
            ))}
          </ul>
          <p className="ap-ou">ou</p>
          <input
            ref={entreeFichier}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) envoyerFichier(f);
              e.target.value = "";
            }}
          />
          {fichier ? (
            <div className="ap-envoi">
              <p className="truncate text-[14px] font-bold">{fichier.nom}</p>
              <div className="ap-jauge mt-2">
                <span style={{ transform: `scaleX(${fichier.part})` }} />
              </div>
              <p className="mt-1.5 text-[12px] font-semibold text-encre2">{fichier.chemin ? "Fichier prêt." : `Envoi… ${Math.round(fichier.part * 100)} %`}</p>
              {fichier.chemin && (
                <button type="button" onClick={continuer} className="bouton bouton-rose mt-3 w-full">
                  Continuer avec ce fichier
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => entreeFichier.current?.click()} className="ap-depot">
              <span className="ap-depot-icone" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 16V4M7 9l5-5 5 5M5 20h14" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <b>Envoie ton fichier vidéo</b>
                <span>MP4 ou MOV, jusqu&apos;à 2 h.</span>
              </span>
            </button>
          )}
        </div>
        {appli && (
          <Link href="/app/videos" className="lien mt-5 inline-flex min-h-12 items-center text-[15px] font-bold lg:hidden">
            Voir mes clips
          </Link>
        )}
      </section>
    );
  }

  // Erreur
  if (etat?.erreur) {
    return (
      <section aria-labelledby="t-studio">
        <Pas n={3} />
        <TetePage id="t-studio" titre="Ça n'a pas marché." sous={etat.erreur} />
        <div className="ap-carte mt-5 max-w-[640px] p-5 lg:p-7">
          <p className="text-[16px] font-bold">Essaie avec un autre lien, ou envoie le fichier.</p>
          <p className="mt-1 text-[15px] text-encre2">Une vidéo publique, avec des gens qui parlent, marche le mieux.</p>
          <button type="button" onClick={recommencer} className="bouton bouton-rose mt-5 w-full">
            Essayer une autre vidéo
          </button>
        </div>
      </section>
    );
  }

  const fini = etat?.etape === "fini";
  const clips = etat?.clips ?? [];
  const moments = etat?.moments ?? [];
  const total = moments.length;
  const avance = etat ? avancementGlobal(etat) : 0;
  const indexEtape = fini ? ETAPES.length : Math.max(0, ETAPES.findIndex((x) => x.cle === etat?.etape));

  return (
    <section aria-labelledby="t-studio">
      <Pas n={fini ? 4 : 3} />
      <TetePage
        id="t-studio"
        titre={fini ? (clips.length > 1 ? `Tes ${clips.length} clips sont prêts.` : "Ton clip est prêt.") : "Montage en cours"}
        sous={fini ? "Regarde-les, garde les meilleurs et poste-les." : "Ça prend quelques minutes. Laisse cette page ouverte."}
        action={
          fini ? (
            <div className="ap-fin w-full lg:w-auto">
              {appli && (
                <Link href="/app/videos" className="bouton bouton-blanc shrink-0">
                  Mes clips
                </Link>
              )}
              <button type="button" onClick={recommencer} className="bouton bouton-rose">
                Une autre vidéo
              </button>
            </div>
          ) : undefined
        }
      />
      <div className={`ap-travail ${fini ? "ap-travail-fini" : ""}`}>
        {!fini && (
          <div className="ap-carte ap-suivi" role="status">
            <div className="ap-suivi-tete">
              <span className="ap-pastille bg-turquoise">{source.nom}</span>
              <b>{Math.round(avance * 100)} %</b>
            </div>
            <div className="ap-jauge" role="progressbar" aria-valuenow={Math.round(avance * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement">
              <span style={{ transform: `scaleX(${Math.max(0.03, avance)})` }} />
            </div>
            <ol className="ap-etapes">
              {ETAPES.map((x, i) => (
                <li key={x.cle} data-etat={i < indexEtape ? "fait" : i === indexEtape ? "encours" : "attente"}>
                  <Coche />
                  {x.libelle}
                  {x.cle === "montage" && i === indexEtape && total > 0 ? ` (${Math.min(clips.length + 1, total)} sur ${total})` : ""}
                </li>
              ))}
            </ol>
            {total > 0 && (
              <ul className="ap-moments" aria-label="Moments trouvés">
                {moments.map((m, i) => (
                  <li key={i}>
                    <Score valeur={m.score} />
                    <p>{m.titre}</p>
                    <span className="text-encre2">{i < clips.length ? "Prêt" : i === clips.length ? "Montage" : "En attente"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {clips.length || total ? (
          <div className="ap-clips">
            {clips.map((c) => (
              <CarteClip key={c.fichier} url={c.url ?? `/api/clips/${id}/${c.fichier}`} titre={c.titre} score={c.score} duree={c.duree} telecharger={telecharger(c)} />
            ))}
            {!fini &&
              moments.slice(clips.length).map((m, i) => (
                <div key={`attente-${i}`} className="ap-clip-attente">
                  <Score valeur={m.score} />
                  <span>{m.titre}</span>
                  {i === 0 && <span className="ap-roue" aria-hidden="true" />}
                </div>
              ))}
          </div>
        ) : (
          <div className="ap-vide">Tes clips arrivent ici, un par un.</div>
        )}
      </div>
    </section>
  );
}
