"use client";
/*
 * Le paiement Whop, affiché par-dessus la page : le joueur ne quitte pas XPclip et ne perd pas ses clips.
 * Le prix vient de la commande préparée par le serveur.
 * Deux vues : Apple Pay et Google Pay d'abord, la carte seulement si on la demande (ou sans portefeuille sur l'appareil).
 */
import { Checkout, CheckoutElement, ExpressCheckoutElement, WhopElements } from "@whop/elements-react";
import { loadWhop } from "@whop/elements";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { confirmer } from "@/lib/abonnement";
import { OFFRES_PAYANTES, SITE, type OffrePayante, type Periodicite } from "@/lib/config";
import { useEtat } from "@/lib/etat";
import { eur, unite } from "@/lib/prix";

/** On ne garde que le minimum du formulaire de Whop : le prix est déjà en haut, l'e-mail vient du compte. */
const CACHE = { display: "none" };
const APPARENCE = {
  theme: { appearance: "light" as const, accentColor: "pink" as const },
  classes: {
    "whop-CheckoutDetails": CACHE,
    "whop-CheckoutExpress": CACHE,
    "whop-CheckoutExpressDivider": CACHE,
    "whop-CheckoutRequirements": CACHE,
    "whop-CheckoutCompanyPurchase": CACHE,
    "whop-PaymentMethodRow": CACHE,
    "whop-CardLabel": CACHE,
    // Plus de cadres imbriqués : un seul carré.
    "whop-Checkout": { padding: "0" },
    "whop-CheckoutCollection": { padding: "14px" },
    "whop-PaymentMethods": { border: "none", boxShadow: "none" },
    "whop-PaymentMethod": { border: "none", boxShadow: "none" },
    "whop-PaymentMethodDetail": { padding: "0" },
    "whop-PaymentDetailRegion": { padding: "0" },
    "whop-CheckoutPayButton": { backgroundColor: "#f05fa5", color: "#1a0b2e", border: "2px solid #1a0b2e", borderRadius: "14px", fontWeight: "700", height: "52px" },
  },
};
// Sans e-mail connu, le champ doit rester visible, sinon le paiement serait bloqué.
const APPARENCE_AVEC_EMAIL = { ...APPARENCE, classes: { ...APPARENCE.classes, "whop-CheckoutRequirements": {} } };
const APPARENCE_EXPRESS = { theme: APPARENCE.theme };

export type Achat = { commande: string; offre: OffrePayante; periodicite: Periodicite; montant: number };

export function Paiement({ achat, fermer, reussi }: { achat: Achat; fermer: () => void; reussi: () => void }) {
  const etat = useEtat();
  const [erreur, setErreur] = useState(false);
  const [activation, setActivation] = useState(false);
  const [lent, setLent] = useState("");
  const fini = useRef(false);
  const [vue, setVue] = useState<"express" | "carte">("express");
  const [pretExpress, setPretExpress] = useState(false);
  const boutons = useRef<HTMLDivElement>(null);

  // Aucun portefeuille sur cet appareil : l'élément Whop finit vide, on passe à la carte sans faire attendre.
  useEffect(() => {
    if (vue !== "express") return;
    let vide = 0;
    const t0 = Date.now();
    const id = setInterval(() => {
      vide = (boutons.current?.offsetHeight ?? 0) < 36 ? vide + 1 : 0;
      if (vide >= 5 && (pretExpress || Date.now() - t0 > 6000)) setVue("carte");
    }, 250);
    return () => clearInterval(id);
  }, [vue, pretExpress]);
  // Chargé au premier paiement seulement : rien de Whop sur les autres pages.
  const [elements] = useState(() => loadWhop());

  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, []);

  async function terminer(paiement: string) {
    if (fini.current) return;
    fini.current = true;
    setActivation(true);
    verifier(paiement);
  }

  /** On ne revient jamais à l'écran des offres après un paiement : le joueur paierait deux fois. */
  async function verifier(paiement: string) {
    setLent("");
    if (await confirmer(paiement)) return reussi();
    setLent(paiement);
  }

  return createPortal(
    <div data-paiement className="fixed inset-0 z-[60] overflow-y-auto bg-fond" role="dialog" aria-modal="true" aria-labelledby="t-paiement">
      <div className="entree mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold">XPclip {OFFRES_PAYANTES[achat.offre].nom}</p>
            <h1 id="t-paiement" className="titre mt-1 text-[34px]">
              {eur(achat.montant)} {unite(achat.periodicite)}
            </h1>
            <p className="mt-1.5 text-[14px] text-encre2">
              {activation ? "Paiement envoyé. On ouvre ton offre." : achat.periodicite === "mensuel" ? "Tous les 30 jours. Résilie quand tu veux." : "Une fois par an. Résilie quand tu veux."}
            </p>
          </div>
          {!activation && (
            <button type="button" onClick={fermer} className="bouton bouton-carre shrink-0" aria-label="Annuler le paiement">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>

        {lent ? (
          <div className="carte mt-5 p-4 text-[15px]" role="status">
            <p className="font-bold">Ta banque confirme encore le paiement.</p>
            <p className="mt-1 text-[14px] text-encre2">Ton offre s&apos;ouvre dès que c&apos;est bon. Ne paie pas deux fois.</p>
            <button type="button" onClick={() => verifier(lent)} className="bouton bouton-rose mt-4 w-full">
              Vérifier maintenant
            </button>
          </div>
        ) : activation ? (
          <div className="carte mt-5 flex min-h-40 items-center justify-center gap-3 p-4 text-[15px] font-bold" role="status">
            <span className="h-6 w-6 rounded-full border-[3px] border-encre border-t-transparent" style={{ animation: "tourne .8s linear infinite" }} aria-hidden="true" />
            Un instant…
          </div>
        ) : null}

        {erreur && (
          <div className="carte mt-5 p-4 text-[15px]" role="alert">
            <p className="font-bold">Le paiement n&apos;a pas pu s&apos;afficher.</p>
            <a className="bouton bouton-rose mt-4 w-full" href={`https://whop.com/checkout/${achat.commande}/`}>
              Payer sur la page Whop
            </a>
          </div>
        )}

        {!activation && !erreur && (
          <>
            {/* skipPixel : pas de traceur publicitaire Whop sur XPclip */}
            <WhopElements elements={elements} locale="fr" skipPixel onLoadError={() => setErreur(true)} appearance={APPARENCE}>
              <Checkout
                key={vue}
                analytics={false}
                checkoutConfiguration={achat.commande}
                returnUrl={`${SITE}/app/merci`}
                appearance={vue === "express" ? APPARENCE_EXPRESS : etat.compte?.email ? APPARENCE : APPARENCE_AVEC_EMAIL}
                onComplete={(c) => {
                  if (c.result === "payment") terminer(c.paymentId);
                }}
              >
                {vue === "express" ? (
                  <div className="mt-6">
                    <div ref={boutons}>
                      <ExpressCheckoutElement wallets={{ payPal: "never" }} layout="vertical" onReady={() => setPretExpress(true)} onError={() => setVue("carte")} />
                    </div>
                    <button type="button" onClick={() => setVue("carte")} className="bouton bouton-blanc mt-3 w-full">
                      Payer par carte
                    </button>
                    <p className="mt-4 text-center text-[12px] leading-snug text-encre2">
                      En payant, tu acceptes les{" "}
                      <a href="/legal/cgv" target="_blank" rel="noopener" className="underline">
                        conditions de vente
                      </a>
                      . Renouvellement automatique.
                    </p>
                  </div>
                ) : (
                  <div className="carte mt-5 w-full overflow-hidden">
                    <CheckoutElement
                      buyerEmail={etat.compte?.email}
                      lockBuyerEmail={!!etat.compte?.email}
                      defaultValues={{ billingDetails: { address: { country: "FR" } } }}
                      onError={() => setErreur(true)}
                    />
                  </div>
                )}
              </Checkout>
            </WhopElements>
          </>
        )}
        <p className="mt-auto pt-6 text-center text-[12px] text-encre2">Paiement traité par Whop. XPclip ne voit jamais ta carte.</p>
      </div>
    </div>,
    document.body,
  );
}
