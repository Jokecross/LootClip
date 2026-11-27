/* Types du module ia.mjs, pour l'importer depuis le serveur Next (TypeScript). */
export type Mot = { texte: string; debut: number; fin: number };
export type Transcription = { duree: number; mots: Mot[]; segments: Mot[] };
export type Moment = { titre: string; parties: [number, number][]; score: number; pourquoi: string; forces?: string[] };
export function transcrireSon(contenu: Uint8Array, langue?: string): Promise<Transcription>;
export function choisirMoments(
  transcription: Transcription,
  options?: { nombre?: number; type?: string; modele?: string; duree?: string },
): Promise<{ moments: Moment[]; usage: { input_tokens: number; output_tokens: number } }>;
export function motsDuMoment(mots: Mot[], parties: [number, number][]): Mot[];
