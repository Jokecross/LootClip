#!/usr/bin/env node
/*
 * Service de montage XPclip.
 * Lit la file des montages dans Supabase, télécharge les clips, monte la vidéo avec FFmpeg,
 * la dépose dans le bucket « videos » et tient l'appli au courant (statut, étape, avancement).
 *
 *   node worker.mjs
 *
 * Variables (fichier moteur/.env, jamais commité) :
 *   SUPABASE_SERVICE_ROLE_KEY=...      obligatoire (clé secrète, contourne la RLS)
 *   SUPABASE_URL=https://....supabase.co   facultatif, sinon lu dans ../.env.local
 */
import { createClient } from "@supabase/supabase-js";
import { createWriteStream, existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { monter } from "./montage.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
for (const f of [join(ICI, ".env"), join(ICI, "..", ".env.local")]) if (existsSync(f)) process.loadEnvFile(f);

const URL_SUPABASE = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SUPABASE || !CLE) {
  console.error("Il manque SUPABASE_SERVICE_ROLE_KEY dans moteur/.env (ou l'URL du projet).");
  process.exit(1);
}

const db = createClient(URL_SUPABASE, CLE, { auth: { persistSession: false, autoRefreshToken: false } });
const MOI = `${hostname()}-${process.pid}`;
const ATTENTE_MS = 3000;
const BLOQUE_MIN = 20; // un montage « en cours » depuis plus longtemps est considéré comme abandonné

const journal = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

/** Remet dans la file les montages abandonnés (service coupé en plein travail). */
async function recupererAbandonnes() {
  const limite = new Date(Date.now() - BLOQUE_MIN * 60_000).toISOString();
  const { data } = await db
    .from("montages")
    .update({ statut: "en_attente", etape: 0, avancement: 0, pris_par: null })
    .eq("statut", "en_cours")
    .lt("debut_le", limite)
    .select("id");
  if (data?.length) journal(`${data.length} montage(s) abandonné(s) remis dans la file`);
}

/** Prend le plus ancien montage en attente. La condition sur le statut évite que deux services prennent le même. */
async function prendre() {
  const { data: file, error } = await db.from("montages").select("id").eq("statut", "en_attente").order("cree_le").limit(1);
  if (error) throw error;
  if (!file?.length) return null;
  const { data } = await db
    .from("montages")
    .update({ statut: "en_cours", etape: 0, avancement: 0.01, pris_par: MOI, debut_le: new Date().toISOString(), erreur: null })
    .eq("id", file[0].id)
    .eq("statut", "en_attente")
    .select("*");
  return data?.[0] ?? null;
}

async function telecharger(chemin, destination) {
  const { data, error } = await db.storage.from("clips").createSignedUrl(chemin, 3600);
  if (error) throw new Error(`clip introuvable : ${chemin}`);
  const rep = await fetch(data.signedUrl);
  if (!rep.ok || !rep.body) throw new Error(`téléchargement impossible (${rep.status}) : ${chemin}`);
  await pipeline(Readable.fromWeb(rep.body), createWriteStream(destination));
}

/** Messages montrés à l'utilisateur : courts et compréhensibles. Le détail technique reste dans le journal. */
function messagePourLUtilisateur(e) {
  const m = String(e?.message || e);
  if (/introuvable|téléchargement/.test(m)) return "Un de tes clips est introuvable. Renvoie-les et relance le montage.";
  if (/Invalid data|moov atom|could not find codec|Invalid argument/i.test(m)) return "Un de tes clips est illisible. Essaie de l'exporter à nouveau depuis ta console.";
  return "Le montage n'a pas pu aboutir. Relance-le, il ne compte pas dans ton quota.";
}

async function traiter(m) {
  journal(`→ ${m.id} · ${m.clips.length} clip(s) · ${m.duree ?? 60} s · ${m.filigrane ? "gratuit" : "payant"}`);
  const dossier = await mkdtemp(join(tmpdir(), "xpclip-"));
  let dernier = 0;
  let derniereEtape = -1;
  const maj = (champs) => db.from("montages").update(champs).eq("id", m.id).then(({ error }) => error && journal("maj :", error.message));

  try {
    // 1. Téléchargement des clips (compte pour les premiers 15 % de la barre)
    const fichiers = [];
    for (const [i, c] of m.clips.entries()) {
      const f = join(dossier, `clip-${i}${extname(c.chemin) || ".mp4"}`);
      await telecharger(c.chemin, f);
      fichiers.push(f);
      await maj({ avancement: 0.02 + (0.13 * (i + 1)) / m.clips.length });
    }

    // 2. Montage (15 % → 95 %)
    const sortie = join(dossier, "video.mp4");
    const r = await monter({
      clips: fichiers,
      sortie,
      duree: m.duree ?? 60,
      accroche: m.accroche || m.titre || "",
      filigrane: m.filigrane,
      style: m.style,
      format: "flou",
      progres: (etape, a) => {
        const avancement = 0.15 + a * 0.8;
        // Une écriture à chaque nouvelle étape, sinon au plus tous les 4 %
        if (etape === derniereEtape && avancement - dernier < 0.04 && a < 1) return;
        dernier = avancement;
        derniereEtape = etape;
        maj({ etape: Math.min(3, etape), avancement });
      },
    });

    // 3. Dépôt de la vidéo finie, dans le dossier de l'utilisateur
    await maj({ etape: 3, avancement: 0.96 });
    const chemin = `${m.user_id}/${m.id}.mp4`;
    const { error } = await db.storage.from("videos").upload(chemin, await readFile(sortie), { contentType: "video/mp4", upsert: true });
    if (error) throw new Error(`dépôt de la vidéo : ${error.message}`);
    const { size } = await stat(sortie);

    await maj({ statut: "termine", etape: 4, avancement: 1, video_chemin: chemin, termine_le: new Date().toISOString() });
    journal(`✓ ${m.id} · ${r.duree.toFixed(1)} s de vidéo · ${(size / 1e6).toFixed(1)} Mo · fait en ${r.secondes.toFixed(0)} s`);
  } catch (e) {
    journal(`✗ ${m.id} ·`, e?.message || e);
    await maj({ statut: "echoue", erreur: messagePourLUtilisateur(e), termine_le: new Date().toISOString() });
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

let arret = false;
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => {
  if (arret) process.exit(1);
  arret = true;
  journal("Arrêt demandé : je finis le montage en cours puis je m'arrête.");
});

journal(`Service de montage XPclip démarré (${MOI})`);
await recupererAbandonnes();
let derniereRecup = Date.now();
while (!arret) {
  try {
    const m = await prendre();
    if (m) await traiter(m);
    else await new Promise((ok) => setTimeout(ok, ATTENTE_MS));
    if (Date.now() - derniereRecup > 5 * 60_000) {
      await recupererAbandonnes();
      derniereRecup = Date.now();
    }
  } catch (e) {
    journal("Erreur de file :", e?.message || e);
    await new Promise((ok) => setTimeout(ok, 10_000));
  }
}
process.exit(0);
