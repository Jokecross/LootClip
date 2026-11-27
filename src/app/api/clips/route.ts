/*
 * Lance la fabrication des clips d'une vidéo (lien, ou fichier déjà déposé dans « clips »).
 * Sur le Mac (mode local) : le moteur tourne sur la machine. En ligne : machine de montage + Groq + Claude.
 */
import { admin, adminConfigure, utilisateurDe } from "@/lib/admin";
import { clipsLocaux, lancer, listerLots } from "@/lib/clips-local";
import { optionsPropres } from "@/lib/clips-options";

export const maxDuration = 120;

const LOTS_PAR_HEURE = 6;

export async function POST(req: Request) {
  const corps = await req.json().catch(() => ({}));
  const options = optionsPropres(corps.options);

  // Fichier déposé par le joueur : on le lit par un lien temporaire.
  let source = "";
  const user = adminConfigure() ? await utilisateurDe(req) : null;
  if (typeof corps.fichier === "string" && corps.fichier) {
    if (!user || !corps.fichier.startsWith(`${user.id}/`) || corps.fichier.includes("..")) return Response.json({ erreur: "non_connecte" }, { status: 401 });
    const { data, error } = await admin().storage.from("clips").createSignedUrl(corps.fichier, 3 * 3600);
    if (error || !data) return Response.json({ erreur: "fichier_introuvable" }, { status: 404 });
    source = data.signedUrl;
  } else {
    try {
      const url = new URL(String(corps.lien ?? "").trim());
      if (!/^https?:$/.test(url.protocol)) throw new Error();
      source = url.toString();
    } catch {
      return Response.json({ erreur: "lien_invalide" }, { status: 400 });
    }
  }

  if (clipsLocaux()) return Response.json({ id: await lancer(source, options) });

  // En ligne, YouTube refuse la machine de montage : sans proxy (YOUTUBE_PROXY_URL) ni Apify (APIFY_TOKEN), l'écran demande le fichier.
  if (!corps.fichier && !process.env.APIFY_TOKEN && !process.env.YOUTUBE_PROXY_URL && /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(source).hostname)) return Response.json({ erreur: "youtube" }, { status: 422 });

  if (!adminConfigure() || !process.env.GROQ_API_KEY || !process.env.ANTHROPIC_API_KEY) return Response.json({ erreur: "bientot" }, { status: 404 });
  if (!user) return Response.json({ erreur: "non_connecte" }, { status: 401 });
  const { clipsRestants, lancerLot, secondesRestantes } = await import("@/lib/clips-en-ligne");
  const restants = await clipsRestants(user);
  if (restants !== null && restants < 1) return Response.json({ erreur: "quota" }, { status: 402 });
  const secondes = await secondesRestantes(user);
  if (secondes !== null && secondes < 60) return Response.json({ erreur: "heures" }, { status: 402 });
  if (restants !== null && restants < options.nombre) options.nombre = Math.max(1, restants) as typeof options.nombre;

  // Garde-fou : pas plus de quelques lots par heure et par compte
  const { data: recents } = await admin().storage.from("videos").list(`lots/${user.id}`, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
  const uneHeure = Date.now() - 3_600_000;
  if ((recents ?? []).filter((f) => !f.name.startsWith("compteur") && f.created_at && new Date(f.created_at).getTime() > uneHeure).length >= LOTS_PAR_HEURE)
    return Response.json({ erreur: "trop_de_lots" }, { status: 429 });

  const site = `https://${req.headers.get("host")}`;
  return Response.json({ id: await lancerLot({ user, source, options, site }) });
}

/** Les clips déjà faits (page « Mes vidéos »). */
export async function GET(req: Request) {
  if (clipsLocaux()) return Response.json({ lots: await listerLots() }, { headers: { "Cache-Control": "no-store" } });
  if (!adminConfigure()) return Response.json({ lots: [] });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ lots: [] }, { status: 401 });
  const { listerLotsEnLigne } = await import("@/lib/clips-en-ligne");
  return Response.json({ lots: await listerLotsEnLigne(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
