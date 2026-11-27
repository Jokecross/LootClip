/* Un clip fini, lu par la page (avec la lecture par morceaux que demandent Safari et les avances rapides). */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { clipsLocaux, dossierDe, FICHIER_CLIP } from "@/lib/clips-local";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; fichier: string }> }) {
  if (!clipsLocaux()) return new Response(null, { status: 404 });
  const { id, fichier } = await params;
  const dossier = dossierDe(id);
  if (!dossier || !FICHIER_CLIP.test(fichier)) return new Response(null, { status: 404 });
  const chemin = join(dossier, fichier);
  const infos = await stat(chemin).catch(() => null);
  if (!infos) return new Response(null, { status: 404 });

  const telecharger = new URL(req.url).searchParams.has("telecharger");
  const entetes: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    ...(telecharger ? { "Content-Disposition": `attachment; filename="xpclip-${fichier}"` } : {}),
  };
  const plage = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (plage && !telecharger) {
    const debut = plage[1] ? Number(plage[1]) : 0;
    const fin = plage[2] ? Math.min(Number(plage[2]), infos.size - 1) : infos.size - 1;
    if (debut > fin) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${infos.size}` } });
    const flux = Readable.toWeb(createReadStream(chemin, { start: debut, end: fin })) as ReadableStream;
    return new Response(flux, { status: 206, headers: { ...entetes, "Content-Range": `bytes ${debut}-${fin}/${infos.size}`, "Content-Length": String(fin - debut + 1) } });
  }
  const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream;
  return new Response(flux, { headers: { ...entetes, "Content-Length": String(infos.size) } });
}
