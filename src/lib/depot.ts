"use client";
/*
 * Envoi des clips, directement du téléphone vers le stockage Supabase (dossier privé « clips/<id du joueur>/ »).
 * Protocole TUS : envoi par morceaux de 6 Mo, qui reprend tout seul là où il s'est arrêté après une coupure.
 */
import { Upload } from "tus-js-client";
import { SUPABASE_ANON, SUPABASE_URL, supabase } from "./supabase";

export type Avancement = { envoye: number; total: number; enPause: boolean };

const MORCEAU = 6 * 1024 * 1024; // imposé par Supabase pour l'envoi avec reprise

/** Chemin du clip dans le stockage : <id du joueur>/<identifiant>.<extension> */
export function cheminClip(userId: string, fichier: File) {
  const ext = (fichier.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}

export async function deposer(fichier: File, chemin: string, surAvancement: (a: Avancement) => void, signal?: AbortSignal) {
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) throw new Error("non_connecte");

  return new Promise<void>((ok, ko) => {
    const envoi = new Upload(fichier, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000, 30000],
      headers: { authorization: `Bearer ${jeton}`, apikey: SUPABASE_ANON, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: MORCEAU,
      metadata: {
        bucketName: "clips",
        objectName: chemin,
        contentType: fichier.type || "video/mp4",
        cacheControl: "3600",
      },
      onProgress: (envoye, total) => surAvancement({ envoye, total, enPause: !navigator.onLine }),
      onSuccess: () => {
        window.removeEventListener("online", reprendre);
        ok();
      },
      onError: (erreur) => {
        // Hors connexion : on attend le retour du réseau, puis l'envoi reprend où il en était.
        if (!navigator.onLine) {
          surAvancement({ envoye: 0, total: fichier.size, enPause: true });
          return;
        }
        window.removeEventListener("online", reprendre);
        ko(erreur);
      },
    });

    const reprendre = () => envoi.start();
    window.addEventListener("online", reprendre);
    signal?.addEventListener("abort", () => {
      window.removeEventListener("online", reprendre);
      envoi.abort(true).catch(() => {});
      ko(new DOMException("annulé", "AbortError"));
    });

    // Reprend un envoi interrompu du même fichier s'il y en a un.
    envoi.findPreviousUploads().then((precedents) => {
      if (precedents.length) envoi.resumeFromPreviousUpload(precedents[0]);
      envoi.start();
    });
  });
}

/** Lit la durée d'une vidéo depuis la galerie du téléphone. */
export function lireDuree(url: string) {
  return new Promise<number>((ok) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const fin = (d: number) => {
      v.removeAttribute("src");
      v.load();
      ok(d);
    };
    v.onloadedmetadata = () => fin(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => fin(0);
    v.src = url;
  });
}
