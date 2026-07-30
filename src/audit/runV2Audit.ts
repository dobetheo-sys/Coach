/**
 * runV2Audit — fuzz des 486 combinaisons à travers le moteur V2 (Sprint 1),
 * scoré par l'auditeur INCHANGÉ (la spec), avec comparaison V1.5 ↔ V2.
 * Écrit audit-results/v2-audit.{json,md} ; exit 1 à la moindre violation dure.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AthleteProfile, Sport } from "../engine/types.ts";
import { generateAudited } from "../generator/repairLoop.ts";
import { THRESHOLDS } from "./coherenceScorer.ts";

// D10-1 — le trail est un SPORT depuis R7 : le harnais auditait encore un format `run/trail`
// qui n'existe plus dans l'UI, et n'auditait JAMAIS le vrai module trail (couvert seulement
// par le banc v6 et l'E2E). Le format disparaît, le sport prend sa place — le nombre de
// combinaisons est inchangé (486), ce qui est vérifié en CI.
const SPORTS: Record<Sport, string[]> = {
  run: ["5k", "10k", "semi", "marathon"],
  bike: ["crit", "route", "cyclo", "clm", "gravel"],
  swim: ["sprint", "demifond", "fond", "ow"],
  tri: ["S", "M", "70.3", "Full"],
  trail: [""], // pas de format : la catégorie d'effort est DÉDUITE des données de la course
  duathlon: ["S", "M", "L", "PM"], // R10 phase 2 — un sport non audité n'est pas livrable
  swimrun: ["experience", "sprint", "series", "championship"], // R10 phase 3
};
const HISTORIES = ["reprise", "confirme", "ancien"] as const;
const LEVELS = ["debutant", "inter", "avance"] as const;
const INTENTS = ["competition", "finir", "plaisir"] as const;

function baseProfile(): Omit<AthleteProfile, "sport" | "format"> {
  return {
    vol_max: "10", sessions_max: "6", dispo: "semaine", off_which: "", injury: "", age: "35",
    ftp_known: "oui", ftp: "250", pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:55", races: "non",
  };
}

interface Row {
  sport: string; format: string; history: string; level: string; intent: string;
  score: number; peakRatio: number; peakDeclaredH: number; peakPrescribedH: number;
  longShare: number; taperVsPeak: number | null; weeksOver: number; weeksUnder: number; easyShare: number;
  repairs: number; warnings: string[]; hardViolations: string[];
}

const pct = (x: number) => (x * 100).toFixed(0) + "%";
const q = (arr: number[], p: number) => {
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * p, lo = Math.floor(i);
  return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
};

const rows: Row[] = [];
let errors = 0;
let sampleDecisions: string | null = null;

for (const sport of Object.keys(SPORTS) as Sport[]) {
  for (const format of SPORTS[sport]) {
    for (const history of HISTORIES) {
      for (const level of LEVELS) {
        for (const intent of INTENTS) {
          // Le trail sans données de course n'auditerait que ses valeurs par défaut : on lui
          // donne une vraie course (62 km / 3 200 m D+, technique, partiellement nocturne).
          // Le swimrun se décrit par les données de l'épreuve (World Series ÖTILLÖ Cannes) :
          // sans elles on n'auditerait que des valeurs par défaut.
          const swimrunData = sport === "swimrun"
            ? { swim_total_m: "7850", run_total_km: "33", race_dplus_m: "900", segments_n: "20",
                longest_swim_m: "1400", water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier" }
            : {};
          const trailData = sport === "trail"
            ? { race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique", race_night: "partielle",
                train_dplus_access: "collines", treadmill: "non", poles: "a_decider", vam_known: "oui", vam: "850" }
            : {};
          const profile: AthleteProfile = { ...baseProfile(), sport, format, history, level, intent, ...trailData, ...swimrunData };
          try {
            const res = generateAudited(profile);
            const a = res.audit;
            rows.push({
              sport, format, history, level, intent,
              score: a.score, peakRatio: a.peak.ratio, peakDeclaredH: a.peak.declaredMin / 60,
              peakPrescribedH: a.peak.prescribedMin / 60, longShare: a.peak.longShare,
              taperVsPeak: a.taperVsPeak, weeksOver: a.weeksOver, weeksUnder: a.weeksUnder, easyShare: a.easyShare,
              repairs: res.repairs.length, warnings: res.warnings, hardViolations: a.hardViolations,
            });
            if (!sampleDecisions && sport === "tri" && format === "70.3" && history === "confirme" && level === "inter" && intent === "competition") {
              sampleDecisions = res.decisions.map((d) => "- **" + d.id + "** · " + d.what + " : `" + d.val + "` — " + d.why).join("\n");
            }
          } catch (e) {
            errors++;
            console.error("ERREUR", sport, format, history, level, intent, e);
          }
        }
      }
    }
  }
}

// ---------- Rapport ----------
let md = "# Audit V2 (Sprint 1) — moteur de raisonnement + générateur\n\n";
md += "Généré par `npm run audit:v2`. " + rows.length + " combinaisons via le moteur V2, scorées par l'auditeur inchangé. " + errors + " erreur(s).\n\n";
md += "| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Longue >55% | Facile (méd) | Réparations | Score moyen |\n";
md += "|---|---|---|---|---|---|---|---|---|---|---|---|\n";
const bySport = new Map<string, Row[]>();
for (const r of rows) (bySport.get(r.sport) ?? bySport.set(r.sport, []).get(r.sport)!).push(r);
for (const [sport, rs] of bySport) {
  const ratios = rs.map((r) => r.peakRatio);
  md += "| " + sport + " | " + rs.length +
    " | " + q(ratios, 0.5).toFixed(2) +
    " | " + q(ratios, 0.1).toFixed(2) + "–" + q(ratios, 0.9).toFixed(2) +
    " | " + rs.filter((r) => r.peakRatio > THRESHOLDS.overPrescribed).length +
    " | " + rs.filter((r) => r.peakRatio < THRESHOLDS.underPrescribed).length +
    " | " + rs.reduce((s, r) => s + r.weeksOver + r.weeksUnder, 0) +
    " | " + q(rs.map((r) => r.taperVsPeak ?? 0), 0.5).toFixed(2) +
    " | " + rs.filter((r) => r.longShare > THRESHOLDS.longShareAlert).length +
    " | " + pct(q(rs.map((r) => r.easyShare), 0.5)) +
    " | " + rs.reduce((s, r) => s + r.repairs, 0) +
    " | " + (rs.reduce((s, r) => s + r.score, 0) / rs.length).toFixed(0) + " |\n";
}

// ---------- Comparaison V1.5 ↔ V2 ----------
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "audit-results");
const v1Path = join(outDir, "v1-audit.json");
if (existsSync(v1Path)) {
  interface V1Row { sport: string; peakRatio: number; score: number; taperVsPeak: number | null; peakDeclaredH: number; peakPrescribedH: number }
  const v1 = JSON.parse(readFileSync(v1Path, "utf8")) as V1Row[];
  md += "\n## V1.5 ↔ V2 (même auditeur, mêmes 486 profils)\n\n";
  md += "| Sport | Ratio pic méd V1.5 → V2 | Pire ratio V1.5 → V2 | Score moyen V1.5 → V2 |\n|---|---|---|---|\n";
  for (const [sport, rs] of bySport) {
    const v1s = v1.filter((r) => r.sport === sport);
    const worst = (arr: number[]) => arr.reduce((a, b) => (Math.abs(Math.log(b || 0.01)) > Math.abs(Math.log(a || 0.01)) ? b : a), 1);
    md += "| " + sport +
      " | " + q(v1s.map((r) => r.peakRatio), 0.5).toFixed(2) + " → " + q(rs.map((r) => r.peakRatio), 0.5).toFixed(2) +
      " | " + worst(v1s.map((r) => r.peakRatio)).toFixed(2) + " → " + worst(rs.map((r) => r.peakRatio)).toFixed(2) +
      " | " + (v1s.reduce((s, r) => s + r.score, 0) / v1s.length).toFixed(0) + " → " + (rs.reduce((s, r) => s + r.score, 0) / rs.length).toFixed(0) + " |\n";
  }
}

// ---------- Transparence du raisonnement ----------
if (sampleDecisions) {
  md += "\n## Décisions du moteur — exemple (tri / 70.3 / confirme / inter / competition)\n\n" + sampleDecisions + "\n";
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "v2-audit.json"), JSON.stringify(rows, null, 1));
writeFileSync(join(outDir, "v2-audit.md"), md);
console.log(md);

const failing = rows.filter((r) => r.hardViolations.length > 0);
if (failing.length > 0 || errors > 0) {
  console.error("\n✗ AUDIT V2 ROUGE : " + failing.length + " combinaison(s) en violation dure, " + errors + " erreur(s).");
  for (const r of failing.slice(0, 10)) console.error("  - " + [r.sport, r.format, r.history, r.level, r.intent].join("/") + " : " + r.hardViolations.join(" ; "));
  process.exitCode = 1;
} else {
  console.log("✓ Audit V2 vert : 0 violation dure sur " + rows.length + " combinaisons.");
}
