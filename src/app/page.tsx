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
  { titre: "Poste ta vidéo", texte: "Plus tu fais de vues, plus ça peut rapporter.", fond: "bg-turquoise", couleur: "rose" },
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
    <section id={id ? `s-${id}` : undefined} aria-labelledby={id} className={`relative scroll-mt-4 border-t-[4px] border-encre px-4 py-12 sm:py-16 lg:px-8 lg:py-24 ${fond} ${sombre ? "text-fond" : ""}`}>
      <div className="relative z-20 mx-auto max-w-[560px] lg:max-w-[1240px]">{children}</div>
    </section>
  );
}

const TITRE_SECTION = "titre text-[38px] leading-[0.95] sm:text-[48px] lg:text-[clamp(56px,5.4vw,100px)]";

/** Fond rayonnant d'une section. */
function Rayons({ couleur, x = "68%", y = "52%" }: { couleur: string; x?: string; y?: string }) {
  return (
    <span className="absolute inset-0 block overflow-hidden" style={{ background: `var(--color-${couleur})` }} aria-hidden="true">
      <span className="rayons" style={{ left: x, top: y, "--r": `color-mix(in srgb, var(--color-${couleur}), white 24%)` } as React.CSSProperties} />
      <span className="trame" style={{ "--p": `color-mix(in srgb, var(--color-${couleur}), var(--color-encre) 16%)` } as React.CSSProperties} />
    </span>
  );
}

const RUBAN = ["Ton jeu", "Tes clips", "Tes vidéos", "PS5 et Xbox", "TikTok et Instagram"];

function Ruban() {
  return (
    <div className="relative z-20 -rotate-[1.2deg] overflow-hidden border-y-[4px] border-encre bg-encre py-3.5 lg:py-6" aria-hidden="true" style={{ width: "104%", marginLeft: "-2%" }}>
      <div className="ruban">
        {[0, 1].map((k) => (
          <span key={k} className="flex">
            {[...RUBAN, ...RUBAN].map((t, i) => (
              <span key={i} className={`titre flex items-center whitespace-nowrap text-[26px] lg:text-[54px] ${["text-jaune", "text-rose", "text-turquoise", "text-orange", "text-fond"][i % 5]}`}>
                {t}
                <svg viewBox="0 0 24 24" className="mx-5 h-5 w-5 fill-fond lg:mx-10 lg:h-9 lg:w-9">
                  <path d="M12 1l3.1 7.4 8 .7-6.1 5.2 1.9 7.8L12 17.9 5.1 22.1 7 14.3.9 9.1l8-.7z" />
                </svg>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

const LIENS = [
  { href: "#s-t-etapes", nom: "Comment ça marche" },
  { href: "#s-t-avap", nom: "Avant / après" },
  { href: "#s-t-tarifs", nom: "Tarifs" },
  { href: "#s-t-faq", nom: "Questions" },
];

export default function Accueil() {
  return (
    <div className="v2 overflow-x-clip">
      {/* 1. Hero */}
      <header className="relative px-4 pb-6 pt-4 lg:flex lg:min-h-[max(94dvh,640px)] lg:flex-col lg:px-[4.5vw] lg:pb-10 lg:pt-7">
        <Rayons couleur="jaune" />
        <div className="relative lg:flex lg:flex-1 lg:flex-col">
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

          <div className="mt-7 lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:gap-[2vw]">
            <div className="relative z-20">
              <span className="pastille bg-turquoise lg:min-h-10 lg:px-5 lg:text-[17px]">Pour les joueurs PS5 et Xbox</span>
              <h1 className="titre mt-4 text-[50px] leading-[0.92] sm:text-[68px] lg:mt-7 lg:text-[clamp(64px,min(7.2vw,13.4vh),160px)]">
                <Mots>Tes parties de GTA 6 peuvent te payer.</Mots>
              </h1>
              <p className="mt-4 max-w-[34ch] text-[17px] font-medium leading-snug lg:mt-7 lg:text-[clamp(20px,1.7vw,30px)]">Tu joues sur ta console. XPclip monte tes propres clips. Tu postes.</p>
              <div id="cta-hero" className="mt-6 sm:max-w-[400px] lg:mt-9">
                <Link href="/commencer" className="bouton bouton-rose w-full lg:h-[80px] lg:rounded-[22px] lg:text-[24px] lg:font-extrabold">
                  Créer ma première vidéo
                </Link>
                <p className="mt-3 text-center text-[13px] font-bold lg:mt-4 lg:text-left lg:text-[15px]">Sans engagement. Résiliation en deux clics.</p>
              </div>
            </div>
            <div className="mt-6 flex h-[420px] lg:mt-0 lg:h-full">
              <SceneAccroche />
            </div>
          </div>
        </div>
      </header>

      <Ruban />

      <main>
        {/* 2. Trois étapes : les objets descendent avec la page */}
        <section id="s-t-etapes" aria-labelledby="t-etapes" className="relative scroll-mt-4 px-4 py-14 lg:px-[4.5vw] lg:py-28">
          <h2 id="t-etapes" className="titre relative z-20 text-center text-[40px] leading-[0.95] sm:text-[52px] lg:text-[clamp(64px,6.4vw,120px)]">
            Ton jeu, tes clips, tes vidéos.
          </h2>
          <ol className="mx-auto mt-8 flex max-w-[560px] flex-col gap-6 lg:mt-16 lg:max-w-[1500px] lg:gap-10">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className={`relative overflow-clip rounded-[30px] border-[4px] border-encre shadow-[0_10px_0_var(--color-encre)] lg:grid lg:min-h-[min(74vh,640px)] lg:items-center lg:rounded-[56px] lg:shadow-[0_18px_0_var(--color-encre)] ${i % 2 ? "lg:grid-cols-[1.15fr_1fr]" : "lg:grid-cols-[1fr_1.15fr]"}`}>
                <Rayons couleur={e.couleur} x={i % 2 ? "30%" : "72%"} />
                <div className={`relative z-20 p-6 lg:p-16 ${i % 2 ? "lg:order-2" : ""}`}>
                  <span className="titre block text-[92px] leading-[0.8] lg:text-[clamp(140px,15vw,280px)]">{i + 1}</span>
                  <h3 className="titre mt-4 text-[34px] lg:mt-8 lg:text-[clamp(48px,4.8vw,92px)]">{e.titre}</h3>
                  <p className="mt-2 text-[16px] font-medium leading-snug lg:mt-5 lg:text-[clamp(20px,1.6vw,28px)]">{e.texte}</p>
                </div>
                <div className={`relative h-[300px] lg:h-full ${i % 2 ? "lg:order-1" : ""}`}>
                  {i === 0 && <Ancre nom="manette" className="absolute inset-[4%]" pose={{ ry: -0.3, rx: -0.35, rz: -0.08, z: 120 }} donnees={{ valeur: 1 }} />}
                  {i === 1 && (
                    <>
                      <Ancre nom="clip1" className="absolute left-[4%] top-[6%] h-[46%] w-[58%]" pose={{ ry: 0.4, rz: 0.12, flotte: 12, z: 40 }} />
                      <Ancre nom="clip0" className="absolute right-[4%] top-[24%] h-[46%] w-[58%]" pose={{ ry: -0.35, rz: -0.1, flotte: 14, z: 120 }} />
                      <Ancre nom="clip2" className="absolute bottom-[4%] left-[14%] h-[46%] w-[58%]" pose={{ ry: 0.2, rz: 0.06, flotte: 10, z: 180 }} />
                    </>
                  )}
                  {i === 2 && <Ancre nom="telephone" className="absolute inset-x-0 inset-y-[3%]" pose={{ ry: -0.3, rz: 0.06, flotte: 8, z: 100 }} donnees={{ ecran: "jeu", tour: 1 }} />}
                </div>
              </li>
            ))}
          </ol>
        </section>

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
        <section id="s-t-fin" aria-labelledby="t-fin" className="relative border-t-[4px] border-encre px-4 pb-10 pt-14 lg:grid lg:min-h-[86vh] lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-[3vw] lg:px-[4.5vw]">
          <Rayons couleur="rose" x="72%" y="60%" />
          <div className="relative z-20">
            <h2 id="t-fin" className="titre text-[48px] leading-[0.92] sm:text-[64px] lg:text-[clamp(64px,7vw,150px)]">
              Ta prochaine session peut payer.
            </h2>
            <div id="cta-fin" className="mt-7 sm:max-w-[420px] lg:mt-12">
              <Link href="/commencer" className="bouton w-full bg-jaune shadow-[0_7px_0_var(--color-encre)] lg:h-[84px] lg:rounded-[22px] lg:text-[24px] lg:font-extrabold">
                Créer ma première vidéo
              </Link>
              <p className="mt-4 text-center text-[14px] font-bold lg:text-left lg:text-[16px]">Sans engagement. Résiliation en deux clics.</p>
            </div>
          </div>
          <div className="relative mt-6 h-[340px] lg:mt-0 lg:h-[76vh]">
            <Pieces />
            <Ancre nom="telephone" className="absolute right-[2%] top-0 h-[66%] w-[46%]" pose={{ ry: -0.35, rz: 0.1, flotte: 10, z: -60 }} donnees={{ ecran: "jeu" }} />
            <Ancre nom="manette" className="absolute left-[-2%] top-[4%] h-[46%] w-[64%]" pose={{ ry: 0.35, rx: -0.35, rz: 0.12, flotte: 12, z: 60 }} donnees={{ valeur: 0.8 }} />
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
