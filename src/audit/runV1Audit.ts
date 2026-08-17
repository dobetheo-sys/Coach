/**
 * runV1Audit — exécute l'audit « coach de charge » sur les 486 combinaisons
 * (4 sports × formats × 3 historiques × 3 niveaux × 3 intentions).
 *
 * Cible : Coach_Pro_V1.5.html. Vérifie le ratio prescrit/déclaré (vol_declared),
 * la part de la séance longue, ET les règles d'acceptation de la spec « audit 2 » :
 * affûtage ≥40% de réduction vs pic, zéro VO2max en affûtage, bricks dans les
 * bornes du format, semaine max en phase "peak" (avec brick en tri).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadV1 } from "../harness/v1Harness.ts";
import { auditPlan, THRESHOLDS, type PlanAudit } from "./coherenceScorer.ts";
import type { AthleteRefs } from "../engine/loadModel.ts";

/** Mêmes valeurs que le profil canonique ci-dessous : css 1:55 → 115 s/100m, pace 4:30 → 270 s/km. */
const REFS: AthleteRefs = { cssSecPer100m: 115, thrPaceSecPerKm: 270 };

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
  vo2InTaper: number;
  brickCapViolations: number;
  peakInPeakPhase: boolean;
  peakHasBrick: boolean | null;
  declJumps: number;
  auditJumpsHard: number;
  auditJumpsSoft: number;
  consecutiveLongRuns: number;
  beginnerLongRunOver3h: number;
  smallSwims: number;
  unexplainedSessions: number;
  easyShare: number;
  estimatorGapMed: number | null;
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
const refus: string[] = [];

/**
 * R20.4 — LE HARNAIS NE MESURE PLUS LE GÉNÉRATEUR DE REPLI, MÊME PAR RICOCHET.
 *
 * `loadV1()` charge bien le bundle V2 (correctif de la série « mesures rendues honnêtes ») et
 * LÈVE s'il n'y arrive pas. Mais il appelle ensuite `buildPlan` du HTML, qui est un WRAPPER :
 * il tente `EBV2.buildPlan`, **attrape toute exception** et retombe sur `buildPlanLegacy`. Un
 * refus d'entrée typé — le contrat R11, celui qui dit « ce format n'existe pas » — était donc
 * avalé, et le harnais auditait le générateur mort en croyant auditer le produit.
 *
 * Mesuré : `SPORTS.run.formats` du HTML gelé contient encore `trail`, sorti de `run` depuis R7.
 * **27 des 486 combinaisons** (1 format × 3 historiques × 3 niveaux × 3 intentions) mesuraient
 * le legacy. Personne ne l'avait vu parce que le legacy satisfaisait toutes les règles auditées
 * jusqu'ici ; C26c est la première qu'il ne satisfait pas, et c'est elle qui l'a révélé.
 *
 * On appelle donc le moteur DIRECTEMENT. Un refus typé est un COMPORTEMENT (il se compte et
 * s'affiche, comme au golden et au banc v7), jamais une erreur et jamais un plan de repli.
 */
const EB = (globalThis as { EBV2?: { buildPlan: (s: string, a: Record<string, string>) => unknown } }).EBV2;
function planOf(sport: string, a: Record<string, string>) {
  if (!EB) throw new Error("bundle EBV2 absent — le harnais auditerait le générateur de repli");
  return EB.buildPlan(sport, a);
}

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
            audit = auditPlan(planOf(sport, a) as never, { sport, format, level, history, refs: REFS });
          } catch (e) {
            if ((e as { code?: string }).code === "ENTREE_INVALIDE") {
              refus.push(sport + "/" + format + " : " + String((e as { human?: string }).human ?? "").slice(0, 90));
              continue;
            }
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
            vo2InTaper: audit.vo2InTaper,
            brickCapViolations: audit.brickCapViolations,
            peakInPeakPhase: audit.peakInPeakPhase,
            peakHasBrick: audit.peakHasBrick,
            declJumps: audit.declJumps,
            auditJumpsHard: audit.auditJumpsHard,
            auditJumpsSoft: audit.auditJumpsSoft,
            consecutiveLongRuns: audit.consecutiveLongRuns,
            beginnerLongRunOver3h: audit.beginnerLongRunOver3h,
            smallSwims: audit.smallSwims,
            unexplainedSessions: audit.unexplainedSessions,
            easyShare: audit.easyShare,
            estimatorGapMed: audit.estimatorGapMed,
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
  "« Taper vs pic » = minutes prescrites de la dernière semaine d'affûtage / semaine pic (attendu ≪ 1).\n\n" +
  "\n⚠ **Le score est STRUCTUREL, et il IGNORE les alertes.** Il part de 100 et ne se décrémente que sur\ndes grandeurs de structure — sauts de charge, ratio du pic, semaines hors bande, part de la sortie\nlongue, jours durs adjacents, part de facile. Le canal `warnings` (R11.2) n'entre dans AUCUN de ces\ntermes. Un lot dont le changement principal est une alerte HONNÊTE ne bouge donc pas ce chiffre, et\nune hausse concomitante a nécessairement une autre cause — sans ce libellé, on relit le rapport six\nmois plus tard en concluant que le lot a amélioré la qualité des plans alors qu'il a ajouté une\nalerte. Mesuré (`npm run mesure:score-alertes`, 108 profils tri) : AUCUNE relation monotone entre\nle nombre d'alertes et le score, écarts-types 5,6 à 10,6 — les moyennes se recouvrent largement,\naucune ne se cite seule comme un effet.\n";
md += "| Sport | n | Ratio pic (méd) | p10–p90 | Pics >1.4 | Pics <0.5 | Sem. hors bande | Taper vs pic (méd) | Récup+lourde | Longue >55% | Sans volume/plan | Couverture | Score STRUCTUREL moyen |\n";
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

// ---------- Spec audit 2 ----------
const taperBroken = results.filter((r) => (r.taperVsPeak ?? 0) > 0.6);
const vo2Taper = results.filter((r) => r.vo2InTaper > 0);
const brickBad = results.filter((r) => r.brickCapViolations > 0);
const peakBad = results.filter((r) => !r.peakInPeakPhase);
const brickMissing = results.filter((r) => r.peakHasBrick === false);
md += "\n## Règles d'acceptation (spec « audit 2 »)\n\n";
md += "- Affûtage <40% de réduction vs pic : **" + taperBroken.length + "/" + results.length + "** combinaisons en échec\n";
md += "- VO2max en semaine d'affûtage : **" + vo2Taper.length + "** combinaisons en échec\n";
md += "- Brick vélo hors bornes format : **" + brickBad.length + "** combinaisons en échec\n";
md += "- Semaine max hors phase « peak » : **" + peakBad.length + "** combinaisons en échec\n";
md += "- Tri : semaine max sans brick : **" + brickMissing.length + "** combinaisons en échec\n";

md += "\n## Règles du manifeste (note.md)\n\n";
md += "- Saut >+10% de la courbe déclarée entre semaines de charge : **" + results.filter((r) => r.declJumps > 0).length + "** combinaisons en échec\n";
md += "- Saut >+25% de volume réel (métrique audit) : **" + results.filter((r) => r.auditJumpsHard > 0).length + "** en échec (sauts +15–25% tolérés comme bruit de métrique : " + results.filter((r) => r.auditJumpsSoft > 0).length + " combos concernés)\n";
md += "- Deux longues CAP consécutives : **" + results.filter((r) => r.consecutiveLongRuns > 0).length + "** en échec\n";
md += "- Sortie longue CAP >3h pour un débutant : **" + results.filter((r) => r.beginnerLongRunOver3h > 0).length + "** en échec\n";
md += "- Séance piscine <750m pour un non-débutant : **" + results.filter((r) => r.smallSwims > 0).length + "** en échec\n";
md += "- Séance sans objectif expliqué (Pourquoi/Bénéfice) : **" + results.filter((r) => r.unexplainedSessions > 0).length + "** en échec\n";
md += "- Répartition des intensités : part facile <70% : **" + results.filter((r) => r.easyShare < 0.7).length + "** en échec (médiane " + (results.map((r) => r.easyShare).sort((a, b) => a - b)[Math.floor(results.length / 2)] * 100).toFixed(0) + "% de temps facile)\n";
const gapsAll = results.map((r) => r.estimatorGapMed ?? 0).sort((a, b) => a - b);
md += "\nRecoupement d'estimateurs : écart médian |nos minutes − s.min du générateur| par plan, médiane globale " +
  quantile(gapsAll, 0.5).toFixed(1) + "min (R5.6a : la récup inter-blocs est désormais comptée des DEUX côtés — les deux estimateurs mesurent la même séance, l'écart attendu est nul).\n";

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
// R20.4 — les refus typés se COMPTENT et s'AFFICHENT : un format sorti du domaine (run/trail
// depuis R7) n'est pas une combinaison auditée, et ne doit surtout pas être auditée sur le
// générateur de repli. Même contrat que `U-REFUS:` au banc v7 et `ENTREE_INVALIDE` au golden.
if (refus.length) {
  const parGroupe = new Map<string, number>();
  for (const r of refus) parGroupe.set(r.split(" : ")[0], (parGroupe.get(r.split(" : ")[0]) || 0) + 1);
  console.log("   " + refus.length + " combinaison(s) REFUSÉE(S) par le contrat d'entrée (non auditées, comportement voulu) :");
  for (const [k, n] of parGroupe) console.log("     · " + k + " × " + n + " — " + refus.find((r) => r.startsWith(k))!.split(" : ")[1]);
}

// Mode garde-fou (CI) : toute violation dure ou erreur de génération fait échouer le run.
const failing = results.filter((r) => r.hardViolations.length > 0);
if (failing.length > 0 || errors > 0) {
  console.error("\n✗ AUDIT ROUGE : " + failing.length + " combinaison(s) en violation dure, " + errors + " erreur(s).");
  for (const r of failing.slice(0, 10))
    console.error("  - " + [r.sport, r.format, r.history, r.level, r.intent].join("/") + " : " + r.hardViolations.join(" ; "));
  process.exitCode = 1;
} else {
  console.log("✓ Audit vert : 0 violation dure sur " + results.length + " combinaisons.");
}
