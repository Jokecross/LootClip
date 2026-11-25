"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ecran } from "@/components/app/Ecran";
import { Feuille } from "@/components/ui/Feuille";
import { afficherToast } from "@/components/ui/Toast";
import { arreter, lienGestion, reprendre, resilier } from "@/lib/abonnement";
import { GRATUIT, MENTION_OBJECTIF, OFFRES_PAYANTES, PURGE_CLIPS_JOURS } from "@/lib/config";
import { modifier, useEtat } from "@/lib/etat";
import { deconnecter, supprimerCompte } from "@/lib/serveur";
import { date, euros, nombre, videos } from "@/lib/format";
import { quota } from "@/lib/montage";
import { objectifBooste } from "@/lib/onboarding";
import { usePublicationOuverte } from "@/lib/publication";
import { eur, montant, unite } from "@/lib/prix";

export default function Compte() {
  const etat = useEtat();
  const router = useRouter();
  const compte = etat.compte!;
  const q = quota(etat);
  const [gerer, setGerer] = useState(false);
  const [supprimer, setSupprimer] = useState(false);
  const [effacement, setEffacement] = useState(false);
  const [attente, setAttente] = useState(false);
  const publier = usePublicationOuverte();
  const estPro = compte.offre !== "gratuit";
  const nomOffre = compte.offre === "gratuit" ? GRATUIT.nom : OFFRES_PAYANTES[compte.offre].nom;
  const periode = compte.periodicite ?? "mensuel";
  const prix = compte.offre === "gratuit" ? 0 : montant(compte.offre, periode, !!compte.remiseLancement);

  async function changer(action: () => Promise<void>, message: string) {
    setAttente(true);
    try {
      await action();
      setGerer(false);
      afficherToast(message);
    } catch (e) {
      afficherToast(e instanceof Error ? e.message : "Impossible pour l'instant. Réessaie.");
    }
    setAttente(false);
  }

  function choisirConsole(p: "ps5" | "xbox") {
    modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, plateforme: p } : e.compte }));
  }

  const ligne = "flex min-h-[64px] w-full items-center justify-between gap-4 px-5 text-left text-[17px] font-bold lg:min-h-[72px] lg:px-7 lg:text-[19px]";

  return (
    <>
    <Ecran
      titre="Ton compte"
      sous={<span className="block truncate">{compte.email}</span>}
      socle={
        compte.profil && (
          <section className="bloc mt-5 bg-blanc p-5 lg:mt-0 lg:p-7" aria-labelledby="t-obj">
            <p id="t-obj" className="text-[15px] font-bold">
              Ton objectif XPclip
            </p>
            <p className="titre mt-1 text-[32px] lg:text-[38px]">{nombre(objectifBooste(compte.profil.objectif))}&nbsp;€ par mois</p>
            <p className="mt-1.5 text-[15px] text-encre2">Ton plan : {videos(compte.profil.frequence)} par semaine.</p>
            <p className="mt-2 text-[12px] text-encre2">{MENTION_OBJECTIF}</p>
          </section>
        )
      }
    >
      {/* Abonnement */}
      <section className={`bloc p-5 lg:p-8 ${estPro ? "bg-jaune" : "bg-blanc"}`} aria-labelledby="t-abo">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold">Ton offre</p>
            <h2 id="t-abo" className="titre mt-1 text-[36px] lg:text-[48px]">
              {nomOffre}
            </h2>
          </div>
          <span className="pastille bg-blanc tabular-nums lg:min-h-10 lg:px-4 lg:text-[17px]">{estPro ? `${eur(prix)} ${unite(periode)}` : "0 €"}</span>
        </div>
        {estPro && (
          <>
            <p className="mt-4 text-[15px] font-bold lg:text-[17px]">
              {q.utilise} vidéo{q.utilise > 1 ? "s" : ""} sur {q.total} {q.periode}
              {compte.abonneDepuis ? ` · depuis le ${date(compte.abonneDepuis)}` : ""}
            </p>
            <div className="barre mt-2.5" role="progressbar" aria-valuenow={q.utilise} aria-valuemax={q.total} aria-label="Vidéos utilisées">
              <span style={{ width: `${Math.max(3, (q.utilise / q.total) * 100)}%` }} />
            </div>
            {compte.abonnementFin && <p className="mt-3 text-[15px] font-bold">Résilié. Ton accès reste ouvert jusqu&apos;au {date(compte.abonnementFin)}.</p>}
          </>
        )}
        {estPro ? (
          <button type="button" onClick={() => setGerer(true)} className="bouton bouton-blanc mt-5 w-full">
            Gérer mon abonnement
          </button>
        ) : (
          <Link href="/tarifs" className="bouton bouton-rose mt-5 w-full">
            Voir les offres
          </Link>
        )}
      </section>

      {/* Réglages */}
      <section className="bloc divide-y-2 divide-encre overflow-hidden bg-blanc" aria-label="Réglages">
        <div className={ligne}>
          Ma console
          <div className="segment !rounded-[15px] !p-1" role="radiogroup" aria-label="Ta console">
            {(["ps5", "xbox"] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={compte.plateforme === p} onClick={() => choisirConsole(p)} className="!min-h-[40px] !rounded-[9px] px-4">
                {p === "ps5" ? "PS5" : "Xbox"}
              </button>
            ))}
          </div>
        </div>
        {publier && (
          <Link href="/app/comptes" className={ligne}>
            TikTok et Instagram
            <Chevron />
          </Link>
        )}
        <Link href="/app/demarrage" className={ligne}>
          Revoir le tutoriel
          <Chevron />
        </Link>
        <details className="group">
          <summary className={`${ligne} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            Factures
            <span className="pastille bg-turquoise">{etat.factures.length}</span>
          </summary>
          {etat.factures.length ? (
            <ul className="px-5 pb-4 lg:px-7">
              {etat.factures.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                  <span>
                    {f.libelle}
                    <span className="block text-[13px] text-encre2">
                      {date(f.le)} · {f.id}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{euros(f.montant)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[15px] text-encre2 lg:px-7">Aucune facture pour l&apos;instant.</p>
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

      <div>
        <button type="button" onClick={() => setSupprimer(true)} className="lien flex min-h-11 items-center text-[15px]">
          Supprimer mon compte et mes fichiers
        </button>
        <p className="mt-1 text-[14px] font-medium">Tes clips bruts sont supprimés automatiquement après {PURGE_CLIPS_JOURS} jours.</p>
      </div>
    </Ecran>

      <Feuille ouverte={gerer} fermer={() => setGerer(false)} titre="Ton abonnement">
        <p className="text-[14px] text-encre2">
          {compte.abonnementFin ? `Tu gardes ${nomOffre} jusqu'au ${date(compte.abonnementFin)}. Plus aucun prélèvement.` : "Si tu résilies, tu gardes ton offre jusqu'à la fin de la période payée."}
        </p>
        <button
          type="button"
          onClick={async () => {
            setAttente(true);
            window.location.href = await lienGestion();
          }}
          disabled={attente}
          className="bouton bouton-blanc mt-5 w-full"
        >
          Changer ma carte
        </button>
        <Link href="/tarifs" className="bouton bouton-blanc mt-3 w-full">
          Changer d&apos;offre
        </Link>
        {compte.abonnementFin ? (
          <button type="button" disabled={attente} onClick={() => changer(reprendre, "C'est reparti. Ton abonnement continue.")} className="bouton bouton-rose mt-3 w-full">
            Reprendre mon abonnement
          </button>
        ) : (
          <button type="button" disabled={attente} onClick={() => changer(resilier, "Abonnement résilié. Tu gardes ton accès jusqu'à la fin.")} className="bouton bouton-blanc mt-3 w-full">
            Résilier mon abonnement
          </button>
        )}
      </Feuille>

      <Feuille ouverte={supprimer} fermer={() => setSupprimer(false)} titre="Tout supprimer ?">
        <p className="text-[14px] text-encre2">Ton compte, tes clips et tes vidéos seront effacés. C&apos;est définitif.</p>
        {estPro && <p className="mt-2 text-[14px] font-bold">Ton abonnement {nomOffre} sera résilié.</p>}
        <button
          type="button"
          onClick={async () => {
            setEffacement(true);
            try {
              if (estPro) await arreter(); // plus aucun prélèvement, avant d'effacer le compte
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
    </>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
