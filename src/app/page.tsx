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

function Section({ fond, children, id, sombre = false }: { fond: string; children: React.ReactNode; id?: string; sombre?: boolean }) {
  return (
    <section aria-labelledby={id} className={`border-t-2 border-encre px-4 py-12 sm:py-16 ${fond} ${sombre ? "text-fond" : ""}`}>
      <div className="mx-auto max-w-[560px]">{children}</div>
    </section>
  );
}

export default function Accueil() {
  return (
    <>
      {/* 1. Hero */}
      <header className="px-4 pb-12 pt-4">
        <div className="mx-auto max-w-[1080px]">
          <nav className="flex items-center justify-between">
            <Logo />
            <Link href="/inscription?mode=connexion" className="bouton bouton-blanc bouton-petit">
              Se connecter
            </Link>
          </nav>

          <div className="mt-8 grid items-center gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-14">
            <div className="entree">
              <span className="pastille bg-turquoise">Pour les joueurs PS5 et Xbox</span>
              <h1 className="titre mt-4 text-[44px] sm:text-[64px]">Ta manette peut devenir un salaire.</h1>
              <p className="mt-4 max-w-[34ch] text-[17px] leading-snug text-encre2">
                Tes clips GTA 6, montés pour TikTok en quelques minutes.
              </p>
              <div id="cta-hero" className="mt-6 sm:max-w-[380px]">
                <Link href="/commencer" className="bouton bouton-rose w-full">
                  Créer ma première vidéo
                </Link>
                <p className="mt-3 text-center text-[13px] text-encre2">Gratuit pour la première. Sans carte bancaire.</p>
              </div>
            </div>
            {/* Visuel du hero : image fournie par Martin (public/visuels/hero-*.jpg) */}
            <div className="carte-forte mx-auto w-full max-w-[560px] overflow-hidden">
              <img
                src="/visuels/hero-1672.jpg"
                srcSet="/visuels/hero-900.jpg 900w, /visuels/hero-1672.jpg 1672w"
                sizes="(min-width: 1024px) 560px, 100vw"
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
          <h2 id="t-etapes" className="titre text-[32px] sm:text-[40px]">
            Trois étapes, cinq minutes.
          </h2>
          <ol className="mt-6 flex flex-col gap-3">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="carte flex items-center gap-4 bg-fond p-4">
                <span className={`titre grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-encre text-[20px] ${e.fond}`}>{i + 1}</span>
                <span>
                  <span className="titre block text-[18px] font-bold tracking-[-0.01em]">{e.titre}</span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-encre2">{e.texte}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. Avant / après */}
        <Section fond="bg-encre" id="t-avap" sombre>
          <h2 id="t-avap" className="titre text-[32px] sm:text-[40px]">
            De ta capture à ta vidéo.
          </h2>
          <div className="mt-6">
            <AvantApres />
          </div>
        </Section>

        {/* 5. Tarifs */}
        <Section fond="bg-fond" id="t-tarifs">
          <h2 id="t-tarifs" className="titre text-[32px] sm:text-[40px]">
            Moins d&apos;un euro par jour.
          </h2>
          <div className="mt-6">
            <GrilleTarifs compacte />
          </div>
        </Section>

        {/* 6. Questions */}
        <Section fond="bg-blanc" id="t-faq">
          <h2 id="t-faq" className="titre text-[32px] sm:text-[40px]">
            Tes questions.
          </h2>
          <div className="mt-6 flex flex-col gap-3">
            {FAQ.map(({ q, r }, i) => (
              <details key={q} className="carte group bg-fond" open={i === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[16px] font-bold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="titre text-[22px] leading-none transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-[14px] leading-relaxed text-encre2">{r}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* 7. Rappel final */}
        <Section fond="bg-jaune" id="t-fin">
          <h2 id="t-fin" className="titre text-[34px] sm:text-[44px]">
            Ta prochaine session peut payer.
          </h2>
          <div id="cta-fin" className="mt-6">
            <Link href="/commencer" className="bouton bouton-rose w-full">
              Créer ma première vidéo
            </Link>
          </div>
        </Section>
      </main>

      <PiedDePage />
      <BarreFixe />
    </>
  );
}
