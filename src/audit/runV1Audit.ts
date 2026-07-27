/**
 * runV1Audit — exécute l'audit « coach de charge » sur les 486 combinaisons V1
 * (4 sports × formats × 3 historiques × 3 niveaux × 3 intentions).
 *
 * Termine l'audit interrompu de note.md : volume réellement prescrit dans la
 * semaine du pic vs volume hebdo déclaré (w.vol), + part de la séance longue.
 * Suspects du premier passage (parseurs naïfs, invalides) : RUN ok (~1.00),
 * BIKE possiblement sur-prescrit, SWIM/TRI sous-prescrits.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadV1 } from "../harness/v1Harness.ts";
import { auditPlan, THRESHOLDS, type PlanAudit } from "./coherenceScorer.ts";

const HISTORIES = ["reprise", "confirme", "ancien"];
const LEVELS = ["debutant", "inter", "avance"];
const INTENTS = ["competition", "finir", "plaisir"];

/** Profil canonique : métriques connues → zones numériques dans les textes (parsing fiable). */
function baseAnswers(): Record<string, string> {
  return {
    vol_max: "10",
    sessions_max: "6",
    dispo: "semaine",
    off_which: "",
    injury: "",
    age: "35",
    hr_max: "",
    hr_rest: "",
    ftp_known: "oui",
    ftp: "250",
    pace_known: "oui",
    pace: "4:30",
    css_known: "oui",
    css: "1:55",
    races: "non",
  };
}

interface ComboResult {
  sport: string;
  format: string;
  history: string;
  level: string;
  intent: string;
  score: number;
  peakRatio: number;
  peakDeclaredH: number;
  peakPrescribedH: number;
  longShare: number;
  weeksOver: number;
  weeksUnder: number;
  taperRatio: number | null;
  taperVsPeak: number | null;
  recupHeavier: number;
  adjacentHard: number;
  coverage: number;
  nominalSessions: number;
  hardViolations: string[];
  softIssues: string[];
}

function pct(x: number): string {
  return (x * 100).toFixed(0) + "%";
}
function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

const v1 = loadV1();
const results: ComboResult[] = [];
const allFlags = new Map<string, number>();
let errors = 0;

for (const sport of Object.keys(v1.SPORTS)) {
  const formats = v1.SPORTS[sport].formats.map((f) => f[0]);
  for (const format of formats) {
    for (const history of HISTORIES) {
      for (const level of LEVELS) {
        for (const intent of INTENTS) {
          v1.S.sport = sport;
          const a = { ...baseAnswers(), format, history, level, intent };
          let audit: PlanAudit;
          try {
            audit = auditPlan(v1.buildPlan(a));
          } catch (e) {
            errors++;
            console.error("ERREUR", sport, format, history, level, intent, e);
            continue;
          }
          results.push({
            sport,
            format,
            history,
            level,
            intent,
            score: audit.score,
            peakRatio: audit.peak.ratio,
            peakDeclaredH: audit.peak.declaredMin / 60,
            peakPrescribedH: audit.peak.prescribedMin / 60,
            longShare: audit.peak.longShare,
            weeksOver: audit.weeksOver,
            weeksUnder: audit.weeksUnder,
            taperRatio: audit.taperRatio,
            taperVsPeak: audit.taperVsPeak,
            recupHeavier: audit.recupHeavierCount,
            adjacentHard: audit.adjacentHardDays,
            coverage: audit.coverage,
            nominalSessions: audit.nominalSessionsTotal,
            hardViolations: audit.hardViolations,
            softIssues: audit.softIssues,
          });
        }
      }
    }
  }
}

// ---------- Agrégation par sport ----------
const bySport = new Map<string, ComboResult[]>();
for (const r of results) {
  const arr = bySport.get(r.sport) ?? [];
  arr.push(r);
  bySport.set(r.sport, arr);
}

let md = "# Audit V1 « coach de charge » — résultats\n\n";
md += "Généré par `npm run audit:v1` (Sprint 0). " + results.length + " combinaisons, " + errors + " erreur(s).\n\n";
md +=
  "Seuils : sur-prescrit > " +
  THRESHOLDS.overPrescribed +
  ", sous-prescrit < " +
  THRESHOLDS.underPrescribed +
  ", alerte séance longue > " +
  pct(THRESHOLDS.longShareAlert) +
  " de la semaine. « Hors bande » = semaines normales (hors récup/affûtage) au ratio hors [0.5, 1.4].\n" +
  "« Taper vs pic » = minutes prescrites de la dernière semaine d'affûtage / semaine pic (attendu ≪ 1).\n\n";
md += "| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Récup+lourde | Longue >55% | Sans volume/plan | Couverture | Score moyen |\n";
md += "|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";

for (const [sport, rs] of bySport) {
  const ratios = rs.map((r) => r.peakRatio).sort((a, b) => a - b);
  const tvp = rs.map((r) => r.taperVsPeak ?? 0).sort((a, b) => a - b);
  const totalNormalWeeks = rs.reduce((s, r) => s + r.weeksOver + r.weeksUnder, 0);
  md +=
    "| " + sport +
    " | " + rs.length +
    " | " + quantile(ratios, 0.5).toFixed(2) +
    " | " + quantile(ratios, 0.1).toFixed(2) + "–" + quantile(ratios, 0.9).toFixed(2) +
    " | " + rs.filter((r) => r.peakRatio > THRESHOLDS.overPrescribed).length +
    " | " + rs.filter((r) => r.peakRatio < THRESHOLDS.underPrescribed).length +
    " | " + totalNormalWeeks +
    " | " + quantile(tvp, 0.5).toFixed(2) +
    " | " + rs.filter((r) => r.recupHeavier > 0).length +
    " | " + rs.filter((r) => r.longShare > THRESHOLDS.longShareAlert).length +
    " | " + (rs.reduce((s, r) => s + r.nominalSessions, 0) / rs.length).toFixed(1) +
    " | " + pct(rs.reduce((s, r) => s + r.coverage, 0) / rs.length) +
    " | " + (rs.reduce((s, r) => s + r.score, 0) / rs.length).toFixed(0) +
    " |\n";
}

// ---------- Affûtage inopérant ----------
const taperBroken = results.filter((r) => (r.taperVsPeak ?? 0) > 0.85);
md += "\n## Affûtage\n\n";
md +=
  taperBroken.length +
  "/" +
  results.length +
  " combinaisons ont une dernière semaine d'affûtage prescrite à >85% du pic (défaut V1 : `sess()` " +
  "ne traite pas la phase `taper`, les séances restent pleine taille alors que le volume déclaré chute).\n";

// ---------- Pires cas par sport ----------
md += "\n## Pires cas (ratio pic le plus extrême par sport)\n\n";
for (const [sport, rs] of bySport) {
  const worst = [...rs].sort(
    (a, b) => Math.abs(Math.log(b.peakRatio || 0.01)) - Math.abs(Math.log(a.peakRatio || 0.01))
  )[0];
  md +=
    "- **" +
    sport +
    "** : " +
    worst.format +
    "/" +
    worst.history +
    "/" +
    worst.level +
    "/" +
    worst.intent +
    " → ratio " +
    worst.peakRatio.toFixed(2) +
    " (déclaré " +
    worst.peakDeclaredH.toFixed(1) +
    "h, prescrit " +
    worst.peakPrescribedH.toFixed(1) +
    "h), longue " +
    pct(worst.longShare) +
    "\n";
}

// ---------- Sorties ----------
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "audit-results");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "v1-audit.json"), JSON.stringify(results, null, 1));
writeFileSync(join(outDir, "v1-audit.md"), md);

console.log(md);
console.log("→ audit-results/v1-audit.json (" + results.length + " combinaisons)");
