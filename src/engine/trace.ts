/**
 * TRACE DES MUTATIONS — « quelle passe a fait ça ? », répondu une fois pour toutes.
 *
 * Cinq tours de suite, la question posée par un défaut a été « quelle passe a modifié cette
 * séance, et pourquoi ». Cinq fois, la réponse a été cherchée par élimination : on retire une
 * passe, on régénère, on regarde. C'est cher, et ça ne se capitalise pas.
 *
 * Trois exigences, tenues ici :
 *   1. ORDONNÉE — les entrées sortent dans l'ordre d'exécution des passes. C'est l'ordre qui
 *      explique les collisions : une passe tardive qui défait le travail d'une passe précoce est
 *      invisible autrement.
 *   2. ACTIVABLE PAR COMBINAISON — `EB_TRACE=swim/moyenne/inter` (ou n'importe quelle étiquette
 *      posée par l'appelant). Une trace globale sur 297 combinaisons est illisible.
 *   3. SANS EFFET SUR LA SORTIE — `record()` sort immédiatement quand la trace est éteinte, et
 *      ne touche jamais l'objet observé. Le plan généré trace active doit être identique au
 *      caractère près ; `scripts/trace.mjs` le VÉRIFIE à chaque exécution.
 */
export interface TraceEntry {
  seq: number;
  pass: string;
  weekNum?: number;
  date?: string;
  sessionName?: string;
  discipline?: string;
  field: "minutes" | "distance" | "reps" | "zone" | "suppression" | "insertion" | "renommage";
  before?: string | number;
  after?: string | number;
  reason: string;
  envelope?: string;
}

let ON = false;
let LABEL = "";
let SEQ = 0;
const ENTRIES: TraceEntry[] = [];

/** Ouvre la trace pour une étiquette de combinaison. `null` l'éteint. */
export function traceOn(label: string | null): void {
  ON = !!label;
  LABEL = label || "";
  SEQ = 0;
  ENTRIES.length = 0;
}
export function traceEnabled(): boolean {
  return ON;
}
export function record(e: Omit<TraceEntry, "seq">): void {
  if (!ON) return;
  ENTRIES.push({ ...e, seq: ++SEQ });
}
export function traceDump(): { label: string; entries: TraceEntry[] } {
  return { label: LABEL, entries: ENTRIES.slice() };
}
