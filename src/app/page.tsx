import Link from "next/link";
import { AvantApres } from "@/components/landing/AvantApres";
import { BarreFixe } from "@/components/landing/BarreFixe";
import { Logo } from "@/components/marque/Logo";
import { Ancre } from "@/components/monde/Ancre";
import { Pieces } from "@/components/landing/Pieces";
import { SceneAccroche } from "@/components/onboarding/Ecrans";
import { Mots } from "@/components/ui/Duo";
import { PiedDePage } from "@/components/PiedDePage";
import { GrilleTarifs } from "@/components/tarifs/GrilleTarifs";

const ETAPES = [
  { titre: "Joue à GTA 6", texte: "Un appui sur ta manette garde chaque bon moment.", fond: "bg-jaune", couleur: "turquoise" },
  { titre: "Dépose tes clips", texte: "Les tiens, ceux de ta console. XPclip les monte.", fond: "bg-orange", couleur: "orange" },
  { titre: "Poste ta vidéo", texte: "Plus tu fais de vues, plus ça peut rapporter.", fond: "bg-turquoise", couleur: "jaune" },
];

const FAQ = [
  { q: "Comment mes parties peuvent me payer ?", r: "Tu postes tes vidéos sur tes propres comptes. Plus elles font de vues, plus elles peuvent rapporter. Le montant dépend de tes vues : rien n'est garanti." },
  { q: "C'est du clipping ?", r: "Non. Le clipping reprend les vidéos des autres. Ici, tu postes tes propres parties, jouées sur ta console." },
  {
    q: "Comment je sors mes clips de la PS5 ?",
    r: "Tu actives l'envoi automatique des captures. Tes clips arrivent dans l'appli PlayStation de ton téléphone. Tu les enregistres dans ta galerie, puis tu les déposes ici. Sur Xbox, c'est pareil avec l'appli Xbox.",
  },
  { q: "Ça prend combien de temps ?", r: "Le temps d'envoyer tes clips, puis une minute de montage. Tu reçois une notification quand ta vidéo est prête." },
  { q: "Je dois savoir monter ?", r: "Non. XPclip choisit les meilleurs passages, les assemble en vertical et ajoute l'accroche. Tu n'as plus qu'à poster." },
  { q: "Je dois montrer mon visage ?", r: "Non. Tes vidéos montrent ton jeu, pas toi." },
  { q: "Je peux poster ailleurs que sur TikTok ?", r: "Oui. Le format 9:16 marche aussi sur YouTube Shorts et Instagram Reels." },
];

/** Une section : colonne de 560 px sur téléphone, 1120 px sur ordinateur. */
function Section({ fond, children, id, sombre = false }: { fond: string; children: React.ReactNode; id?: string; sombre?: boolean }) {
  return (
    <section id={id ? `s-${id}` : undefined} aria-labelledby={id} className={`relative scroll-mt-4 border-t-2 border-encre px-4 py-12 sm:py-16 lg:px-8 lg:py-24 ${fond} ${sombre ? "text-fond" : ""}`}>
      <div className="relative mx-auto max-w-[560px] lg:max-w-[1240px]">{children}</div>
    </section>
  );
}

const TITRE_SECTION = "titre text-[32px] sm:text-[40px] lg:text-[60px]";

const LIENS = [
  { href: "#s-t-etapes", nom: "Comment ça marche" },
  { href: "#s-t-avap", nom: "Avant / après" },
  { href: "#s-t-tarifs", nom: "Tarifs" },
  { href: "#s-t-faq", nom: "Questions" },
];

export default function Accueil() {
  return (
    <div className="v3 overflow-x-clip">
      {/* 1. Hero */}
      <header className="relative px-4 pb-6 pt-4 lg:flex lg:min-h-[max(94dvh,640px)] lg:flex-col lg:px-8 lg:pb-8 lg:pt-6">
        <div className="relative mx-auto lg:flex lg:w-full lg:max-w-[1500px] lg:flex-1 lg:flex-col">
          <nav className="relative z-20 flex items-center justify-between gap-6">
            <Logo />
            <ul className="hidden items-center gap-1 lg:flex">
              {LIENS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="rounded-full px-4 py-2.5 text-[15px] font-bold hover:bg-blanc/60">
                    {l.nom}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2.5">
              <Link href="/inscription?mode=connexion" className="bouton bouton-blanc bouton-petit">
                Se connecter
              </Link>
              <Link href="/commencer" className="bouton bouton-rose bouton-petit hidden lg:inline-flex">
                Commencer
              </Link>
            </div>
          </nav>

          <div className="mt-7 lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-[4vw] lg:pl-[2vw]">
            <div className="relative z-20">
              <span className="pastille bg-turquoise lg:text-[14px]">Pour les joueurs PS5 et Xbox</span>
              <h1 className="titre mt-4 text-[44px] sm:text-[64px] lg:mt-6 lg:text-[clamp(56px,min(6vw,11.4vh),112px)]">
                <Mots>Tes parties de GTA 6 peuvent te payer.</Mots>
              </h1>
              <p className="mt-4 max-w-[34ch] text-[17px] leading-snug text-encre2 lg:mt-6 lg:text-[clamp(19px,1.5vw,26px)]">Tu joues sur ta console. XPclip monte tes propres clips. Tu postes.</p>
              <div id="cta-hero" className="mt-6 sm:max-w-[400px] lg:mt-9">
                <Link href="/commencer" className="bouton bouton-rose w-full lg:h-[64px] lg:text-[20px]">
                  Créer ma première vidéo
                </Link>
                <p className="mt-3 text-center text-[13px] text-encre2 lg:text-left lg:text-[14px]">Sans engagement. Résiliation en deux clics.</p>
              </div>
            </div>
            <div className="mt-2 flex h-[420px] lg:mt-6 lg:h-[calc(100%-24px)] lg:rounded-[36px] lg:bg-(--p-jaune) lg:p-8">
              <SceneAccroche />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Trois étapes : les objets descendent avec la page */}
        <Section fond="bg-blanc" id="t-etapes">
          <h2 id="t-etapes" className={TITRE_SECTION}>
            Ton jeu, tes clips, tes vidéos.
          </h2>
          <ol className="mt-6 flex flex-col gap-4 lg:mt-12 lg:grid lg:grid-cols-3 lg:gap-7">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="carte flex flex-col overflow-hidden rounded-[24px] bg-blanc lg:rounded-[28px]">
                <div className="relative h-[210px] lg:h-[300px]" style={{ background: `var(--p-${e.couleur})` }}>
                  {i === 0 && <Ancre nom="manette" className="absolute inset-x-[12%] inset-y-[12%]" pose={{ ry: -0.25, rx: -0.3, rz: -0.05 }} />}
                  {i === 1 && (
                    <>
                      <Ancre nom="clip1" className="absolute left-[9%] top-[12%] h-[50%] w-[56%]" pose={{ ry: 0.25, rz: 0.07 }} />
                      <Ancre nom="clip0" className="absolute bottom-[12%] right-[9%] h-[50%] w-[56%]" pose={{ ry: -0.25, rz: -0.06, z: 60 }} />
                    </>
                  )}
                  {i === 2 && <Ancre nom="telephone" className="absolute inset-x-0 inset-y-[7%]" pose={{ ry: -0.25, rz: 0.03 }} donnees={{ ecran: "jeu", coupe: 2.2 }} />}
                </div>
                <div className="relative z-20 border-t-2 border-encre p-5 lg:p-7">
                  <p className="text-[13px] font-bold text-encre2 lg:text-[15px]">Étape {i + 1}</p>
                  <h3 className="titre mt-1 text-[24px] lg:text-[32px]">{e.titre}</h3>
                  <p className="mt-1.5 text-[14px] leading-snug text-encre2 lg:mt-2.5 lg:text-[17px]">{e.texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. Avant / après */}
        <Section fond="bg-encre" id="t-avap" sombre>
          <h2 id="t-avap" className={TITRE_SECTION}>
            De ta capture à ta vidéo.
          </h2>
          <div className="mt-6 lg:mt-14">
            <AvantApres />
          </div>
        </Section>

        {/* 5. Tarifs */}
        <Section fond="bg-fond" id="t-tarifs">
          <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
            <h2 id="t-tarifs" className={TITRE_SECTION}>
              Choisis ton rythme.
            </h2>
            <p className="mt-2 hidden max-w-[30ch] text-[17px] text-encre2 lg:block">Sans engagement. Tu changes d&apos;offre quand tu veux.</p>
          </div>
          <div className="mt-6 lg:mt-12">
            <GrilleTarifs compacte />
          </div>
        </Section>

        {/* 6. Questions */}
        <Section fond="bg-blanc" id="t-faq">
          <div className="lg:grid lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <h2 id="t-faq" className={TITRE_SECTION}>
              Tes questions.
            </h2>
            <p className="mt-4 hidden max-w-[28ch] text-[17px] text-encre2 lg:block">Tout ce qu&apos;il faut savoir avant ta première vidéo.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 lg:mt-0">
            {FAQ.map(({ q, r }, i) => (
              <details key={q} className="carte group bg-fond" open={i === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[16px] font-bold lg:min-h-16 lg:px-6 lg:text-[18px] [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="titre text-[22px] leading-none transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-[14px] leading-relaxed text-encre2 lg:px-6 lg:pb-6 lg:text-[16px]">{r}</p>
              </details>
            ))}
          </div>
          </div>
        </Section>

        {/* 7. Rappel final */}
        <section id="s-t-fin" aria-labelledby="t-fin" className="relative border-t-2 border-encre bg-(--p-jaune) px-4 pb-8 pt-12 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-[560px] lg:grid lg:max-w-[1240px] lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            <div className="relative z-20">
              <h2 id="t-fin" className="titre text-[38px] sm:text-[48px] lg:text-[72px]">
                Ta prochaine session peut payer.
              </h2>
              <div id="cta-fin" className="mt-6 sm:max-w-[380px] lg:mt-10">
                <Link href="/commencer" className="bouton bouton-rose w-full lg:h-[64px] lg:text-[20px]">
                  Créer ma première vidéo
                </Link>
                <p className="mt-3 text-center text-[13px] font-bold lg:text-left lg:text-[14px]">Sans engagement. Résiliation en deux clics.</p>
              </div>
            </div>
            <div className="relative mt-6 h-[260px] lg:mt-0 lg:h-[400px]">
              <Pieces />
            </div>
          </div>
        </section>
      </main>

      <div className="relative z-20 bg-fond">
        <PiedDePage />
      </div>
      <BarreFixe />
    </div>
  );
}
