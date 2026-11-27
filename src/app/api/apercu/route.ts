/*
 * Ce qu'on peut savoir d'une vidéo sans la télécharger : titre, miniature, chaîne, plateforme.
 * Sert à l'onboarding (« Ta vidéo est prête à être clippée »). Seulement les plateformes connues
 * (pas d'adresse libre : le serveur ne va chercher que chez elles).
 */
export const dynamic = "force-dynamic";

const PLATEFORMES: { nom: string; hotes: RegExp }[] = [
  { nom: "YouTube", hotes: /(^|\.)(youtube\.com|youtu\.be)$/i },
  { nom: "Twitch", hotes: /(^|\.)twitch\.tv$/i },
  { nom: "Kick", hotes: /(^|\.)kick\.com$/i },
  { nom: "X", hotes: /(^|\.)(x\.com|twitter\.com)$/i },
];

type Apercu = { plateforme: string; titre: string | null; miniature: string | null; auteur: string | null };

async function lire(url: string, ms = 4000) {
  return fetch(url, { signal: AbortSignal.timeout(ms), headers: { "user-agent": "Mozilla/5.0 (compatible; XPclipApercu/1.0)", "accept-language": "fr-FR,fr;q=0.9" }, redirect: "follow" });
}

const meta = (html: string, nom: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${nom}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${nom}["']`, "i"))?.[1] ??
  null;

const propre = (t: string | null) => (t ? t.replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').trim().slice(0, 140) : null);

export async function GET(req: Request) {
  const brut = new URL(req.url).searchParams.get("url") ?? "";
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(brut) ? brut : `https://${brut}`);
  } catch {
    return Response.json({ erreur: "lien" }, { status: 400 });
  }
  const p = PLATEFORMES.find((x) => x.hotes.test(u.hostname));
  if (!p || u.protocol !== "https:") return Response.json({ erreur: "plateforme" }, { status: 400 });

  const apercu: Apercu = { plateforme: p.nom, titre: null, miniature: null, auteur: null };
  try {
    if (p.nom === "YouTube") {
      const r = await lire(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u.toString())}`);
      if (r.ok) {
        const j = await r.json();
        Object.assign(apercu, { titre: propre(j.title), miniature: j.thumbnail_url ?? null, auteur: propre(j.author_name) });
      }
    } else {
      const r = await lire(u.toString());
      if (r.ok) {
        const html = (await r.text()).slice(0, 300_000);
        Object.assign(apercu, { titre: propre(meta(html, "og:title")), miniature: meta(html, "og:image"), auteur: propre(meta(html, "og:site_name")) });
      }
    }
  } catch {
    // Pas d'aperçu : l'écran affiche seulement la plateforme.
  }
  if (apercu.miniature && !/^https:\/\//i.test(apercu.miniature)) apercu.miniature = null;
  return Response.json(apercu, { headers: { "Cache-Control": "public, max-age=3600" } });
}
