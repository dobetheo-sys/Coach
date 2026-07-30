/**
 * buildApp — bundle le moteur V2 dans Coach_Pro_V1.5.html, zéro dépendance.
 *
 * 1. Concatène les modules src/ dans l'ordre des dépendances
 * 2. Retire types (node:module.stripTypeScriptTypes), imports et mots-clés export
 * 3. Enveloppe dans une IIFE (aucune collision avec le script legacy) → globalThis.EBV2
 * 4. AUTO-TEST : évalue le bundle et génère un plan avant toute écriture
 * 5. Injecte entre les marqueurs __EBV2_BUNDLE__ APRÈS le script principal
 *    (le harnais d'audit extrait le PREMIER <script> : il doit rester le legacy)
 *
 * `node scripts/buildApp.mjs`          → construit et écrit
 * `node scripts/buildApp.mjs --check`  → vérifie que le HTML committé est à jour (CI)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = [
  "src/engine/types.ts",
  // R10 phase 1 — le REGISTRE avant tout : `registerSport()` doit exister quand les modules
  // de sport s'enregistrent, et le registre doit être peuplé avant la première génération.
  "src/sports/registry.ts",
  "src/engine/constraintMatrix.ts",
  "src/engine/disciplineRegistry.ts",
  "src/engine/trailModel.ts",
  "src/engine/reasoningEngine.ts",
  "src/generator/renderer.ts",
  "src/engine/loadModel.ts",
  "src/audit/coherenceScorer.ts",
  "src/generator/sessionLibrary.ts",
  "src/generator/trailLibrary.ts",
  // Modules de sport : ils s'enregistrent à l'import (effet de bord), après trailLibrary
  // dont le module trail se sert, et avant les passes qui interrogent le registre.
  "src/sports/run/index.ts",
  "src/sports/bike/index.ts",
  "src/sports/swim/index.ts",
  "src/sports/tri/index.ts",
  "src/sports/trail/index.ts",
  "src/generator/weekBuilder.ts",
  "src/generator/planGenerator.ts",
  "src/generator/repairLoop.ts",
  "src/engine/predictor.ts",
  "src/readiness/readinessSource.ts",
  "src/readiness/fitParser.ts",
  "src/readiness/dailyAdjuster.ts",
  "src/nutrition/nutritionCalculator.ts",
  "src/nutrition/energyEstimator.ts",
  "src/app/bridge.ts",
];

function moduleToScript(path) {
  let src = readFileSync(join(root, path), "utf8");
  // ré-exports de types purs → supprimés avant strip (le strip ne gère pas `export type {} from`)
  src = src.replace(/^export type \{[^}]*\}\s*from\s*"[^"]*";\s*$/gm, "");
  src = stripTypeScriptTypes(src, { mode: "strip" });
  // imports (mono et multi-lignes) → supprimés : tout vit dans la même IIFE
  src = src.replace(/^import[\s\S]*?from\s*"[^"]*";\s*$/gm, "");
  src = src.replace(/^import\s*"[^"]*";\s*$/gm, "");
  // mots-clés export → déclarations simples
  src = src.replace(/^export (function|const|let|class|async function)/gm, "$1");
  src = src.replace(/^export \{[^}]*\};\s*$/gm, "");
  return "// ===== " + path + " =====\n" + src;
}

const bundle =
  "/* __EBV2_BUNDLE__ généré par scripts/buildApp.mjs — NE PAS ÉDITER À LA MAIN.\n" +
  "   Source de vérité : src/ (moteur V2). Reconstruire : npm run build:app */\n" +
  "(function(){\n\"use strict\";\n" +
  ORDER.map(moduleToScript).join("\n") +
  "\n})();\n";

// ---- AUTO-TEST avant écriture : le bundle doit s'évaluer et générer un plan sain ----
(0, eval)(bundle);
const EBV2 = globalThis.EBV2;
if (!EBV2 || typeof EBV2.buildPlan !== "function") throw new Error("bundle invalide : EBV2.buildPlan absent");
const answers = { format: "marathon", history: "confirme", level: "inter", intent: "competition",
  vol_max: "10", sessions_max: "6", dispo: "semaine", ftp_known: "oui", ftp: "250",
  pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:55", races: "non" };
const plan = EBV2.buildPlan("run", answers);
if (!plan.weeks || plan.weeks.length !== 16 || !plan.phases || !plan._v2) throw new Error("bundle invalide : plan incomplet");
if (plan._v2.hardViolations.length > 0) throw new Error("bundle invalide : violations dures " + plan._v2.hardViolations.join("; "));
const today = plan.weeks[0].days.map((d) => d.date).find(Boolean);
const adj = EBV2.adjustToday("run", answers, { date: today, sleepQuality: "mauvais", hrvStatus: "basse" });
if (!adj.adjustment || !adj.adjustment.verdict) throw new Error("bundle invalide : adjustToday cassé");
const pg = EBV2.progress(plan, answers, today);
if (typeof pg.pctLoad !== "number" || pg.totalWeeks !== 16 || pg.streakWeeks !== 0 || pg.totalMin <= 0)
  throw new Error("bundle invalide : progress cassé");
const pred = EBV2.predict("run", answers, plan);
if (!pred.items.length || !/–/.test(pred.items[0].value)) throw new Error("bundle invalide : predict cassé");
const nut = EBV2.sessionNutrition({ d: "rn", name: "Sortie longue", det: "", min: 160, long: true }, { tempC: 30, weightKg: 70 });
if (!nut || !nut.during.sodium || !/professionnel/.test(nut.disclaimer)) throw new Error("bundle invalide : sessionNutrition cassé");
const av = EBV2.avatar(plan, answers, today);
if (!av || !av.icon || av.level < 1 || av.progressPct < 0 || av.progressPct > 100) throw new Error("bundle invalide : avatar cassé");
console.log("auto-test bundle : plan 16 semaines, score " + plan._v2.score + ", adaptation « " + adj.adjustment.verdict.level + " » OK");

// ---- Injection entre marqueurs, après le </script> principal ----
const htmlPath = join(root, "Coach_Pro_V1.5.html");
const html = readFileSync(htmlPath, "utf8");
const START = "<script>/*__EBV2_START__*/";
const END = "/*__EBV2_END__*/</script>";
const block = START + "\n" + bundle + END;
let out;
if (html.includes(START)) {
  const s = html.indexOf(START), e = html.indexOf(END) + END.length;
  out = html.slice(0, s) + block + html.slice(e);
} else {
  const anchor = html.lastIndexOf("</script>");
  if (anchor < 0) throw new Error("</script> introuvable");
  const cut = anchor + "</script>".length;
  out = html.slice(0, cut) + "\n" + block + html.slice(cut);
}

// La PWA charge le MÊME bundle auto-testé en fichier séparé (extraction fidèle par
// construction : c'est la même génération depuis src/ que le HTML monolithique).
const pwaEnginePath = join(root, "endurabuild", "js", "engine.js");

if (process.argv.includes("--check")) {
  if (out !== html) {
    console.error("✗ Coach_Pro_V1.5.html n'est pas à jour avec src/ — lancer : npm run build:app");
    process.exit(1);
  }
  if (existsSync(pwaEnginePath) && readFileSync(pwaEnginePath, "utf8") !== bundle) {
    console.error("✗ endurabuild/js/engine.js n'est pas à jour avec src/ — lancer : npm run build:app");
    process.exit(1);
  }
  console.log("✓ bundle à jour dans Coach_Pro_V1.5.html" + (existsSync(pwaEnginePath) ? " et endurabuild/js/engine.js" : ""));
} else {
  writeFileSync(htmlPath, out);
  if (existsSync(join(root, "endurabuild", "js"))) writeFileSync(pwaEnginePath, bundle);
  console.log("✓ bundle injecté dans Coach_Pro_V1.5.html (" + Math.round(bundle.length / 1024) + " Ko)" + (existsSync(pwaEnginePath) ? " + endurabuild/js/engine.js" : ""));
}
