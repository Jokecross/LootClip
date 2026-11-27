/* Fin d'un run Apify (vidéo YouTube récupérée) : on lance la machine de montage. Jeton signé par lot. */
import { after } from "next/server";
import { jetonLotValide } from "@/lib/atelier";

export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const p = new URL(req.url).searchParams;
  const user = p.get("u") ?? "";
  const id = p.get("id") ?? "";
  const jeton = p.get("j") ?? "";
  if (!UUID.test(id) || !UUID.test(user) || !jeton || !jetonLotValide(jeton, `apify:${id}:${user}`)) return new Response(null, { status: 401 });
  const corps = await req.json().catch(() => ({}));
  const run = String(corps?.eventData?.actorRunId ?? corps?.resource?.id ?? "");
  if (!run) return new Response(null, { status: 400 });
  const site = `https://${req.headers.get("host")}`;
  const { apresApify } = await import("@/lib/clips-en-ligne");
  after(() => apresApify(user, id, run, site));
  return Response.json({ ok: true });
}
