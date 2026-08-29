#!/usr/bin/env node
/**
 * `golden(src) === golden(bundle)` — LA SEULE ASSERTION QUI COUVRE L'ÉTAPE ENTRE CE QU'ON
 * MESURE ET CE QU'ON LIVRE.
 *
 *   npm run golden:bundle              une passe : les deux moteurs, le même corpus
 *   npm run golden:bundle -- --contrepreuve   perturbe le bundle et vérifie qu'on le voit
 *
 * ── POURQUOI CETTE MESURE EXISTE ───────────────────────────────────────────────────────────
 *
 * L'acceptation du merge est `golden:verify` contre la photo — et il lit `src/` (il importe
 * `src/app/bridge.ts`). Or ce qui est DÉPLOYÉ est le bundle (`endurabuild/js/engine.js`,
 * `Coach_Pro_V1.5.html`). La preuve principale du merge ne portait donc pas sur l'artefact livré.
 *
 * `audit:v1` et les suites E2E lisent bien le bundle — c'est ce qui a attrapé les 57
 * `ReferenceError` du 17/08 — mais ils vérifient sa VALIDITÉ, pas son IDENTITÉ DE SORTIE avec la
 * source. Deux questions différentes, et seule la seconde est ce que la photo garantit.
 *
 * Et l'étape n'est pas neutre : `scripts/buildApp.mjs` RETIRE les imports et concatène les
 * modules, donc un alias (`record as traceRecord`) ne survit pas à la construction. Ce qui n'a
 * pas survécu une fois peut ne pas survivre deux, et rien ne le dirait.
 *
 * ── LE PIÈGE QUI REND CE TEST VACUEUX, ET COMMENT IL EST FERMÉ ─────────────────────────────
 *
 * Si le bundle ne se charge PAS, `globalThis.EBV2` reste celui de `src/` et les deux passes
 * comparent la source à elle-même : **0 écart, verdict vert, mesure nulle.** C'est le taux saturé
 * de la règle 15, dans sa forme la plus traître — le résultat attendu est justement « 0 écart ».
 * Trois verrous :
 *   1. la RÉFÉRENCE de `globalThis.EBV2` doit CHANGER entre les deux passes ;
 *   2. le bundle doit se charger depuis le HTML livré, pas depuis un repli silencieux ;
 *   3. `--contrepreuve` perturbe une constante du bundle et EXIGE que la comparaison rougisse.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
// ⚠ CET IMPORT DÉFINIT `globalThis.EBV2` DEPUIS `src/` (via bridge.ts). L'ordre compte :
// la passe SOURCE doit tourner AVANT le chargement du bundle, qui écrase la référence.
import { snapshot } from "./goldenMaster.mjs";
import { loadV1 } from "../src/harness/v1Harness.ts";

const ROOT = resolve(import.meta.dirname, "..");
const HTML = join(ROOT, "Coach_Pro_V1.5.html");
const CONTREPREUVE = process.argv.includes("--contrepreuve");
const h = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

console.log("GOLDEN — la SOURCE contre le BUNDLE, même corpus, même canonisation\n");

// ── Passe 1 : la SOURCE ───────────────────────────────────────────────────────────────────
const refSrc = globalThis.EBV2;
if (!refSrc) { console.error("✖ EBV2 absent après l'import de bridge.ts"); process.exit(2); }
const POPULATION = 1016;  // un zéro a besoin de sa population — 1016 depuis la passe CYCLE10 (24/08/2026), voir goldenMaster.mjs
const t0 = Date.now();
const A = snapshot();
if (A.n !== POPULATION) {
  console.error(`✖ ${A.n} profils balayés côté source, ${POPULATION} attendus — le « 0 écart » ne prouverait rien.`);
  process.exit(2);
}
console.log(`  source  : ${A.n} profils · ${A.errors.length} erreur(s) · ${A.refus.length} refus typé(s)  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);

// ── Passe 2 : le BUNDLE ───────────────────────────────────────────────────────────────────
let cible = HTML;
if (CONTREPREUVE) {
  // On perturbe UNE constante du bundle livré. Le but n'est pas de casser proprement : c'est
  // de vérifier que la comparaison SAIT VOIR une divergence de sortie entre les deux moteurs.
  const src = readFileSync(HTML, "utf8");
  // `C22_MAX_WEEKLY_GROWTH` était le premier candidat : dans le bundle il vaut
  // `rule("C22", "…")`, pas un littéral — la contre-preuve sortait « motif introuvable »,
  // c'est-à-dire qu'elle refusait de tourner plutôt que de mentir. On perturbe donc une
  // constante qui EST un littéral dans le livré, et qui change une distance prescrite.
  const avant = (src.match(/B17_ECHAUF_M = 200\b/) || [])[0];
  if (!avant) { console.error("✖ contre-preuve : motif de perturbation introuvable dans le bundle"); process.exit(2); }
  cible = join(tmpdir(), "eb-golden-contrepreuve.html");
  mkdirSync(tmpdir(), { recursive: true });
  writeFileSync(cible, src.replace(avant, "B17_ECHAUF_M = 225"));
  console.log(`  ⚠ CONTRE-PREUVE : « ${avant} » → « B17_ECHAUF_M = 225 » dans une copie du bundle`);
}
loadV1(cible);
const refBundle = globalThis.EBV2;

// VERROU 1 + 2 — sans quoi on comparerait la source à elle-même.
if (refBundle === refSrc) {
  console.error("\n✖ VACUEUX : `globalThis.EBV2` n'a pas changé — le bundle ne s'est pas chargé.");
  console.error("   La comparaison aurait rendu « 0 écart » en comparant la source à elle-même.");
  process.exit(2);
}
const t1 = Date.now();
const B = snapshot();
console.log(`  bundle  : ${B.n} profils · ${B.errors.length} erreur(s) · ${B.refus.length} refus typé(s)  [${((Date.now() - t1) / 1000).toFixed(0)}s]`);
console.log(`  (référence EBV2 changée entre les deux passes : ✓)\n`);

// ── Comparaison ───────────────────────────────────────────────────────────────────────────
const cles = [...new Set([...Object.keys(A.snap), ...Object.keys(B.snap)])].sort();
const ecarts = [];
for (const k of cles) {
  const a = h(A.snap[k] ?? null), b = h(B.snap[k] ?? null);
  if (a !== b) ecarts.push(k);
}
if (B.errors.length && !A.errors.length) {
  console.log(`  ✖ le bundle produit ${B.errors.length} erreur(s) que la source ne produit pas :`);
  for (const e of B.errors.slice(0, 5)) console.log(`     ${e.slice(0, 140)}`);
  console.log("");
}
if (!ecarts.length) {
  console.log(`✓ golden(src) === golden(bundle) : ${cles.length} profils, 0 écart.`);
  console.log("  La construction n'est pas lossy — ce qui est mesuré est ce qui est livré.");
} else {
  console.log(`✖ ${ecarts.length} profil(s) sur ${cles.length} DIVERGENT entre la source et le bundle :`);
  for (const k of ecarts.slice(0, 12)) console.log(`     ${k}`);
  if (ecarts.length > 12) console.log(`     … et ${ecarts.length - 12} autre(s)`);
  console.log("\n  La construction est LOSSY : le golden valide `src/`, et ce n'est pas `src/` qui est déployé.");
}
if (CONTREPREUVE) {
  const ok = ecarts.length > 0;
  console.log(`\n${ok ? "✓" : "✖"} CONTRE-PREUVE : la comparaison ${ok ? "VOIT" : "NE VOIT PAS"} une divergence introduite exprès.`);
  process.exit(ok ? 0 : 1);
}
process.exit(ecarts.length ? 1 : 0);
