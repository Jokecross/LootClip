/* Ce que le serveur sait faire : en ligne, les liens YouTube passent par Apify si APIFY_TOKEN est là, sinon par le fichier. */
import { clipsLocaux } from "@/lib/clips-local";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ youtubeParLien: clipsLocaux() || Boolean(process.env.YOUTUBE_PROXY_URL || process.env.APIFY_TOKEN) });
}
