/*
 * Lance un montage créé par creer_montage (quota déjà vérifié par la base).
 * Appelée par l'appli juste après la création, puis rappelée si le montage reste en attente.
 * Sans clé serveur (développement), elle ne fait rien : le service local (moteur/worker.mjs) prend la file.
 */
import { after } from "next/server";
import { admin, adminConfigure, utilisateurDe } from "@/lib/admin";
import { champsEchec, DELAI_MAX_MIN, demarrer, jetonMontage, preparerBase } from "@/lib/atelier";

export const maxDuration = 300;

const LANCEMENTS_PAR_HEURE = 15;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const reponse = (etat: string, status = 200) => Response.json({ etat }, { status });

export async function POST(req: Request) {
  if (!adminConfigure()) return reponse("service_local", 503);
  const user = await utilisateurDe(req);
  if (!user) return reponse("non_connecte", 401);
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !UUID.test(id)) return reponse("montage_invalide", 400);

  const db = admin();
  const { data: m } = await db.from("montages").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!m) return reponse("introuvable", 404);

  if (m.statut === "en_cours" && Date.now() - new Date(m.debut_le).getTime() > (DELAI_MAX_MIN + 2) * 60_000) {
    // La machine s'est arrêtée sans donner de nouvelles. Un montage échoué ne compte pas dans le quota.
    await db
      .from("montages")
      .update(champsEchec(m, "Le montage a pris trop de temps. Relance-le, il ne compte pas dans ton quota."))
      .eq("id", id)
      .eq("statut", "en_cours");
    return reponse("abandonne");
  }
  if (m.statut !== "en_attente") return reponse(m.statut);

  // Garde-fou : des clips illisibles relancés en boucle ne doivent pas vider les heures de calcul.
  const { count } = await db
    .from("montages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("debut_le", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= LANCEMENTS_PAR_HEURE) return reponse("trop_de_lancements", 429);

  // On prend le montage. La condition sur le statut évite deux lancements en même temps.
  const { data: pris } = await db
    .from("montages")
    .update({ statut: "en_cours", etape: 0, avancement: 0.01, pris_par: "atelier", debut_le: new Date().toISOString(), erreur: null })
    .eq("id", id)
    .eq("statut", "en_attente")
    .select("*");
  const tache = pris?.[0];
  if (!tache) return reponse("deja_pris");

  try {
    const clips = await Promise.all(
      (tache.clips as { chemin: string }[]).map(async (c) => {
        const { data, error } = await db.storage.from("clips").createSignedUrl(c.chemin, 3600);
        if (error) throw new ClipAbsent();
        return { nom: c.chemin, url: data.signedUrl };
      }),
    );
    const { data: depot, error } = await db.storage.from("videos").createSignedUploadUrl(`${user.id}/${id}.mp4`, { upsert: true });
    if (error) throw error;

    // L'adresse par laquelle le joueur est arrivé : elle répond sans redirection.
    const site = `https://${req.headers.get("host")}`;
    const { prete } = await demarrer(
      {
        id,
        clips,
        depot: depot.signedUrl,
        duree: tache.duree ?? 60,
        accroche: tache.accroche || tache.titre || "",
        style: tache.style,
        filigrane: tache.filigrane,
        suivi: `${site}/api/montage/suivi`,
        jeton: jetonMontage(id, tache.debut_le),
      },
      [new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host, new URL(site).host],
    );
    // Premier montage après un changement du moteur : on prépare la base pour les suivants.
    if (!prete) after(() => preparerBase().catch((e) => console.error("base :", e)));
    return reponse("en_cours");
  } catch (e) {
    console.error("lancement du montage", id, e);
    const absent = e instanceof ClipAbsent;
    await db
      .from("montages")
      .update(
        absent
          ? champsEchec(tache, "Un de tes clips est introuvable. Renvoie-les et relance le montage.")
          : { statut: "en_attente", etape: 0, avancement: 0, pris_par: null, debut_le: null }, // l'appli réessaiera
      )
      .eq("id", id)
      .eq("statut", "en_cours");
    return reponse(absent ? "echoue" : "reessayer", absent ? 200 : 503);
  }
}

class ClipAbsent extends Error {}
