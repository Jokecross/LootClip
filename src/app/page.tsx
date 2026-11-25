import Link from "next/link";
import "./accueil.css";
import { Machine } from "@/components/accueil/Machine";
import { Objectif } from "@/components/accueil/Objectif";
import { Offres } from "@/components/accueil/Offres";
import { Styles } from "@/components/accueil/Styles";
import { BarreFixe } from "@/components/landing/BarreFixe";
import { LogoIcone } from "@/components/marque/Logo";
import { Objet } from "@/components/objets/Objet";
import { PiedDePage } from "@/components/PiedDePage";

/*
 * Accueil V4. Une idée : on voit la machine tourner. Ta partie entre, ta vidéo sort.
 * Les scènes de jeu sont dessinées par nous (outils/scenes) et montées par le vrai moteur.
 */
const FAQ = [
  { q: "Comment mes parties peuvent me payer ?", r: "Tu postes tes vidéos sur tes propres comptes. Plus elles font de vues, plus elles peuvent rapporter. Le montant dépend de tes vues : rien n'est garanti." },
  { q: "C'est du clipping ?", r: "Non. Le clipping reprend les vidéos des autres. Ici, tu postes tes propres parties, jouées sur ta console." },
  {
    q: "Comment je sors mes clips de la PS5 ?",
    r: "Tu actives l'envoi automatique des captures. Tes clips arrivent dans l'appli PlayStation de ton téléphone. Tu les enregistres dans ta galerie, puis tu les déposes ici. Sur Xbox, c'est pareil avec l'appli Xbox.",
  },
  { q: "Ça prend combien de temps ?", r: "Le temps d'envoyer tes clips, puis une minute de montage. Tu reçois une notification quand ta vidéo est prête." },
  { q: "Je dois savoir monter ?", r: "Non. XPclip choisit les meilleurs passages, les assemble en vertical et ajoute l'accroche. Tu n'as plus qu'à poster." },
  { q: "Je dois montrer mon visage ?", r: "Non. Tes vidéos montrent ton jeu, pas toi." },
  { q: "Je peux poster ailleurs que sur TikTok ?", r: "Oui. Le format 9:16 marche aussi sur YouTube Shorts et Instagram Reels." },
];

const LIENS = [
  { href: "#s-etapes", nom: "Comment ça marche" },
  { href: "#s-styles", nom: "Les styles" },
  { href: "#s-offres", nom: "Tarifs" },
  { href: "#s-questions", nom: "Questions" },
];

const Coche = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#6FE3D6" stroke="#1A0B2E" strokeWidth="2" />
    <path d="M7.500 12.400l3 3 6-6.400" fill="none" stroke="#1A0B2E" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ETAPES = [
  {
    titre: "Joue.",
    texte: "Un bon moment ? Un bouton, et ton clip est gardé.",
    fond: "bg-turquoise",
    scene: (
      <>
        <Objet nom="manette" className="absolute inset-x-[14%] bottom-[8%] top-[24%]" plusTard />
        <span className="toast-clip">
          <Coche /> Clip gardé
        </span>
      </>
    ),
  },
  {
    titre: "Dépose.",
    texte: "Choisis tes clips. XPclip monte la vidéo en une minute.",
    fond: "bg-orange",
    scene: (
      <div className="pile">
        {["chien", "canard", "saut"].map((n, i) => (
          <span key={n} style={{ "--i": i } as React.CSSProperties}>
            <img src={`/v4/${n}.webp`} alt="" width={480} height={270} loading="lazy" />
            <b>
              <Coche />
            </b>
          </span>
        ))}
      </div>
    ),
  },
  {
    titre: "Poste.",
    texte: "TikTok, Reels ou Shorts. Tes vues peuvent payer.",
    fond: "bg-jaune",
    scene: (
      <>
        <div className="tel-carte">
          <div className="m-tel-ecran">
            <img src="/v4/drole.webp" alt="" width={432} height={768} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
        <span className="publiee titre">Publiée !</span>
      </>
    ),
  },
];

export default function Accueil() {
  return (
    <div className="v4">
      <nav className="nav" aria-label="Menu">
        <Link href="/" className="flex items-center gap-2.5" aria-label="XPclip">
          <LogoIcone taille={38} className="rounded-[24%] ring-2 ring-encre" />
          <span className="titre text-[22px]">XPclip</span>
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
          <Link href="/commencer" className="bouton bouton-rose bouton-petit hidden lg:inline-flex">
            Commencer
          </Link>
        </div>
        <span className="nav-xp" aria-hidden="true">
          <i />
        </span>
      </nav>

      {/* 1. La machine */}
      <header className="hero">
        {["nuage-a", "nuage-b"].map((n) => (
          <svg key={n} viewBox="0 -10 160 96" className={`nuage ${n}`} aria-hidden="true">
            <path d="M28 78a24 24 0 0 1-3-47.800A36 36 0 0 1 92 18a30 30 0 0 1 40 20 20.500 20.500 0 0 1-2 40z" fill="currentColor" stroke="#1A0B2E" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        ))}
        <div className="hero-texte relative">
          <h1 className="titre">
            Tes parties de GTA&nbsp;6 peuvent te <span className="mot-fort">payer.</span>
          </h1>
          <p>Tu joues sur ta console. XPclip monte tes clips.</p>
          <div id="cta-hero">
            <Link href="/commencer" className="gros gros-rose gros-xl">
              Créer ma première vidéo
            </Link>
            <small>Sans engagement. Résiliation en deux clics.</small>
          </div>
        </div>
        <Machine />
      </header>

      <main>
        {/* 2. Les étapes, en escalier */}
        <section id="s-etapes" aria-labelledby="t-etapes" className="sect">
          <h2 id="t-etapes" className="titre titre-v4 text-center">
            Trois gestes. C&apos;est tout.
          </h2>
          <ol className="escalier">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="bloc overflow-hidden bg-blanc">
                <div className={`relative h-[240px] overflow-hidden border-b-2 border-encre lg:h-[320px] ${e.fond}`}>
                  <span className="numero titre">{i + 1}</span>
                  {e.scene}
                </div>
                <div className="p-6 lg:p-8">
                  <h3 className="titre text-[34px] lg:text-[46px]">{e.titre}</h3>
                  <p className="mt-2.5 text-[17px] leading-snug lg:text-[20px]">{e.texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. Les styles */}
        <section id="s-styles" aria-labelledby="t-styles" className="plein bg-turquoise">
          <div className="sect">
            <Styles />
          </div>
        </section>

        {/* 4. La roue */}
        <section aria-labelledby="t-objectif" className="sect">
          <Objectif />
        </section>

        {/* 5. Les offres */}
        <section id="s-offres" aria-labelledby="t-offres" className="plein bg-blanc">
          <div className="sect">
            <h2 id="t-offres" className="titre titre-v4 text-center">
              Choisis ton rythme.
            </h2>
            <Offres />
          </div>
        </section>

        {/* 6. Les questions */}
        <section id="s-questions" aria-labelledby="t-faq" className="sect">
          <div className="questions">
            <div className="questions-tete">
              <h2 id="t-faq" className="titre titre-v4">
                Une question&nbsp;?
              </h2>
              <img src="/v4/duck.webp" alt="" width={520} height={440} loading="lazy" className="duck" />
            </div>
            <div className="flex flex-col gap-3.5">
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
        </section>

        {/* 7. Le départ */}
        <section aria-labelledby="t-fin" className="depart">
          <h2 id="t-fin" className="titre">
            Ta prochaine session peut payer.
          </h2>
          <div id="cta-fin">
            <Link href="/commencer" className="arcade titre" aria-label="Créer ma première vidéo">
              <span>Start</span>
            </Link>
          </div>
          <p>Sans engagement. Résiliation en deux clics.</p>
          <div className="route" aria-hidden="true">
            <span className="voiture">
              <img src="/v4/voiture.webp" alt="" width={820} height={400} loading="lazy" />
            </span>
          </div>
        </section>
      </main>

      <PiedDePage />
      <BarreFixe />
    </div>
  );
}
