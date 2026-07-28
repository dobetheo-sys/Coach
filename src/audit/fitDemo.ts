/**
 * Démo/spec exécutable du parseur FIT — npm run demo:fit.
 * Un fichier FIT synthétique est construit octet par octet (en-tête, définitions,
 * données, champs développeur, gros-boutien, valeurs invalides, CRC) puis décodé :
 * chaque garantie du parseur est assertée. Exit 1 au moindre écart.
 */
import { parseFit, fitToImport, importFitBytes } from "../readiness/fitParser.ts";

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

// ---- Fabrique d'octets FIT ----
const FIT_EPOCH_S = 631065600;
function le16(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff]; }
function le32(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]; }
function be16(v: number): number[] { return [(v >> 8) & 0xff, v & 0xff]; }
function be32(v: number): number[] { return [(v >>> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]; }
function fitTs(iso: string): number { return Math.floor(new Date(iso + "T07:00:00Z").getTime() / 1000) - FIT_EPOCH_S; }

// Définition session (global 18), petit-boutien, champs : start_time(2,u32) sport(5,u8)
// total_timer_time(8,u32) total_distance(9,u32) avg_speed(14,u16) avg_heart_rate(16,u8)
// avg_power(20,u16) normalized_power(34,u16) — + 1 champ développeur de 4 octets à sauter.
const defLE = [
  0x60, // en-tête définition, local 0, bit dev (0x20) activé
  0, 0, ...le16(18), 8,
  2, 4, 0x86, 5, 1, 0x00, 8, 4, 0x86, 9, 4, 0x86, 14, 2, 0x84, 16, 1, 0x02, 20, 2, 0x84, 34, 2, 0x84,
  1, // 1 champ développeur
  0, 4, 0, // num 0, taille 4, dev index 0
];
function dataLE(startIso: string, sport: number, timerMs: number, distCm: number, speedMms: number, hr: number, power: number, np: number): number[] {
  return [0x00, ...le32(fitTs(startIso)), sport, ...le32(timerMs), ...le32(distCm), ...le16(speedMms), hr, ...le16(power), ...le16(np), 0xde, 0xad, 0xbe, 0xef];
}
// Définition gros-boutien (local 1), sans champs dev : start_time, sport, timer, avg_speed
const defBE = [0x41, 0, 1, ...be16(18), 4, 2, 4, 0x86, 5, 1, 0x00, 8, 4, 0x86, 14, 2, 0x84];
function dataBE(startIso: string, sport: number, timerMs: number, speedMms: number): number[] {
  return [0x01, ...be32(fitTs(startIso)), sport, ...be32(timerMs), ...be16(speedMms)];
}
// Message non-session (global 20 = record, local 2) : doit être SAUTÉ sans se tromper d'offset
const defRecord = [0x42, 0, 0, ...le16(20), 2, 253, 4, 0x86, 3, 1, 0x02];
const dataRecord = [0x02, ...le32(12345), 77];

function buildFit(records: number[]): Uint8Array {
  const data = records;
  const header = [14, 0x10, ...le16(2140), ...le32(data.length), 0x2e, 0x46, 0x49, 0x54, 0, 0]; // ".FIT", CRC en-tête à 0 (toléré)
  return new Uint8Array([...header, ...data, 0, 0]); // + CRC final 2 octets (non vérifié)
}

// ---- 1. Fichier complet : vélo LE avec puissance + record à sauter + course BE ----
const fit = buildFit([
  ...defLE,
  ...dataLE("2026-07-20", 2, 61 * 60 * 1000, 3200000, 8333, 142, 210, 225), // vélo 61min, 32km, NP 225W
  ...defRecord, ...dataRecord,
  ...defBE,
  ...dataBE("2026-07-22", 1, 40 * 60 * 1000, 3703), // course 40min à 3.703 m/s (~4'30/km)
  ...defLE,
  ...dataLE("2026-07-24", 5, 30 * 60 * 1000, 150000, 1333, 0xff, 0xffff, 0xffff), // nage 30min, FC/puissance invalides
]);
const sessions = parseFit(fit);
check("3 sessions décodées (record ignoré)", sessions.length === 3, "trouvé " + sessions.length);
const [ride, run, swim] = sessions;
check("vélo : sport/date/durée", ride.sport === "bk" && ride.date === "2026-07-20" && ride.minutes === 61);
check("vélo : distance 32km, NP 225W", ride.distanceM === 32000 && ride.normPowerW === 225 && ride.avgPowerW === 210);
check("champ développeur sauté sans décalage", run.sport === "rn" && run.minutes === 40, JSON.stringify(run));
check("gros-boutien décodé (allure ~4'30/km)", run.avgSpeedMs != null && Math.abs(1000 / run.avgSpeedMs - 270) < 1);
check("valeurs invalides (0xFF/0xFFFF) → absentes", swim.avgHr == null && swim.avgPowerW == null && swim.normPowerW == null);
check("nage : sport + vitesse", swim.sport === "sw" && swim.avgSpeedMs === 1.333);

// ---- 2. Estimations prudentes (mêmes règles que Strava) ----
const imp = fitToImport(sessions);
check("3 séances CompletedSession (contrat readiness)", imp.completed.length === 3 && imp.completed.every((c) => c.minutes > 0));
const ftp = imp.tests.find((t) => t.type === "ftp");
check("FTP = 95% de la NP (214W)", !!ftp && ftp.value === Math.round(225 * 0.95), JSON.stringify(ftp));
const pace = imp.tests.find((t) => t.type === "thrPace");
check("allure estimée ~270 s/km, datée du bon jour", !!pace && Math.abs(pace.value - 270) <= 1 && pace.date === "2026-07-22");
const css = imp.tests.find((t) => t.type === "css");
check("CSS estimé ~75 s/100m", !!css && Math.abs(css.value - 75) <= 1);

// ---- 3. Vélo SANS puissance : FTP jamais inventée, note explicite ----
const noPow = fitToImport(parseFit(buildFit([...defLE, ...dataLE("2026-07-21", 2, 45 * 60000, 2000000, 7000, 130, 0xffff, 0xffff)])));
check("pas de FTP sans capteur de puissance", !noPow.tests.some((t) => t.type === "ftp"));
check("note explicite (jamais silencieux)", noPow.notes.some((n) => n.includes("sans puissance")));

// ---- 4. Robustesse : fichiers invalides refusés proprement ----
let threw = 0;
try { parseFit(new Uint8Array([1, 2, 3])); } catch { threw++; }
try { parseFit(new Uint8Array(Array(40).fill(0x41))); } catch { threw++; }
try { parseFit(buildFit([0x00, 1, 2, 3])); } catch { threw++; } // données sans définition
check("fichiers invalides → erreur claire (3/3)", threw === 3, String(threw));
check("importFitBytes accepte un ArrayBuffer", importFitBytes(fit.buffer.slice(0)).sessions.length === 3);

if (failures) { console.error("\n" + failures + " échec(s)"); process.exit(1); }
console.log("\nDémo FIT : toutes les garanties tiennent.");
