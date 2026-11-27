/*
 * Les deux services en ligne du moteur « URL → clips » :
 *   - Groq (Whisper) : transcription mot à mot de la vidéo entière ;
 *   - Claude : choix des meilleurs moments et accroche de chacun.
 *
 * Clés lues dans l'environnement (moteur/.env en local, Vercel en ligne), jamais écrites ailleurs :
 *   GROQ_API_KEY, ANTHROPIC_API_KEY
 */
import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
// Sonnet 5.5 (décision de Martin du 27/11/2026) : mêmes moments forts qu'Opus au test, 2 fois moins cher.
const MODELE_IA = "claude-sonnet-5-5";
const LIMITE_GROQ = 24 * 1024 * 1024; // fichier envoyé à Groq : 25 Mo maximum

function lancer(bin, args) {
  return new Promise((ok, ko) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-3000)));
    p.on("error", ko);
    p.on("close", (c) => (c === 0 ? ok() : ko(new Error(err.trim() || `${bin} code ${c}`))));
  });
}

/**
 * Transcription complète par Groq.
 * Retourne { mots: [{ texte, debut, fin }], segments: [{ texte, debut, fin }], duree }.
 * Le son est compressé (Opus mono 16 kHz, 24 kb/s : environ 11 Mo par heure).
 */
export async function transcrire(video, dossier, langue = "fr") {
  const son = `${dossier}/son.mp4`;
  await extraireSon(video, son);
  return transcrireSon(await readFile(son), langue);
}

/**
 * Le son de la vidéo, compressé pour la transcription : AAC mono 16 kHz, 24 kb/s (environ 11 Mo par heure),
 * dans un fichier MP4 (le stockage n'accepte que des vidéos, et Groq lit le MP4).
 */
/** Garde seulement le passage choisi (secondes), sans réencoder : rapide, coupe sur l'image clé la plus proche. */
export async function couperPlage(video, sortie, plage) {
  await lancer(FFMPEG, ["-v", "error", "-y", "-ss", String(plage.debut), "-to", String(plage.fin), "-i", video, "-c", "copy", "-avoid_negative_ts", "make_zero", "-movflags", "+faststart", sortie]);
}

export async function extraireSon(video, son) {
  await lancer(FFMPEG, ["-v", "error", "-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "aac", "-b:a", "24k", "-movflags", "+faststart", "-f", "mp4", son]);
  if ((await stat(son)).size > LIMITE_GROQ) throw new Error("Vidéo trop longue pour la transcription (plus de 2 h environ)");
}

/**
 * Transcription par Groq d'un son déjà compressé (contenu du fichier son.mp4).
 * Retourne { mots: [{ texte, debut, fin }], segments: [{ texte, debut, fin }], duree }.
 */
export async function transcrireSon(contenu, langue = "fr") {
  const cle = process.env.GROQ_API_KEY;
  if (!cle) throw new Error("GROQ_API_KEY manquante");
  if (contenu.length > LIMITE_GROQ) throw new Error("Vidéo trop longue pour la transcription (plus de 2 h environ)");
  const formulaire = new FormData();
  formulaire.append("file", new Blob([contenu], { type: "audio/mp4" }), "son.m4a");
  formulaire.append("model", "whisper-large-v3-turbo");
  formulaire.append("language", langue);
  formulaire.append("response_format", "verbose_json");
  formulaire.append("timestamp_granularities[]", "word");
  formulaire.append("timestamp_granularities[]", "segment");
  const rep = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}` },
    body: formulaire,
  });
  if (!rep.ok) throw new Error(`Transcription refusée (${rep.status}) : ${(await rep.text()).slice(0, 300)}`);
  const d = await rep.json();
  return {
    duree: d.duration,
    mots: (d.words || []).map((m) => ({ texte: m.word.trim(), debut: m.start, fin: m.end })).filter((m) => m.texte),
    segments: (d.segments || []).map((s) => ({ texte: s.text.trim(), debut: s.start, fin: s.end })),
  };
}

const SCHEMA_MOMENTS = {
  type: "object",
  properties: {
    moments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titre: { type: "string", description: "Accroche écrite affichée 3 s en haut du clip" },
          parties: {
            type: "array",
            description: "Passages gardés, dans l'ordre, en secondes de la vidéo source",
            items: {
              type: "object",
              properties: { debut: { type: "number" }, fin: { type: "number" } },
              required: ["debut", "fin"],
              additionalProperties: false,
            },
          },
          score: { type: "integer", description: "Potentiel viral de 1 à 100" },
          pourquoi: { type: "string", description: "Une phrase de 12 mots maximum : pourquoi ce moment marche" },
          forces: { type: "array", description: "Exactement 3 points forts du clip, 2 à 4 mots chacun", items: { type: "string" } },
        },
        required: ["titre", "parties", "score", "pourquoi", "forces"],
        additionalProperties: false,
      },
    },
  },
  required: ["moments"],
  additionalProperties: false,
};

const CONSIGNES = `Tu es le meilleur monteur de clips TikTok et YouTube Shorts francophone.
On te donne la transcription horodatée d'une vidéo longue (stream, podcast, interview, vidéo de jeu).
Tu choisis les passages qui feront les meilleurs clips verticaux.

Un bon clip :
- parle d'un seul sujet, et se comprend seul sans avoir vu le reste de la vidéo ;
- accroche dès la première phrase (une promesse, un chiffre, une réaction forte, une question) ;
- finit sur une chute : une réponse, une punchline, un rire, une conclusion nette ;
- commence au début d'une phrase et finit à la fin d'une phrase, avant que le sujet suivant commence.

Tu peux couper les temps morts et les digressions : un clip peut avoir jusqu'à 3 parties, dans l'ordre chronologique.
N'invente rien : les instants doivent venir de la transcription.
Ne prends pas l'intro, l'outro, les demandes d'abonnement ni les placements de produit.
Les moments ne se chevauchent pas.

L'accroche (titre) : en français, 8 mots maximum, sans emoji, sans guillemets, qui donne envie de regarder.
Elle résume le moment fort, comme un titre de clip viral.
Le pourquoi : en français, 12 mots maximum, tutoiement interdit, sans emoji.
Les forces : 3 points forts courts (2 à 4 mots), par exemple « Chute inattendue », « Réaction sincère ».
Classe les moments du plus fort au plus faible.`;

/** Les meilleurs moments, choisis par Claude à partir de la transcription. */
const TYPES = {
  meilleur: "",
  drole: "Ne garde que des moments drôles : fous rires, fails, répliques absurdes, réactions comiques.",
  conseils: "Ne garde que des conseils, astuces ou informations utiles, expliqués en entier.",
  reactions: "Ne garde que des réactions fortes : surprise, colère, rage, émotion, clash.",
  histoires: "Ne garde que des anecdotes racontées du début à la fin, avec une chute.",
};
const DUREES = { courte: [15, 30], moyenne: [30, 60], longue: [60, 90] };

export async function choisirMoments(transcription, { nombre = 5, type = "meilleur", duree = "moyenne", modele = process.env.XPCLIP_MODELE_IA || MODELE_IA } = {}) {
  const [min, max] = DUREES[duree] ?? DUREES.moyenne;
  const consigne = [
    `Chaque clip dure entre ${min} et ${max} secondes au total.`,
    TYPES[type] || "",
    "S'il y a moins de bons moments que demandé, rends-en moins : la qualité passe avant le nombre.",
  ].filter(Boolean).join("\n");
  const client = new Anthropic(); // ANTHROPIC_API_KEY lue dans l'environnement
  const lignes = transcription.segments.map((s) => `[${s.debut.toFixed(1)} → ${s.fin.toFixed(1)}] ${s.texte}`).join("\n");
  const reponse = await client.beta.messages.create({
    model: modele,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA_MOMENTS } },
    system: CONSIGNES,
    messages: [
      {
        role: "user",
        content: `Vidéo de ${Math.round(transcription.duree)} secondes. Choisis jusqu'à ${nombre} moments.\n${consigne}\n\nTranscription (secondes) :\n${lignes}`,
      },
    ],
  });
  if (reponse.stop_reason === "refusal") throw new Error("L'IA a refusé cette vidéo");
  if (reponse.stop_reason === "max_tokens") throw new Error("Réponse de l'IA coupée");
  const texte = reponse.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const { moments } = JSON.parse(texte);
  // Garde-fou : on écarte ce qui sort franchement de la durée demandée
  const cales = recaler(moments, transcription).filter((m) => {
    const d = m.parties.reduce((t, [a, b]) => t + b - a, 0);
    return d >= min * 0.6 && d <= max * 1.35;
  });
  return { moments: cales.slice(0, nombre), usage: reponse.usage };
}

/**
 * Cale chaque partie sur les mots réels : début au premier mot, fin au dernier mot + une petite marge,
 * sans jamais dépasser la vidéo. Écarte les moments vides ou hors bornes.
 */
function recaler(moments, { mots, duree }) {
  return moments
    .map((m) => ({
      ...m,
      parties: m.parties
        .map(({ debut, fin }) => {
          const dedans = mots.filter((w) => w.debut >= debut - 0.4 && w.fin <= fin + 0.4);
          if (!dedans.length) return null;
          return [Math.max(0, dedans[0].debut - 0.08), Math.min(duree, dedans.at(-1).fin + 0.25)];
        })
        .filter((p) => p && p[1] - p[0] > 1),
    }))
    .filter((m) => m.parties.length);
}

/** Les mots d'un moment, avec leurs instants ramenés au temps du clip (parties mises bout à bout). */
export function motsDuMoment(mots, parties) {
  const resultat = [];
  let decalage = 0;
  for (const [a, b] of parties) {
    for (const w of mots) if (w.debut >= a - 0.02 && w.debut < b) resultat.push({ texte: w.texte, debut: w.debut - a + decalage, fin: Math.min(w.fin, b) - a + decalage });
    decalage += b - a;
  }
  return resultat;
}
