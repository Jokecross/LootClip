import type { Viewport } from "next";
import Link from "next/link";
import "./accueil.css";
import "./lp.css";
import { Boucle } from "@/components/accueil/Boucle";
import { ChampLien } from "@/components/accueil/ChampLien";
import { Interface } from "@/components/accueil/Interface";
import { Offres } from "@/components/accueil/Offres";
import { Reglages } from "@/components/accueil/Reglages";
import { BarreFixe } from "@/components/landing/BarreFixe";
import { DEMO } from "@/components/onboarding/demo";
import { LogoIcone } from "@/components/marque/Logo";
import { PiedDePage } from "@/components/PiedDePage";

/*
 * Accueil V6, « look outil » (décision de Martin du 26/11/2026) : la charte reste, le décor de jeu part.
 * Le champ du hero marche pour de vrai, l'interface du produit est au centre.
 * Les vidéos sont de vrais montages XPclip des parties de Martin (jamais de vidéos de tiers).
 */
export const viewport: Viewport = { themeColor: "#fdf5ea", width: "device-width", initialScale: 1, viewportFit: "cover" };

const LIENS = [
  { href: "#s-fonctions", nom: "Fonctionnalités" },
  { href: "#s-reglages", nom: "Réglages" },
  { href: "#s-offres", nom: "Tarifs" },
  { href: "#s-questions", nom: "Questions" },
];

const FAITS = [
  { chiffre: "2 h", texte: "de vidéo max" },
  { chiffre: "1080p", texte: "vertical 9:16" },
  { chiffre: "Mot à mot", texte: "sous-titres animés" },
  { chiffre: "Minutes", texte: "pas des heures" },
];

const ETAPES = [
  { titre: "Colle ton lien", texte: "YouTube, Twitch, Kick, X, ou ton fichier." },
  { titre: "Règle ton style", texte: "Type de clip, couleur, place des sous-titres, format." },
  { titre: "Télécharge tes clips", texte: "Prêts pour TikTok, Shorts et Reels." },
];

const PUBLICS = [
  { nom: "Streamers", texte: "Tes lives deviennent des clips. La facecam passe en haut.", fond: "bg-turquoise" },
  { nom: "Podcasts", texte: "Les meilleures phrases, cadrées sur la personne qui parle.", fond: "bg-jaune" },
  { nom: "Créateurs", texte: "Une vidéo longue, et tes clips de la semaine sont prêts.", fond: "bg-rose" },
  { nom: "Clippeurs", texte: "Le lien du créateur, et tu livres des clips propres.", fond: "bg-orange" },
];

const FAQ = [
  { q: "Quelles vidéos je peux coller ?", r: "Un lien YouTube, Twitch, Kick ou X. Tu peux aussi déposer ton fichier. Ta vidéo peut durer jusqu'à 2 heures." },
  { q: "Comment XPclip choisit les moments ?", r: "L'IA écoute toute la vidéo. Elle note chaque passage sur 100. Elle garde ceux qui accrochent, avec une vraie chute." },
  { q: "Je peux régler les sous-titres ?", r: "Oui. Tu choisis le type de clip, la couleur, le placement et le format. Tout se règle avant de lancer." },
  { q: "Ça prend combien de temps ?", r: "Quelques minutes pour une vidéo d'une heure. Tes clips arrivent un par un, prêts à poster." },
  { q: "Je dois savoir monter ?", r: "Non. Tu colles le lien. XPclip coupe, cadre, sous-titre et ajoute l'accroche." },
  { q: "Je peux couper la vidéo d'un autre ?", r: "Seulement si tu en as le droit. Tes vidéos, ou celles d'un créateur qui t'a donné son accord." },
  { q: "Je peux poster ailleurs que sur TikTok ?", r: "Oui. Le format vertical marche aussi sur YouTube Shorts et Instagram Reels." },
];

function Icone({ d }: { d: string }) {
  return (
    <span className="fn-icone" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function Accueil() {
  return (
    <div className="v4 lp">
      <nav className="lp-nav" aria-label="Menu">
        <Link href="/" className="flex items-center gap-2.5" aria-label="XPclip">
          <LogoIcone taille={36} className="rounded-[24%] ring-2 ring-encre" />
          <span className="titre text-[21px]">XPclip</span>
        </Link>
        <ul className="hidden items-center lg:flex">
          {LIENS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="nav-lien">
                {l.nom}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5 lg:gap-2">
          <Link href="/inscription?mode=connexion" className="nav-lien">
            Se connecter
          </Link>
          <Link href="/commencer" className="bouton bouton-rose bouton-petit hidden sm:inline-flex">
            Essayer
          </Link>
        </div>
      </nav>

      {/* 1. Hero : le champ marche, l'interface en dessous */}
      <header className="lp-hero">
        <p className="lp-badge">
          <span className="lp-point" aria-hidden="true" />
          🔥 GTA, c&apos;est la tendance n°1 sur TikTok
        </p>
        <h1 className="titre lp-deux">
          <span className="lp-t1">Tout le monde regarde GTA.</span>{" "}
          <span className="lp-t2">
            <span className="lp-surligne">
              Encaisse sur <br className="sm:hidden" />
              leurs vues.
            </span>
          </span>
        </h1>
        <p className="lp-sous">XPclip transforme n&apos;importe quelle vidéo GTA en clips viraux, prêts à poster. Zéro expérience requise.</p>
        <div id="cta-hero" className="lp-champ">
          <ChampLien libelle="Créer mon premier clip" />
          <small>Aucun montage, aucune expérience. Résiliation en deux clics.</small>
          <small className="lp-mention">Tes revenus dépendent de tes vues. Aucun n&apos;est garanti.</small>
        </div>
        <div className="lp-vitrine">
          <Interface />
        </div>
      </header>

      <ul className="lp-faits" aria-label="En bref">
        {FAITS.map((f) => (
          <li key={f.chiffre}>
            <b className="titre">{f.chiffre}</b>
            <span>{f.texte}</span>
          </li>
        ))}
      </ul>

      <main>
        {/* 2. Comment ça marche */}
        <section aria-labelledby="t-etapes" className="sect">
          <p className="lp-sur">Comment ça marche</p>
          <h2 id="t-etapes" className="titre lp-h2">
            Trois étapes. Zéro montage.
          </h2>
          <ol className="lp-etapes">
            {ETAPES.map((e, i) => (
              <li key={e.titre}>
                <span className="lp-num titre">{i + 1}</span>
                <h3 className="titre">{e.titre}</h3>
                <p>{e.texte}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. Fonctionnalités */}
        <section id="s-fonctions" aria-labelledby="t-fonctions" className="plein bg-blanc">
          <div className="sect">
            <p className="lp-sur">Fonctionnalités</p>
            <h2 id="t-fonctions" className="titre lp-h2">
              Tout le montage, fait pour toi.
            </h2>
            <div className="fn-grille">
              <article className="fn fn-large">
                <div className="fn-texte">
                  <Icone d="M12 3l2.400 5.600L20 9.300l-4.300 3.900L17 19l-5-3-5 3 1.300-5.800L4 9.300l5.600-.7z" />
                  <h3 className="titre">L&apos;IA repère les moments forts</h3>
                  <p>Elle écoute toute ta vidéo. Chaque passage reçoit une note sur 100. Tu gardes les meilleurs.</p>
                </div>
                <div className="fn-scene fn-frise" aria-hidden="true">
                  {Array.from({ length: 40 }, (_, i) => (
                    <i key={i} style={{ height: `${20 + ((i * 37 + (i % 5) * 11) % 72)}%` }} />
                  ))}
                  {[
                    { l: 6, w: 15, s: 90 },
                    { l: 40, w: 12, s: 86 },
                    { l: 70, w: 17, s: 82 },
                  ].map((m) => (
                    <b key={m.l} style={{ left: `${m.l}%`, width: `${m.w}%` }}>
                      <span>{m.s}</span>
                    </b>
                  ))}
                </div>
              </article>

              <article className="fn fn-haut">
                <div className="fn-scene fn-tel" aria-hidden="true">
                  <div className="m-tel-ecran">
                    <Boucle nom={DEMO.clips[1].nom} />
                  </div>
                </div>
                <div className="fn-texte">
                  <Icone d="M4 7h16M4 12h10M4 17h13" />
                  <h3 className="titre">Sous-titres mot à mot</h3>
                  <p>Le mot prononcé s&apos;allume. Tu choisis la couleur et la place.</p>
                </div>
              </article>

              <article className="fn fn-haut">
                <div className="fn-scene fn-cadrage" aria-hidden="true">
                  <span className="cad-large">
                    <i className="cad-cam" />
                    <i className="cad-jeu" />
                  </span>
                  <svg viewBox="0 0 24 24" className="cad-fleche">
                    <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="cad-vertical">
                    <i className="cad-cam" />
                    <i className="cad-jeu" />
                  </span>
                </div>
                <div className="fn-texte">
                  <Icone d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
                  <h3 className="titre">Cadrage automatique</h3>
                  <p>XPclip suit les visages. La facecam passe en haut, le jeu en bas.</p>
                </div>
              </article>

              <article className="fn fn-haut">
                <div className="fn-scene fn-accroche" aria-hidden="true">
                  <span className="acc-carte titre">Mandy cache un corps dans GTA 6</span>
                  <span className="acc-legende">Écrite par l&apos;IA, 3 premières secondes</span>
                </div>
                <div className="fn-texte">
                  <Icone d="M5 5h14v10H9l-4 4z" />
                  <h3 className="titre">Une accroche écrite</h3>
                  <p>Chaque clip s&apos;ouvre sur un titre qui donne envie de rester.</p>
                </div>
              </article>

              <article className="fn fn-large fn-sombre">
                <div className="fn-texte">
                  <Icone d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                  <h3 className="titre">Prêt à poster, partout</h3>
                  <p>1080 × 1920, son égalisé, sans filigrane. Tu télécharges et tu postes.</p>
                </div>
                <ul className="fn-reseaux" aria-label="Formats">
                  {["TikTok", "YouTube Shorts", "Instagram Reels"].map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* 4. Les réglages, à essayer */}
        <section id="s-reglages" aria-labelledby="t-reglages" className="sect">
          <Reglages />
        </section>

        {/* 5. Pour qui */}
        <section aria-labelledby="t-publics" className="plein bg-turquoise">
          <div className="sect">
            <h2 id="t-publics" className="titre lp-h2">
              Fait pour ceux qui filment long.
            </h2>
            <ul className="publics">
              {PUBLICS.map((p) => (
                <li key={p.nom} className="bloc overflow-hidden bg-blanc">
                  <p className={`titre border-b-2 border-encre px-5 py-4 text-[24px] lg:px-6 lg:text-[28px] ${p.fond}`}>{p.nom}</p>
                  <p className="px-5 py-4 text-[16px] leading-snug lg:px-6 lg:py-5 lg:text-[17px]">{p.texte}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Les offres */}
        <section id="s-offres" aria-labelledby="t-offres" className="sect">
          <p className="lp-sur">Tarifs</p>
          <h2 id="t-offres" className="titre lp-h2">
            Un prix simple, selon ton rythme.
          </h2>
          <Offres />
        </section>

        {/* 7. Les questions */}
        <section id="s-questions" aria-labelledby="t-faq" className="plein bg-blanc">
          <div className="sect">
            <div className="questions">
              <div className="questions-tete">
                <h2 id="t-faq" className="titre lp-h2 !text-left">
                  Une question&nbsp;?
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {FAQ.map(({ q, r }) => (
                  <details key={q} name="faq" className="question">
                    <summary>
                      {q}
                      <span aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="3.400" strokeLinecap="round" />
                        </svg>
                      </span>
                    </summary>
                    <p>{r}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 8. Le départ */}
        <section aria-labelledby="t-fin" className="lp-fin">
          <h2 id="t-fin" className="titre">
            Ton prochain clip est déjà dans ta vidéo.
          </h2>
          <div id="cta-fin" className="lp-champ">
            <ChampLien />
          </div>
        </section>
      </main>

      <PiedDePage />
      <BarreFixe />
    </div>
  );
}
