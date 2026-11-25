"use client";
/* Mot de passe oublié : on envoie un lien, et ce même écran permet d'en choisir un nouveau quand on revient. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LienAccueil } from "@/components/marque/Logo";
import { Duo, Titre } from "@/components/ui/Duo";
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
    <Duo
      cle={etape}
      fond="orange"
      entete={<LienAccueil />}
      gauche={
        <Titre sous={nouveau ? "Choisis-en un de 6 caractères minimum." : etape === "envoye" ? "Si un compte existe, le lien arrive dans une minute." : "On t'envoie un lien pour en choisir un autre."}>
          {nouveau ? "Nouveau mot de passe." : etape === "envoye" ? "Regarde tes e-mails." : "Mot de passe oublié."}
        </Titre>
      }
      droite={
        <div className="bloc mt-5 bg-blanc p-5 lg:m-auto lg:w-full lg:max-w-[600px] lg:p-10">
          {etape !== "envoye" && (
            <form onSubmit={valider} noValidate className="flex flex-col">
              <label htmlFor="champ" className="text-[15px] font-bold">
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
              <p className="mt-2 min-h-5 text-[14px] font-bold" role={erreur ? "alert" : undefined}>
                {erreur}
              </p>
              <button type="submit" disabled={envoi} className="bouton bouton-rose mt-3 w-full">
                {envoi ? "Un instant…" : nouveau ? "Enregistrer" : "Recevoir le lien"}
              </button>
            </form>
          )}
          <Link href="/inscription" className="lien mx-auto mt-3 flex min-h-11 w-fit items-center text-[15px]">
            Retour à la connexion
          </Link>
        </div>
      }
    />
  );
}
