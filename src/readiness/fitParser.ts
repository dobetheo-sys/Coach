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
}

export interface FitImport {
  sessions: FitSession[];
  completed: CompletedSession[]; // prêtes pour le contrat readiness (mêmes ✓ que l'UI)
  tests: { type: "ftp" | "thrPace" | "css"; value: number; date: string; source: string }[];
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
      const s: Partial<Record<"start" | "timer" | "dist" | "speed" | "hr" | "power" | "np" | "sport", number>> = {};
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
export function fitToImport(sessions: FitSession[]): FitImport {
  const completed: CompletedSession[] = [];
  const tests: FitImport["tests"] = [];
  const notes: string[] = [];
  for (const s of sessions) {
    if (s.sport !== "autre" && s.minutes > 0) completed.push({ date: s.date, d: s.sport, minutes: s.minutes });
    if (s.sport === "bk" && s.minutes >= 20) {
      const p = s.normPowerW || s.avgPowerW;
      if (p && p > 0) tests.push({ type: "ftp", value: Math.round(p * 0.95), date: s.date, source: "FIT (sortie " + s.minutes + "min)" });
      else notes.push("Sortie vélo du " + s.date + " sans puissance : FTP non estimée (capteur requis).");
    }
    if (s.sport === "rn" && s.minutes >= 20 && s.avgSpeedMs && s.avgSpeedMs > 0)
      tests.push({ type: "thrPace", value: Math.round(1000 / s.avgSpeedMs), date: s.date, source: "FIT (course " + s.minutes + "min, estimation basse)" });
    if (s.sport === "sw" && s.minutes >= 10 && s.avgSpeedMs && s.avgSpeedMs > 0)
      tests.push({ type: "css", value: Math.round(100 / s.avgSpeedMs), date: s.date, source: "FIT (nage " + s.minutes + "min)" });
  }
  if (!sessions.length) notes.push("Aucune séance trouvée dans ce fichier (est-ce bien un FIT d'activité ?).");
  return { sessions, completed, tests, notes };
}

/** Point d'entrée UI : octets bruts → import complet. */
export function importFitBytes(buf: ArrayBuffer | Uint8Array): FitImport {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return fitToImport(parseFit(bytes));
}
