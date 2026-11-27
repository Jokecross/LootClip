/* Ce que le serveur sait faire : en ligne, YouTube bloque la machine de montage (on passe par le fichier). */
import { clipsLocaux } from "@/lib/clips-local";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ youtubeParLien: clipsLocaux() });
}
