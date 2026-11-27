/* Nouvelles envoyées par la machine de montage d'un lot « lien → clips » (jeton signé par lot). */
import { after } from "next/server";
import { jetonLotValide } from "@/lib/atelier";

export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const user = new URL(req.url).searchParams.get("u") ?? "";
  const corps = await req.json().catch(() => ({}));
  const id = String(corps.id ?? "");
  const jeton = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1] ?? "";
  if (!UUID.test(id) || !UUID.test(user) || !jeton || !jetonLotValide(jeton, `${id}:${user}`)) return new Response(null, { status: 401 });

  const { suivreLot, traiterSon } = await import("@/lib/clips-en-ligne");
  // Le son est déposé : transcription et choix des moments après la réponse (la machine attend rendu.json).
  if (corps.phase === "son") after(() => traiterSon(user, id));
  else await suivreLot(user, id, corps);
  return Response.json({ ok: true });
}
