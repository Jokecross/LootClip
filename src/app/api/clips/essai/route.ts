/*
 * Essai technique, temporaire : la machine de montage peut-elle récupérer une vidéo depuis un lien ?
 * Protégé par un jeton signé avec la clé du serveur (personne d'autre ne peut le lancer).
 * À supprimer une fois le moteur « lien → clips » branché.
 */
import { Sandbox } from "@vercel/sandbox";
import { createHmac, timingSafeEqual } from "node:crypto";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const LIENS = [
  "https://www.youtube.com/watch?v=-jL-Nc_x-7k",
  "https://www.youtube.com/watch?v=AbqJaJxRq6M",
];

function autorise(req: Request) {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const recu = req.headers.get("x-essai") ?? "";
  if (!cle || !recu) return false;
  const attendu = Buffer.from(createHmac("sha256", cle).update("essai-clips-lien").digest("hex"));
  const b = Buffer.from(recu);
  return b.length === attendu.length && timingSafeEqual(b, attendu);
}

export async function POST(req: Request) {
  if (!autorise(req)) return new Response("non", { status: 404 });
  const machine = await Sandbox.create({ image: "vercel/sandbox/node:24", region: "cdg1", resources: { vcpus: 2 }, timeout: 4 * 60_000 });
  const journal: { lien: string; code: number; sortie: string; erreur: string }[] = [];
  try {
    const prep = await machine.runCommand("bash", [
      "-c",
      "curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp && /tmp/yt-dlp --version",
    ]);
    journal.push({ lien: "installation", code: prep.exitCode, sortie: (await prep.stdout()).slice(-300), erreur: (await prep.stderr()).slice(-500) });
    for (const lien of LIENS) {
      const cmd = await machine.runCommand("bash", [
        "-c",
        `cd /tmp && /tmp/yt-dlp --no-warnings --no-playlist -f "18/b[ext=mp4]" -o essai.mp4 --print "%(title)s | %(duration)s | %(height)s" --no-simulate "${lien}" && ls -la /tmp/essai.mp4; rm -f /tmp/essai.mp4`,
      ]);
      journal.push({ lien, code: cmd.exitCode, sortie: (await cmd.stdout()).slice(-400), erreur: (await cmd.stderr()).slice(-700) });
    }
  } finally {
    await machine.delete().catch(() => {});
  }
  return Response.json(journal, { headers: { "Cache-Control": "no-store" } });
}
