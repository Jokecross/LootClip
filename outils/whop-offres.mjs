/*
 * Crée chez Whop les offres et tarifs décrits dans src/lib/config.ts (relançable : il réutilise ce qui existe)
 * et écrit leurs identifiants dans src/lib/whop-tarifs.json. Lancer : node outils/whop-offres.mjs
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const racine = fileURLToPath(new URL("..", import.meta.url));
const cle = process.env.WHOP_API_KEY ?? fs.readFileSync(racine + ".env.local", "utf8").match(/^WHOP_API_KEY=(.*)$/m)[1].trim();
const COMPTE = "biz_oY3tbxve2BVew1";
async function whop(methode, chemin, corps) {
  const r = await fetch("https://api.whop.com/api/v1" + chemin, {
    method: methode,
    headers: { authorization: "Bearer " + cle, "content-type": "application/json", "api-version-date": "2026-11-22-1" },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${methode} ${chemin} ${r.status} ${JSON.stringify(j.error ?? j)}`);
  return j;
}
const { OFFRES_PAYANTES, REMISE_ANNUELLE, LANCEMENT } = await import(racine + "src/lib/config.ts");
const a2 = (x) => Math.round(x * 100) / 100;
const produits = (await whop("GET", `/products?account_id=${COMPTE}&first=50`)).data;
const tarifs = (await whop("GET", `/variants?account_id=${COMPTE}&first=50`)).data;
const sortie = {};
for (const [offre, o] of Object.entries(OFFRES_PAYANTES)) {
  const titre = `XPclip ${o.nom}`;
  let p = produits.find((x) => x.title === titre);
  p ??= await whop("POST", "/products", {
    account_id: COMPTE, title: titre, headline: `${o.videosParMois} vidéos par mois, sans filigrane`,
    description: `XPclip monte tes clips de jeu en vidéos verticales. ${o.avantages.join(". ")}.`,
    visibility: "hidden", send_welcome_message: false, global_affiliate_status: "disabled", member_affiliate_status: "disabled",
    redirect_purchase_url: "https://www.xpclip.com/app/compte",
  });
  for (const periodicite of ["mensuel", "annuel"]) for (const lancement of [false, true]) {
    const base = periodicite === "mensuel" ? o.mensuel : a2(o.mensuel * 12 * (1 - REMISE_ANNUELLE));
    const prix = lancement ? a2(base * (1 - LANCEMENT.remise)) : base;
    const nom = `${o.nom} ${periodicite}${lancement ? " lancement" : ""} v2`;
    let t = tarifs.find((x) => x.title === nom);
    if (t && Number(t.renewal_price?.amount ?? t.renewal_price) !== prix) throw new Error(`${nom} existe à un autre prix : ${JSON.stringify(t.renewal_price)}`);
    t ??= await whop("POST", "/variants", {
      account_id: COMPTE, product_id: p.id, title: nom, billing_type: "renewal", release_method: "buy_now",
      billing_period: periodicite === "mensuel" ? 30 : 365, initial_price: 0, renewal_price: prix, currency: "eur",
      override_tax_type: "inclusive", adaptive_pricing_enabled: false, unlimited_stock: true, allow_multiple_quantity: false, visibility: "hidden",
      internal_notes: "Créé par XPclip. Ne pas modifier le prix ici.",
    });
    sortie[t.id] = { offre, periodicite, lancement };
    console.log(p.id, t.id, nom, JSON.stringify(t.renewal_price), JSON.stringify(t.initial_price), t.currency, t.billing_period, t.visibility, t.override_tax_type ?? t.tax_type);
    if (process.argv[2] === "un") process.exit();
  }
}
// Les anciens tarifs restent reconnus (abonnements déjà pris), mais ne sont plus proposés.
const avant = JSON.parse(fs.readFileSync(racine + "src/lib/whop-tarifs.json", "utf8"));
for (const [id, t] of Object.entries(avant)) if (!sortie[id]) sortie[id] = { ...t, ancien: true };
fs.writeFileSync(racine + "src/lib/whop-tarifs.json", JSON.stringify(sortie, null, 2) + "\n");
