import Link from "next/link";
import { AvantApres } from "@/components/landing/AvantApres";
import { BarreFixe } from "@/components/landing/BarreFixe";
import { Logo } from "@/components/marque/Logo";
import { PiedDePage } from "@/components/PiedDePage";
import { GrilleTarifs } from "@/components/tarifs/GrilleTarifs";

const ETAPES = [
  { titre: "Joue et capture", texte: "Un appui sur la manette après chaque bon moment.", fond: "bg-jaune" },
  { titre: "Dépose tes clips", texte: "Depuis la galerie de ton téléphone.", fond: "bg-orange" },
  { titre: "Poste ta vidéo", texte: "Montée en 9:16, légende et hashtags prêts à coller.", fond: "bg-turquoise" },
];

const FAQ = [
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
    <section id={id ? `s-${id}` : undefined} aria-labelledby={id} className={`scroll-mt-4 border-t-2 border-encre px-4 py-12 sm:py-16 lg:px-8 lg:py-24 ${fond} ${sombre ? "text-fond" : ""}`}>
      <div className="mx-auto max-w-[560px] lg:max-w-[1120px]">{children}</div>
    </section>
  );
}

const TITRE_SECTION = "titre text-[32px] sm:text-[40px] lg:text-[56px]";

const LIENS = [
  { href: "#s-t-etapes", nom: "Comment ça marche" },
  { href: "#s-t-avap", nom: "Avant / après" },
  { href: "#s-t-tarifs", nom: "Tarifs" },
  { href: "#s-t-faq", nom: "Questions" },
];

export default function Accueil() {
  return (
    <>
      {/* 1. Hero */}
      <header className="px-4 pb-12 pt-4 lg:px-8 lg:pb-24 lg:pt-6">
        <div className="mx-auto max-w-[1080px] lg:max-w-[1120px]">
          <nav className="flex items-center justify-between gap-6">
            <Logo />
            <ul className="hidden items-center gap-1 lg:flex">
              {LIENS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="rounded-full px-4 py-2.5 text-[15px] font-bold hover:bg-beige">
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

          <div className="mt-8 grid items-center gap-8 lg:mt-20 lg:grid-cols-[1fr_1.12fr] lg:gap-16">
            <div className="entree">
              <span className="pastille bg-turquoise lg:text-[14px]">Pour les joueurs PS5 et Xbox</span>
              <h1 className="titre mt-4 text-[44px] sm:text-[64px] lg:mt-6 lg:text-[76px] xl:text-[84px]">Ta manette peut devenir un salaire.</h1>
              <p className="mt-4 max-w-[34ch] text-[17px] leading-snug text-encre2 lg:mt-6 lg:text-[21px]">
                Tes clips GTA 6, montés pour TikTok en quelques minutes.
              </p>
              <div id="cta-hero" className="mt-6 sm:max-w-[380px] lg:mt-9">
                <Link href="/commencer" className="bouton bouton-rose w-full lg:h-[60px] lg:text-[19px]">
                  Créer ma première vidéo
                </Link>
                <p className="mt-3 text-center text-[13px] text-encre2 lg:text-left lg:text-[14px]">Gratuit pour la première. Sans carte bancaire.</p>
              </div>
            </div>
            {/* Visuel du hero : image fournie par Martin (public/visuels/hero-*.jpg) */}
            <div className="carte-forte mx-auto w-full max-w-[560px] overflow-hidden lg:max-w-none lg:rotate-[1.5deg]">
              <img
                src="/visuels/hero-1672.jpg"
                srcSet="/visuels/hero-900.jpg 900w, /visuels/hero-1672.jpg 1672w"
                sizes="(min-width: 1024px) 620px, 100vw"
                width={1672}
                height={941}
                alt="Coucher de soleil néon sur une ville côtière, avec le logo XP et sa barre d'expérience"
                fetchPriority="high"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Trois étapes */}
        <Section fond="bg-blanc" id="t-etapes">
          <h2 id="t-etapes" className={TITRE_SECTION}>
            Trois étapes, cinq minutes.
          </h2>
          <ol className="mt-6 flex flex-col gap-3 lg:mt-12 lg:grid lg:grid-cols-3 lg:gap-6">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className={`carte flex items-center gap-4 bg-fond p-4 lg:flex-col lg:items-start lg:gap-10 lg:p-7 ${i === 1 ? "lg:-rotate-1" : i === 2 ? "lg:rotate-1" : ""}`}>
                <span className={`titre grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-encre text-[20px] lg:h-16 lg:w-16 lg:rounded-2xl lg:text-[30px] lg:shadow-[0_4px_0_var(--color-encre)] ${e.fond}`}>{i + 1}</span>
                <span>
                  <span className="titre block text-[18px] font-bold tracking-[-0.01em] lg:text-[28px]">{e.titre}</span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-encre2 lg:mt-2 lg:text-[17px]">{e.texte}</span>
                </span>
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
              Moins d&apos;un euro par jour.
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
        <Section fond="bg-jaune" id="t-fin">
          <div className="lg:flex lg:items-center lg:justify-between lg:gap-12">
          <h2 id="t-fin" className="titre text-[34px] sm:text-[44px] lg:text-[64px]">
            Ta prochaine session peut payer.
          </h2>
          <div id="cta-fin" className="mt-6 lg:mt-0 lg:w-[380px] lg:shrink-0">
            <Link href="/commencer" className="bouton bouton-rose w-full lg:h-[64px] lg:text-[20px]">
              Créer ma première vidéo
            </Link>
            <p className="mt-3 hidden text-center text-[14px] font-bold lg:block">Gratuit pour la première. Sans carte bancaire.</p>
          </div>
          </div>
        </Section>
      </main>

      <PiedDePage />
      <BarreFixe />
    </>
  );
}
