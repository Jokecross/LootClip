import Link from "next/link";
import { NON_AFFILIATION } from "@/lib/config";
import { Logo } from "./marque/Logo";

export function PiedDePage() {
  return (
    <footer className="border-t-2 border-encre bg-encre px-4 pb-32 pt-10 text-fond lg:px-8 lg:pb-14 lg:pt-14">
      <div className="mx-auto flex max-w-[560px] flex-col gap-5 lg:max-w-[1120px] lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
        <div className="[&_.titre]:text-fond">
          <Logo taille={28} />
          <p className="mt-2 text-[14px] text-fond/70">Tes clips. Ton loot.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 text-[14px] font-bold" aria-label="Informations légales">
          <Link href="/legal/mentions-legales" className="flex min-h-12 items-center underline-offset-4 hover:underline">
            Mentions légales
          </Link>
          <Link href="/legal/cgv" className="flex min-h-12 items-center underline-offset-4 hover:underline">
            CGV
          </Link>
          <Link href="/legal/confidentialite" className="flex min-h-12 items-center underline-offset-4 hover:underline">
            Confidentialité
          </Link>
        </nav>
        <p className="text-[12px] text-fond/60 lg:w-full lg:border-t lg:border-fond/15 lg:pt-6">{NON_AFFILIATION}</p>
      </div>
    </footer>
  );
}
