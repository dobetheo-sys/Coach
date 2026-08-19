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
  "src/engine/trace.ts",
  "src/engine/medicalHold.ts",
  "src/engine/prioriteFinancement.ts",
  // T-16d — le volume de course d'un plan, défini une seule fois (le pont et la boucle de
  // réparation le lisent tous les deux). Aucune dépendance : peut venir tôt.
  "src/engine/planVolume.ts",
  "src/engine/measured.ts",
  // R22 — la règle de troncature, lue par le schéma (pour proposer la sortie) et par
  // le pont (pour l'appliquer). Doit précéder answerSchema, qui l'importe.
  "src/engine/truncatedPrep.ts",
  "src/engine/answerSchema.ts",
  "src/engine/cycleModel.ts",
  // R10 phase 1 — le REGISTRE avant tout : `registerSport()` doit exister quand les modules
  // de sport s'enregistrent, et le registre doit être peuplé avant la première génération.
  "src/sports/registry.ts",
  "src/engine/constraintMatrix.ts",
  "src/engine/disciplineRegistry.ts",
  "src/engine/trailModel.ts",
  "src/engine/reasoningEngine.ts",
  "src/engine/stepScale.ts",
  "src/generator/renderer.ts",
  // C30 — le plancher spécifique de la sortie longue. Après `renderer` (il lit `ZDEF["rn.easy"]`,
  // la seule définition de l'allure d'endurance) et avant les modules de sport qui l'appellent.
  // Ses lectures de `predictor` (RUN_KM, Riegel) se font à l'APPEL, donc son rang devant lui
  // n'a pas d'importance — c'est ce que le §ORDER assume déjà pour `RUN_KM` dans `sports/run`.
  "src/engine/longRunSpecificity.ts",
  // PW — le point unique « puissance → vitesse » (modèle Martin 1998). Aucune dépendance sur
  // les autres modules du bundle : il ne fait que de la physique. Il doit précéder `predictor`
  // et les modules de sport, qui l'appellent tous les trois (tri, vélo, duathlon).
  "src/engine/cyclingSpeed.ts",
  "src/engine/weekDistances.ts", // R24.8 — distances de la semaine par discipline
  // Bibliothèque d'éducatifs (🧰 Outils) — avant sessionLibrary.ts, qui en dérive le texte
  // injecté dans les notes de « Nage éducatifs » (une seule écriture, R11.1).
  "src/engine/eduLibrary.ts",
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
  "src/sports/duathlon/tables.ts",
  "src/sports/duathlon/index.ts",
  // R16.10 — SWIMRUN RÉINTÉGRÉ (01/08/2026). R12 §0 l'avait sorti du bundle — pas masqué dans
  // l'UI, sorti : du code expédié mais non exercé est exactement ce que ce projet refuse. La
  // condition de retour était de traiter sa dette d'abord, pas de retirer le drapeau : ses
  // quatre checks budgétés au banc v7 valaient 53 à 80 ‰ pour 78 % de profils propres. Ils
  // sont à 12 ‰ pour 89 % — au niveau du duathlon — après S13 (la structure hebdomadaire lit
  // enfin l'objectif) et l'exemption des règles de sécurité côté banc. Le sport entre donc
  // avec un filet à sa taille, pas avec un filet troué.
  "src/sports/swimrun/tables.ts",
  "src/sports/swimrun/objective.ts",
  "src/sports/swimrun/index.ts",
  "src/generator/weekBuilder.ts",
  "src/generator/planGenerator.ts",
  // T-27 — le sceau. Après `renderer` (il lit `ZDEF`) et avant `repairLoop`, qui l'appelle au
  // point de sortie unique de `generateAudited`.
  "src/generator/seal.ts",
  "src/generator/repairLoop.ts",
  "src/engine/projection.ts",
  "src/engine/predictor.ts",
  // B-17 — le prérequis de nage continue. Après `predictor` (il lit `TRI_SWIM`) et après
  // `sports/swimrun/tables` (il réutilise le seuil de 30 min de `S10_PREREQ`, zéro constante
  // nouvelle). Ses lecteurs — `reasoningEngine` et `sports/tri` — l'appellent à l'EXÉCUTION,
  // donc leur rang devant lui n'a pas d'importance : c'est ce que l'ORDER assume déjà pour
  // `swimrunPrereqBlock`, lu par `reasoningEngine` alors que swimrun vient bien après.
  "src/engine/swimContinuity.ts",
  // RV — le diagnostic de faisabilité (chrono visé). Après `predictor` : il en importe
  // `riegelExponent`, et après `projection` dont il lit les constantes de régime (P11).
  "src/engine/feasibility.ts",
  "src/readiness/readinessSource.ts",
  "src/readiness/fitParser.ts",
  "src/readiness/dailyAdjuster.ts",
  // R21 — le coach proactif. L'ordre suit les dépendances : le détecteur lit le rendu
  // des zones et la charge de l'ajusteur, le déclencheur lit le détecteur et le puits
  // de notification. Les parseurs GPX/TCX n'ont que des imports de TYPE, donc effacés.
  "src/readiness/importLimits.ts",
  "src/readiness/hrvBaseline.ts",
  "src/readiness/gpxTcxParser.ts",
  "src/coach/deviationDetector.ts",
  "src/coach/notificationSink.ts",
  "src/coach/proactiveCoach.ts",
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

/**
 * D10-9 — GARDE-FOU DE COLLISION. Le bundle concatène tous les modules dans UNE SEULE portée :
 * deux déclarations racines du même nom, et la seconde écrase la première SANS UN MOT. Rencontré
 * pendant R10 phase 1 (un `buildSessions` local dans le module trail a remplacé le dispatch de
 * sessionLibrary — le plan trail sortait faux). L'auto-test l'a attrapé par chance ; on ne
 * dépend plus de la chance. Chaque sport ajouté multiplie les noms racines : ce contrôle doit
 * vivre AVANT l'évaluation, pour nommer le coupable au lieu d'une pile d'exécution obscure.
 */
function checkCollisions(scripts) {
  const seen = new Map(); // nom → fichier
  const dup = [];
  const DECL = /^(?:function|const|let|class|async function)\s+([A-Za-z_$][\w$]*)/;
  scripts.forEach((src, i) => {
    for (const line of src.split("\n")) {
      const m = DECL.exec(line);
      if (!m) continue;
      const name = m[1];
      if (seen.has(name)) dup.push(name + " : " + seen.get(name) + " puis " + ORDER[i]);
      else seen.set(name, ORDER[i]);
    }
  });
  if (dup.length) {
    console.error("✖ collision(s) de noms dans le bundle — la seconde déclaration ÉCRASE la première :");
    for (const d of dup) console.error("   " + d);
    console.error("\nCorriger en renommant : le bundle n'a qu'une portée, un nom racine est GLOBAL.");
    process.exit(1);
  }
}

const _scripts = ORDER.map(moduleToScript);
checkCollisions(_scripts);

const bundle =
  "/* __EBV2_BUNDLE__ généré par scripts/buildApp.mjs — NE PAS ÉDITER À LA MAIN.\n" +
  "   Source de vérité : src/ (moteur V2). Reconstruire : npm run build:app */\n" +
  "(function(){\n\"use strict\";\n" +
  _scripts.join("\n") +
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
// R13.1 — LA RÈGLE « UNE SEULE SOURCE DE BORNES » EST EXÉCUTABLE, PAS UN COMMENTAIRE.
// Les deux tables (ANSWER_SCHEMA et PHYSIO_BOUNDS) sont importées depuis src/ et comparées
// clé à clé : si quelqu'un ré-introduit un littéral divergent dans PHYSIO_BOUNDS, le build
// échoue en nommant la clé. C'est ce trou (âge 10-13 et 96-100 entre les deux domaines) qui
// donnait le plan adulte complet à un enfant de 10 ans.
{
  const { ANSWER_SCHEMA } = await import("../src/engine/answerSchema.ts");
  const { PHYSIO_BOUNDS } = await import("../src/engine/constraintMatrix.ts");
  const MAP = { ftp: "ftp", hrMax: "hr_max", weight: "weight", height: "height", age: "age" };
  for (const [pk, sk] of Object.entries(MAP)) {
    const p = PHYSIO_BOUNDS[pk], s = ANSWER_SCHEMA[sk];
    if (!p || !s || p.min !== s.min || p.max !== s.max)
      throw new Error("R13.1 : PHYSIO_BOUNDS." + pk + " (" + (p && p.min) + "–" + (p && p.max) +
        ") diverge d'ANSWER_SCHEMA." + sk + " (" + (s && s.min) + "–" + (s && s.max) +
        ") — la borne doit vivre dans le schéma, une seule fois.");
  }
}
// R14.3-a — MÊME GESTE, SUR LE PROFIL DE PARCOURS. Le domaine `terrain` du schéma et la
// table de relief du prédicteur avaient divergé en silence : « montagne » n'était classé
// nulle part, donc aucune correction de relief au jour J. Toute valeur du domaine doit
// désormais être classée (relief ou surface), sinon le build échoue en la nommant.
{
  const { ANSWER_SCHEMA } = await import("../src/engine/answerSchema.ts");
  const { assertTerrainCovered } = await import("../src/engine/predictor.ts");
  assertTerrainCovered(ANSWER_SCHEMA.terrain.domain);
}
console.log("auto-test bundle : plan 16 semaines, score " + plan._v2.score + ", adaptation « " + adj.adjustment.verdict.level + " » OK · bornes physio = schéma (R13.1) · terrain classé (R14.3-a)");

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
