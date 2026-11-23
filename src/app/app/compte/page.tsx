"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Feuille } from "@/components/ui/Feuille";
import { afficherToast } from "@/components/ui/Toast";
import { resilier } from "@/lib/abonnement";
import { GRATUIT, MENTION_OBJECTIF, OFFRES_PAYANTES, PURGE_CLIPS_JOURS } from "@/lib/config";
import { modifier, useEtat } from "@/lib/etat";
import { deconnecter, supprimerCompte } from "@/lib/serveur";
import { date, euros, nombre } from "@/lib/format";
import { quota } from "@/lib/montage";
import { objectifBooste } from "@/lib/onboarding";
import { eur, montant, unite } from "@/lib/prix";

export default function Compte() {
  const etat = useEtat();
  const router = useRouter();
  const compte = etat.compte!;
  const q = quota(etat);
  const [gerer, setGerer] = useState(false);
  const [supprimer, setSupprimer] = useState(false);
  const [effacement, setEffacement] = useState(false);
  const estPro = compte.offre !== "gratuit";
  const nomOffre = compte.offre === "gratuit" ? GRATUIT.nom : OFFRES_PAYANTES[compte.offre].nom;
  const periode = compte.periodicite ?? "mensuel";
  const prix = compte.offre === "gratuit" ? 0 : montant(compte.offre, periode, !!compte.remiseLancement);

  function choisirConsole(p: "ps5" | "xbox") {
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, plateforme: p } : e.compte }));
  }

  const ligne = "flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left text-[15px] font-bold";

  return (
    <div className="entree">
      <h1 className="titre text-[32px]">Ton compte</h1>
      <p className="mt-2 truncate text-[15px] text-encre2">{compte.email}</p>

      {/* Abonnement */}
      <section className={`mt-5 p-4 ${estPro ? "carte-forte bg-jaune" : "carte"}`} aria-labelledby="t-abo">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold">Ton offre</p>
            <h2 id="t-abo" className="titre mt-0.5 text-[26px]">
              {nomOffre}
            </h2>
          </div>
          <span className="pastille bg-blanc tabular-nums">{estPro ? `${eur(prix)} ${unite(periode)}` : "0 €"}</span>
        </div>
        <p className="mt-3 text-[13px] font-bold">
          {q.utilise} vidéo{q.utilise > 1 ? "s" : ""} sur {q.total} {q.periode}
          {estPro && compte.abonneDepuis ? ` · depuis le ${date(compte.abonneDepuis)}` : ""}
        </p>
        <div className="barre mt-2" role="progressbar" aria-valuenow={q.utilise} aria-valuemax={q.total} aria-label="Vidéos utilisées">
          <span style={{ width: `${Math.max(3, (q.utilise / q.total) * 100)}%` }} />
        </div>
        {estPro ? (
          <button type="button" onClick={() => setGerer(true)} className="bouton bouton-blanc bouton-petit mt-4 w-full">
            Gérer mon abonnement
          </button>
        ) : (
          <Link href="/tarifs" className="bouton bouton-blanc bouton-petit mt-4 w-full">
            Voir les offres
          </Link>
        )}
      </section>

      {/* Objectif de l'onboarding */}
      {compte.profil && (
        <section className="carte mt-3 p-4" aria-labelledby="t-obj">
          <p id="t-obj" className="text-[13px] font-bold">
            Ton objectif XPclip
          </p>
          <p className="titre mt-1 text-[26px]">{nombre(objectifBooste(compte.profil.objectif))}&nbsp;€ par mois</p>
          <p className="mt-1 text-[14px] text-encre2">Ton plan : {compte.profil.frequence} vidéos par semaine.</p>
          <p className="mt-2 text-[11px] text-encre2">{MENTION_OBJECTIF}</p>
        </section>
      )}

      {/* Réglages */}
      <section className="carte mt-3 divide-y-2 divide-beige overflow-hidden" aria-label="Réglages">
        <div className={ligne}>
          Ma console
          <div className="grid grid-cols-2 gap-1 rounded-[10px] border-2 border-encre p-0.5" role="radiogroup" aria-label="Ta console">
            {(["ps5", "xbox"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={compte.plateforme === p}
                onClick={() => choisirConsole(p)}
                className={`min-h-9 rounded-[7px] px-3 text-[13px] ${compte.plateforme === p ? "bg-encre text-fond" : ""}`}
              >
                {p === "ps5" ? "PS5" : "Xbox"}
              </button>
            ))}
          </div>
        </div>
        <Link href="/app/demarrage" className={ligne}>
          Revoir le tutoriel
          <span aria-hidden="true">›</span>
        </Link>
        <details className="group">
          <summary className={`${ligne} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            Factures
            <span className="pastille bg-fond">{etat.factures.length}</span>
          </summary>
          {etat.factures.length ? (
            <ul className="px-4 pb-3">
              {etat.factures.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                  <span>
                    {f.libelle}
                    <span className="block text-[12px] text-encre2">
                      {date(f.le)} · {f.id}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{euros(f.montant)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 pb-4 text-[14px] text-encre2">Aucune facture pour l&apos;instant.</p>
          )}
        </details>
        <button
          type="button"
          onClick={() => {
            // On quitte l'appli d'abord : sinon elle renverrait vers la page de connexion.
            router.replace("/");
            deconnecter();
          }}
          className={ligne}
        >
          Me déconnecter
        </button>
      </section>

      <button type="button" onClick={() => setSupprimer(true)} className="lien mt-4 flex min-h-11 items-center text-[14px]">
        Supprimer mon compte et mes fichiers
      </button>
      <p className="mt-1 text-[12px] text-encre2">Tes clips bruts sont supprimés automatiquement après {PURGE_CLIPS_JOURS} jours.</p>

      <Feuille ouverte={gerer} fermer={() => setGerer(false)} titre="Ton abonnement">
        <p className="text-[14px] text-encre2">Carte, factures et résiliation se gèrent sur le portail sécurisé de Stripe.</p>
        <button
          type="button"
          onClick={() => {
            resilier();
            setGerer(false);
            afficherToast("Abonnement résilié. Tu repasses en Gratuit.");
          }}
          className="bouton bouton-blanc mt-5 w-full"
        >
          Résilier mon abonnement
        </button>
        <p className="mt-3 text-center text-[11px] text-encre2">Démo : la résiliation est immédiate.</p>
      </Feuille>

      <Feuille ouverte={supprimer} fermer={() => setSupprimer(false)} titre="Tout supprimer ?">
        <p className="text-[14px] text-encre2">Ton compte, tes clips et tes vidéos seront effacés. C&apos;est définitif.</p>
        {estPro && <p className="mt-2 text-[14px] font-bold">Ton abonnement {nomOffre} sera résilié.</p>}
        <button
          type="button"
          onClick={async () => {
            setEffacement(true);
            try {
              await supprimerCompte();
              router.replace("/");
              deconnecter(true);
            } catch {
              setEffacement(false);
              afficherToast("La suppression a échoué. Réessaie.");
            }
          }}
          disabled={effacement}
          className="bouton bouton-rose mt-5 w-full"
        >
          {effacement ? "Suppression…" : "Oui, tout supprimer"}
        </button>
        <button type="button" onClick={() => setSupprimer(false)} className="bouton bouton-blanc mt-3 w-full">
          Garder mon compte
        </button>
      </Feuille>
    </div>
  );
}
