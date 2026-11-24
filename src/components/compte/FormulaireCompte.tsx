"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EMAILS_ACTIFS, GOOGLE_CLIENT_ID, GOOGLE_OUVERT } from "@/lib/config";
import { allerChezGoogle, navigateurIntegre } from "@/lib/google";
import { messageErreur, SUPABASE_ANON, SUPABASE_URL, supabase } from "@/lib/supabase";

/*
 * Inscription ou connexion en un écran : Google, ou e-mail + mot de passe.
 * Pas de vérification par e-mail : le compte est ouvert tout de suite
 * (réglage Supabase « Confirm email » désactivé).
 */
export function FormulaireCompte({
  mode,
  retour,
  valider,
}: {
  mode: "inscription" | "connexion";
  retour: string;
  valider: () => Promise<void> | void;
}) {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voir, setVoir] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [google, setGoogle] = useState<"oui" | "ailleurs" | "non">("non");
  const inscription = mode === "inscription";

  // Google est proposé s'il est activé dans Supabase, et si ce navigateur sait l'ouvrir.
  useEffect(() => {
    const revenu = (e: PageTransitionEvent) => e.persisted && setEnvoi(false); // retour arrière depuis Google
    window.addEventListener("pageshow", revenu);
    if (GOOGLE_CLIENT_ID && (GOOGLE_OUVERT || new URLSearchParams(location.search).get("google") === "test"))
      fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON } })
        .then((r) => r.json())
        .then((r) => setGoogle(r?.external?.google ? (navigateurIntegre() ? "ailleurs" : "oui") : "non"))
        .catch(() => {});
    return () => window.removeEventListener("pageshow", revenu);
  }, []);

  async function parGoogle() {
    setEnvoi(true);
    setErreur("");
    try {
      await allerChezGoogle(retour);
    } catch {
      setEnvoi(false);
      setErreur("Google n'a pas pu s'ouvrir. Utilise ton e-mail.");
    }
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const a = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a)) return setErreur("Vérifie ton adresse e-mail.");
    if (motDePasse.length < 6) return setErreur("Ton mot de passe doit faire 6 caractères minimum.");
    setEnvoi(true);
    setErreur("");

    const { data, error } = inscription
      ? await supabase.auth.signUp({ email: a, password: motDePasse })
      : await supabase.auth.signInWithPassword({ email: a, password: motDePasse });

    if (error) {
      setEnvoi(false);
      return setErreur(messageErreur(error));
    }
    if (!data.session) {
      // Arrive seulement si « Confirm email » est encore activé dans Supabase.
      setEnvoi(false);
      return setErreur("Compte créé, mais la connexion directe n'est pas encore activée.");
    }
    await valider();
  }

  return (
    <form onSubmit={envoyer} noValidate className="flex flex-1 flex-col">
      {google === "oui" && (
        <>
          <button type="button" onClick={parGoogle} disabled={envoi} className="bouton bouton-blanc w-full">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
            Continuer avec Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[13px] font-bold text-encre2" aria-hidden="true">
            <span className="h-0.5 flex-1 bg-beige" />
            ou
            <span className="h-0.5 flex-1 bg-beige" />
          </div>
        </>
      )}
      {google === "ailleurs" && <p className="carte mb-5 px-4 py-3 text-[13px] font-bold">Pour Google, ouvre xpclip.com dans Safari ou Chrome.</p>}

      <label htmlFor="email" className="text-[14px] font-bold">
        Ton e-mail
      </label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="toi@exemple.fr"
        className="champ mt-2"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErreur("");
        }}
      />

      <label htmlFor="mdp" className="mt-4 text-[14px] font-bold">
        {inscription ? "Choisis un mot de passe" : "Ton mot de passe"}
      </label>
      <div className="relative mt-2">
        <input
          id="mdp"
          type={voir ? "text" : "password"}
          autoComplete={inscription ? "new-password" : "current-password"}
          placeholder={inscription ? "6 caractères minimum" : "Ton mot de passe"}
          className="champ pr-20"
          value={motDePasse}
          onChange={(e) => {
            setMotDePasse(e.target.value);
            setErreur("");
          }}
          aria-invalid={!!erreur}
          aria-describedby="compte-aide"
        />
        <button type="button" onClick={() => setVoir((v) => !v)} className="lien absolute right-2 top-1/2 min-h-10 -translate-y-1/2 px-2 text-[13px]">
          {voir ? "Cacher" : "Voir"}
        </button>
      </div>

      <p id="compte-aide" className={`mt-2 min-h-5 text-[13px] ${erreur ? "font-bold" : "text-encre2"}`} role={erreur ? "alert" : undefined}>
        {erreur}
      </p>
      {!inscription && EMAILS_ACTIFS && (
        <Link href="/mot-de-passe" className="lien flex min-h-11 w-fit items-center text-[14px]">
          Mot de passe oublié
        </Link>
      )}

      <div className="mt-auto pt-6 lg:pt-8">
        <button type="submit" disabled={envoi} className="bouton bouton-rose w-full">
          {envoi ? "Un instant…" : inscription ? "Créer mon compte" : "Me connecter"}
        </button>
        <p className="mt-3 text-center text-[12px] text-encre2">
          En continuant, tu acceptes les{" "}
          <Link href="/legal/cgv" className="underline">
            CGV
          </Link>{" "}
          et la{" "}
          <Link href="/legal/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
