"use client";
/* Mot de passe oublié : on envoie un lien, et ce même écran permet d'en choisir un nouveau quand on revient. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CadreBureau } from "@/components/marque/CadreBureau";
import { Logo } from "@/components/marque/Logo";
import { SITE } from "@/lib/config";
import { rafraichir } from "@/lib/serveur";
import { messageErreur, supabase } from "@/lib/supabase";

export default function MotDePasse() {
  const router = useRouter();
  const [etape, setEtape] = useState<"email" | "envoye" | "nouveau">("email");
  const [valeur, setValeur] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (location.hash.includes("type=recovery")) setEtape("nouveau");
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY") setEtape("nouveau");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (etape === "nouveau") {
      if (valeur.length < 6) return setErreur("Ton mot de passe doit faire 6 caractères minimum.");
      setEnvoi(true);
      const { error } = await supabase.auth.updateUser({ password: valeur });
      setEnvoi(false);
      if (error) return setErreur(messageErreur(error));
      await rafraichir();
      return router.replace("/app/creer");
    }
    const a = valeur.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a)) return setErreur("Vérifie ton adresse e-mail.");
    setEnvoi(true);
    const { error } = await supabase.auth.resetPasswordForEmail(a, { redirectTo: `${SITE}/mot-de-passe` });
    setEnvoi(false);
    if (error) return setErreur(messageErreur(error));
    setValeur("");
    setEtape("envoye");
  }

  const nouveau = etape === "nouveau";
  return (
    <CadreBureau>
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] lg:min-h-0 lg:p-0">
        <Link href="/" className="flex min-h-11 w-fit items-center lg:hidden" aria-label="Retour à l'accueil">
          <Logo taille={30} />
        </Link>
        <h1 className="titre mt-6 text-[32px] lg:text-[44px]">{nouveau ? "Nouveau mot de passe." : etape === "envoye" ? "Regarde tes e-mails." : "Mot de passe oublié."}</h1>
        <p className="mt-2 text-[15px] text-encre2">
          {nouveau ? "Choisis-en un de 6 caractères minimum." : etape === "envoye" ? "Si un compte existe, le lien arrive dans une minute." : "On t'envoie un lien pour en choisir un autre."}
        </p>
        {etape !== "envoye" && (
          <form onSubmit={valider} noValidate className="mt-6 flex flex-1 flex-col">
            <label htmlFor="champ" className="text-[14px] font-bold">
              {nouveau ? "Ton nouveau mot de passe" : "Ton e-mail"}
            </label>
            <input
              key={etape}
              id="champ"
              type={nouveau ? "password" : "email"}
              autoComplete={nouveau ? "new-password" : "email"}
              className="champ mt-2"
              value={valeur}
              onChange={(e) => {
                setValeur(e.target.value);
                setErreur("");
              }}
            />
            <p className="mt-2 min-h-5 text-[13px] font-bold" role={erreur ? "alert" : undefined}>
              {erreur}
            </p>
            <button type="submit" disabled={envoi} className="bouton bouton-rose mt-auto w-full lg:mt-6">
              {envoi ? "Un instant…" : nouveau ? "Enregistrer" : "Recevoir le lien"}
            </button>
          </form>
        )}
        <Link href="/inscription" className="lien mx-auto mt-3 flex min-h-11 items-center text-[14px]">
          Retour à la connexion
        </Link>
      </main>
    </CadreBureau>
  );
}
