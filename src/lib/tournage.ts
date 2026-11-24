/*
 * Mode tournage : un cookie de cet appareil fait ouvrir l'onboarding du studio sur xpclip.com (next.config.ts).
 * Le droit est revérifié à chaque ouverture : sans compte de l'équipe, le cookie est retiré.
 */
import { supabase } from "@/lib/supabase";

const COOKIE = "xp_tournage";

export function poserTournage(actif: boolean) {
  document.cookie = `${COOKIE}=${actif ? 1 : ""}; path=/; max-age=${actif ? 31536000 : 0}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
}

/** true ou false selon le compte, null si le réseau n'a pas répondu. */
export async function droitStudio(): Promise<boolean | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/studio", { headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    return r.ok ? true : r.status === 403 ? false : null;
  } catch {
    return null;
  }
}
