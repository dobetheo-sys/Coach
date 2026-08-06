/**
 * Parseur FIT minimal — source « Upload FIT » de la roadmap (readinessSource, slot 2).
 *
 * Zéro dépendance : décodage du format binaire FIT (Garmin/Coros/Suunto/Wahoo…)
 * limité à ce dont le coach a besoin — les messages `session` (global 18) d'un
 * fichier d'ACTIVITÉ : sport, date, durée, distance, vitesse/FC/puissance moyennes.
 * Tout le reste (records GPS, laps, événements, champs développeur) est ignoré
 * proprement en suivant les définitions, jamais en devinant des offsets.
 *
 * Ce qu'un FIT d'activité NE contient PAS : sommeil et HRV nocturne (fichiers
 * « monitoring » Garmin, non exportables sans l'API) — la saisie manuelle reste
 * la source de ces signaux, comme documenté dans readinessSource.ts.
 */
import type { CompletedSession } from "./readinessSource.ts";
import { assertImportSize } from "./importLimits.ts";
import { testDansBornes } from "../engine/constraintMatrix.ts";

/** Époque FIT : 1989-12-31T00:00:00Z. */
const FIT_EPOCH_S = 631065600;
const SPORT_MAP: Record<number, CompletedSession["d"] | undefined> = { 1: "rn", 2: "bk", 5: "sw" };

export interface FitSession {
  date: string; // ISO (début de séance)
  sport: CompletedSession["d"] | "autre";
  minutes: number; // total_timer_time
  distanceM?: number;
  avgSpeedMs?: number; // m/s
  avgHr?: number;
  avgPowerW?: number;
  normPowerW?: number;
  ascentM?: number; // total_ascent — R12.3, d'où se déduit la VAM
}

export interface FitImport {
  sessions: FitSession[];
  completed: CompletedSession[]; // prêtes pour le contrat readiness (mêmes ✓ que l'UI)
  tests: { type: "ftp" | "thrPace" | "css" | "vam"; value: number; date: string; source: string }[];
  notes: string[]; // ce qu'on n'a PAS pu estimer, et pourquoi — jamais silencieux
}

interface FieldDef { num: number; size: number }
interface MsgDef { global: number; littleEndian: boolean; fields: FieldDef[]; devBytes: number }

function u16(b: Uint8Array, o: number, le: boolean): number { return le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]; }
function u32(b: Uint8Array, o: number, le: boolean): number {
  return le
    ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 0x1000000
    : b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);
}
/** Lit un champ numérique par taille (1/2/4 octets), null si « invalide » FIT (0xFF…). */
function readNum(b: Uint8Array, o: number, size: number, le: boolean): number | null {
  if (size === 1) { const v = b[o]; return v === 0xff ? null : v; }
  if (size === 2) { const v = u16(b, o, le); return v === 0xffff ? null : v; }
  if (size === 4) { const v = u32(b, o, le); return v === 0xffffffff ? null : v; }
  return null; // tailles exotiques (strings, tableaux) : hors besoin
}

/** Décode les messages `session` d'un fichier FIT. Jette une Error si l'en-tête est invalide. */
export function parseFit(bytes: Uint8Array): FitSession[] {
  assertImportSize("FIT", bytes.length); // S-8 — avant toute lecture
  if (bytes.length < 12) throw new Error("Fichier trop court pour être un FIT");
  const headerSize = bytes[0];
  if ((headerSize !== 12 && headerSize !== 14) || String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== ".FIT")
    throw new Error("En-tête FIT invalide (signature .FIT absente)");
  const dataSize = u32(bytes, 4, true);
  const end = Math.min(bytes.length, headerSize + dataSize); // le CRC final (2 octets) reste dehors
  const defs = new Map<number, MsgDef>();
  const sessions: FitSession[] = [];
  let o = headerSize;
  while (o < end) {
    const hdr = bytes[o++];
    const isCompressed = (hdr & 0x80) !== 0;
    const localType = isCompressed ? (hdr >> 5) & 0x03 : hdr & 0x0f;
    if (!isCompressed && (hdr & 0x40) !== 0) {
      // Message de DÉFINITION : c'est lui qui dicte la taille des données qui suivent
      const littleEndian = bytes[o + 1] === 0;
      const global = u16(bytes, o + 2, littleEndian);
      const nf = bytes[o + 4];
      o += 5;
      const fields: FieldDef[] = [];
      for (let i = 0; i < nf; i++) { fields.push({ num: bytes[o], size: bytes[o + 1] }); o += 3; }
      let devBytes = 0;
      if ((hdr & 0x20) !== 0) { // champs développeur : à sauter dans chaque donnée
        const nd = bytes[o++];
        for (let i = 0; i < nd; i++) { devBytes += bytes[o + 1]; o += 3; }
      }
      defs.set(localType, { global, littleEndian, fields, devBytes });
      continue;
    }
    // Message de DONNÉES (normal ou horodatage compressé)
    const def = defs.get(localType);
    if (!def) throw new Error("Message de données sans définition (fichier corrompu)");
    if (def.global === 18) {
      const s: Partial<Record<"start" | "timer" | "dist" | "speed" | "hr" | "power" | "np" | "ascent" | "sport", number>> = {};
      let fo = o;
      for (const f of def.fields) {
        const v = readNum(bytes, fo, f.size, def.littleEndian);
        fo += f.size;
        if (v == null) continue;
        if (f.num === 2) s.start = v;
        else if (f.num === 5) s.sport = v;
        else if (f.num === 8) s.timer = v; // ms
        else if (f.num === 9) s.dist = v; // cm
        else if (f.num === 14) s.speed = v; // mm/s
        else if (f.num === 16) s.hr = v;
        else if (f.num === 20) s.power = v;
        else if (f.num === 34) s.np = v;
        // R12.3 — total_ascent (champ 22, en mètres) : la seule donnée qui permet de dériver
        // une VAM depuis une montre. Sans elle, l'athlète pouvait connecter sa montre et
        // rester avec une VAM devinée — le chemin de masse était vide.
        else if (f.num === 22) s.ascent = v;
      }
      if (s.timer != null && s.timer > 0) {
        const startS = s.start != null ? s.start + FIT_EPOCH_S : null;
        sessions.push({
          date: startS != null ? new Date(startS * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          sport: (s.sport != null && SPORT_MAP[s.sport]) || "autre",
          minutes: Math.round(s.timer / 1000 / 60),
          distanceM: s.dist != null ? Math.round(s.dist / 100) : undefined,
          avgSpeedMs: s.speed != null ? s.speed / 1000 : undefined,
          avgHr: s.hr,
          avgPowerW: s.power,
          normPowerW: s.np,
          ascentM: s.ascent,
        });
      }
    }
    o += def.fields.reduce((a, f) => a + f.size, 0) + def.devBytes;
  }
  return sessions;
}

/** Séances FIT → contrat readiness (CompletedSession) + estimations de références,
 *  avec les MÊMES règles prudentes que l'import Strava (jamais de FTP sans puissance,
 *  l'allure moyenne d'une course est un plancher, pas un seuil). */
/**
 * Les références que l'import montre sait DÉRIVER. Déclarée ici, à côté du code qui les émet,
 * pour qu'un banc puisse la vérifier au lieu de faire confiance à un tableau écrit à la main
 * (R12, section C : « aucune référence ne doit rester en non/non/devinée »).
 */
export const FIT_DERIVED_TESTS = ["ftp", "thrPace", "css", "vam"] as const;

/** Sous ce seuil, la « VAM » d'une sortie décrit un terrain vallonné, pas une capacité en
 *  montée : on n'en tire rien plutôt que d'écrire un chiffre faux dans le journal. */
const VAM_FIT_MIN = 250;

export function fitToImport(sessions: FitSession[]): FitImport {
  const completed: CompletedSession[] = [];
  const tests: FitImport["tests"] = [];
  const notes: string[] = [];
  for (const s of sessions) {
    if (s.sport !== "autre" && s.minutes > 0) completed.push({ date: s.date, d: s.sport, minutes: s.minutes });
    if (s.sport === "bk" && s.minutes >= 20) {
      const p = s.normPowerW || s.avgPowerW;
      // R23.1 — une mesure hors bornes physiologiques n'entre pas dans le journal, et le DIT.
      const ftpV = p && p > 0 ? testDansBornes("ftp", Math.round(p * 0.95)) : null;
      if (ftpV != null) tests.push({ type: "ftp", value: ftpV, date: s.date, source: "FIT (sortie " + s.minutes + "min)" });
      else if (p && p > 0) notes.push("Sortie vélo du " + s.date + " : puissance hors bornes physiologiques (" + Math.round(p) + " W) — FTP non retenue.");
      else notes.push("Sortie vélo du " + s.date + " sans puissance : FTP non estimée (capteur requis).");
    }
    if (s.sport === "rn" && s.minutes >= 20 && s.avgSpeedMs && s.avgSpeedMs > 0) {
      const v = testDansBornes("thrPace", Math.round(1000 / s.avgSpeedMs));
      if (v != null) tests.push({ type: "thrPace", value: v, date: s.date, source: "FIT (course " + s.minutes + "min, estimation basse)" });
      else notes.push("Course du " + s.date + " : allure hors bornes physiologiques — non retenue (trace GPS ou activité mal étiquetée).");
    }
    if (s.sport === "sw" && s.minutes >= 10 && s.avgSpeedMs && s.avgSpeedMs > 0) {
      const v = testDansBornes("css", Math.round(100 / s.avgSpeedMs));
      if (v != null) tests.push({ type: "css", value: v, date: s.date, source: "FIT (nage " + s.minutes + "min)" });
      else notes.push("Nage du " + s.date + " : allure hors bornes physiologiques — non retenue.");
    }
    // R12.3 — VAM depuis la montre. Deux garde-fous : une sortie PLATE ne produit pas de VAM
    // exploitable (on exige une pente moyenne réelle), et la moyenne d'une sortie entière
    // sous-estime la VAM seuil — on l'annonce comme une estimation BASSE plutôt que de la
    // gonfler. Une valeur basse fait un plan un peu facile ; une valeur gonflée fait un plan
    // intenable et une prédiction qui ment.
    if (s.sport === "rn" && s.minutes >= 25 && s.ascentM && s.ascentM > 0) {
      const vam = Math.round(s.ascentM / (s.minutes / 60));
      if (vam >= VAM_FIT_MIN && vam <= 2500)
        tests.push({ type: "vam", value: vam, date: s.date, source: "FIT (sortie " + s.minutes + "min, " + Math.round(s.ascentM) + "m D+, estimation basse)" });
      else if (s.ascentM < 100)
        notes.push("Sortie du " + s.date + " trop plate (" + Math.round(s.ascentM) + "m D+) : aucune VAM exploitable.");
    }
  }
  if (!sessions.length) notes.push("Aucune séance trouvée dans ce fichier (est-ce bien un FIT d'activité ?).");
  return { sessions, completed, tests, notes };
}

/** Point d'entrée UI : octets bruts → import complet. */
export function importFitBytes(buf: ArrayBuffer | Uint8Array): FitImport {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return fitToImport(parseFit(bytes));
}
