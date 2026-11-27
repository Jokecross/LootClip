"use client";
/*
 * Le champ de l'accueil : on colle un lien, il est gardé pour le studio, puis on démarre le parcours.
 * Sans lien, le bouton démarre quand même (le fichier se dépose plus tard).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mettreLienEnAttente } from "@/lib/onboarding";

const RE_LIEN = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

export function ChampLien({ id }: { id?: string }) {
  const router = useRouter();
  const [lien, setLien] = useState("");
  const [erreur, setErreur] = useState("");

  function lancer(e: React.FormEvent) {
    e.preventDefault();
    const l = lien.trim();
    if (l && !RE_LIEN.test(l)) return setErreur("Ce lien ne marche pas. Vérifie-le.");
    if (l) mettreLienEnAttente(/^https?:\/\//i.test(l) ? l : `https://${l}`);
    router.push("/commencer");
  }

  return (
    <form id={id} onSubmit={lancer} className="cl" noValidate>
      <div className="cl-boite">
        <svg viewBox="0 0 24 24" className="cl-icone" aria-hidden="true">
          <path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400l-1 1M14 10a4.500 4.500 0 00-6.400 0l-3 3a4.500 4.500 0 006.400 6.400l1-1" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" />
        </svg>
        <input
          value={lien}
          onChange={(e) => {
            setLien(e.target.value);
            setErreur("");
          }}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="Colle le lien de ta vidéo"
          aria-label="Lien de ta vidéo"
          aria-invalid={!!erreur}
          className="cl-champ"
        />
        <button type="submit" className="gros gros-rose cl-go">
          Créer mes clips
        </button>
      </div>
      {erreur ? (
        <p role="alert" className="cl-erreur">
          {erreur}
        </p>
      ) : (
        <p className="cl-sous">YouTube, Twitch, Kick, X ou ton fichier. Jusqu&apos;à 2 h.</p>
      )}
    </form>
  );
}
