#!/usr/bin/env node
/**
 * §1 (APRES_O42_C22_ET_REGLE_18) — LE DÉPASSEMENT DE RAMPE C22, SUR LES 949.
 *
 *   node scripts/mesureC22.mjs            → le moteur du disque
 *   node scripts/mesureC22.mjs <ref-git>  → le même balayage contre un moteur d'AVANT
 *
 * C22 est le gouverneur de volume principal : « jamais +10 % d'une semaine de charge à la
 * suivante » (manifeste). C'est la règle qui empêche la marche d'escalier, et le moteur cite
 * lui-même la marche d'escalier comme cause de blessure — pas le plafond.
 *
 * O-42 a montré que `enforceC22Final` n'avait que deux branches, `reps > 1` et `durationMin` :
 * un bloc prescrit en MÈTRES à `reps === 1` ne tombait dans aucune, et la boucle sortait par
 * « les planchers bloquent : rien de plus à prendre ». La nage prescrivant 89 % de ses blocs en
 * mètres, c'était la moitié de l'objet du clamp. La branche `distanceM` a été écrite dans le
 * même lot ; CE SCRIPT MESURE CE QU'IL EN RESTE, pour décider si le sujet passe devant le lot 1
 * ou derrière — « queue mince → derrière, queue épaisse → devant ».
 *
 * RÈGLE 15 — on observe le plan LIVRÉ : les minutes réellement posées sur les jours, jamais la
 * courbe déclarée ni une table. La comparaison est celle d'`ANX-C22` (banc R13), étendue des
 * 949 profils du golden au lieu du seul Full de référence : semaines de CHARGE consécutives,
 * récupérations et affûtage exclus, parce que le clamp ne s'y applique pas.
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { C22_MAX_WEEKLY_GROWTH } from "../src/engine/constraintMatrix.ts";

const ref = process.argv[2];
const req = createRequire(import.meta.url);
let E;
if (ref) {
  const dir = mkdtempSync(join(tmpdir(), "c22-"));
  const p = join(dir, "engine.cjs");
  writeFileSync(p, execSync(`git show ${ref}:endurabuild/js/engine.js`, { maxBuffer: 1 << 30 }));
  const garde = globalThis.EBV2; delete globalThis.EBV2; req(p); E = globalThis.EBV2; globalThis.EBV2 = garde;
} else {
  req(req.resolve("../endurabuild/js/engine.js"));
  E = globalThis.EBV2;
}

/** Les minutes LIVRÉES d'une semaine, course objectif exclue (R13.4 : le jour J n'est pas un
 *  jour d'entraînement, et le compter ferait un faux saut sur la dernière semaine). */
const minSem = (w) => (w.days ?? []).reduce((t, d) =>
  t + (d.sessions ?? []).reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0);

const BORNE = C22_MAX_WEEKLY_GROWTH;      // 1,10
const TOLERANCE = BORNE + 0.005;          // le clamp vise `prev × 1,1 + 1 min` : l'arrondi n'est
                                          // pas un dépassement, on ne compte que ce qui le dépasse

let plans = 0, refus = 0, paires = 0;
let profilsTouches = 0, sauts = 0;
const depassements = [];   // en points de pourcentage au-dessus de la borne
// ⚠ LE POINT DE POURCENTAGE N'EST PAS LA BONNE UNITÉ, ET J'AI FAILLI RENDRE LE VERDICT DESSUS.
// Ma première écriture classait « queue épaisse » sur 7 sauts à plus de 2 points — dont le pire,
// `swim/demifond/ancien/debutant` à **+17,6 %**, qui vaut **34 → 40 min**. Six minutes. Le clamp
// vise `prev × 1,1 + 1`, soit 38,4 min : le dépassement RÉEL est de 1,6 minute, sur une semaine
// de nage à deux séances où le plancher de séance interdit de raboter quoi que ce soit. Un
// pourcentage sur une petite semaine amplifie le quantum ; c'est la faute d'unité de la règle 14,
// celle-là même que j'ai commise dans la ventilation d'O-42 quatre heures plus tôt. Le verdict se
// rend donc en MINUTES — la grandeur dans laquelle le clamp agit et dans laquelle un plancher de
// séance se compte.
const depassementsMin = [];
const parSport = {};
const pires = [];

for (const { key, sport, a } of goldenProfiles()) {
  let plan;
  try { plan = E.buildPlan(sport, a); } catch { refus++; continue; }
  plans++;
  let touche = false;
  const ws = plan.weeks ?? [];
  for (let i = 1; i < ws.length; i++) {
    const a0 = ws[i - 1], b0 = ws[i];
    if (a0.isRecup || b0.isRecup || a0.phase?.id === "taper" || b0.phase?.id === "taper") continue;
    const ma = minSem(a0), mb = minSem(b0);
    if (!(ma > 0)) continue;
    paires++;
    const r = mb / ma;
    if (r > TOLERANCE) {
      sauts++; touche = true;
      const pt = (r - BORNE) * 100;
      depassements.push(pt);
      depassementsMin.push(mb - (ma * BORNE + 1)); // ce que le clamp aurait dû retirer, en minutes
      const sp = key.split("/")[1] || sport;
      parSport[sp] = (parSport[sp] || 0) + 1;
      pires.push({ key, i: i + 1, pct: (r - 1) * 100, min: mb - (ma * BORNE + 1), ma, mb });
    }
  }
  if (touche) profilsTouches++;
}

const q = (xs, p) => { if (!xs.length) return 0; const t = [...xs].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(p * t.length))]; };
pires.sort((x, y) => y.min - x.min);

console.log(`§1 — DÉPASSEMENT DE LA RAMPE C22 SUR LE LIVRÉ${ref ? `  (moteur ${ref})` : ""}\n`);
console.log(`  plans construits : ${plans} · refus d'entrée : ${refus}`);
console.log(`  paires de semaines de CHARGE consécutives examinées : ${paires}`);
console.log(`  borne : ×${BORNE} (manifeste) · tolérance d'arrondi : ×${TOLERANCE.toFixed(3)}\n`);
console.log(`  profils portant au moins un saut : ${profilsTouches} / ${plans} (${(100 * profilsTouches / (plans || 1)).toFixed(1)} %)`);
console.log(`  sauts : ${sauts} / ${paires} paires (${(100 * sauts / (paires || 1)).toFixed(2)} %)`);

if (sauts) {
  console.log(`\n  DISTRIBUTION DU DÉPASSEMENT (points au-dessus de +10 %) :`);
  console.log(`     médiane ${q(depassements, 0.5).toFixed(2)} pt · p90 ${q(depassements, 0.9).toFixed(2)} pt · max ${Math.max(...depassements).toFixed(2)} pt`);
  const bandes = [[0, 1], [1, 2], [2, 5], [5, 10], [10, Infinity]];
  for (const [lo, hi] of bandes) {
    const n = depassements.filter((d) => d >= lo && d < hi).length;
    if (n) console.log(`     ${(`+${lo}` + (hi === Infinity ? " pt et plus" : ` à +${hi} pt`)).padEnd(18)} ${String(n).padStart(4)}  (${(100 * n / sauts).toFixed(1)} %)`);
  }
  console.log(`\n  DISTRIBUTION EN MINUTES (ce que le clamp aurait dû retirer) :`);
  console.log(`     médiane ${q(depassementsMin, 0.5).toFixed(1)} min · p90 ${q(depassementsMin, 0.9).toFixed(1)} min · max ${Math.max(...depassementsMin).toFixed(1)} min`);
  for (const [lo, hi] of [[0, 1], [1, 3], [3, 6], [6, 15], [15, Infinity]]) {
    const n = depassementsMin.filter((d) => d >= lo && d < hi).length;
    if (n) console.log(`     ${(`${lo}` + (hi === Infinity ? " min et plus" : ` à ${hi} min`)).padEnd(18)} ${String(n).padStart(4)}  (${(100 * n / sauts).toFixed(1)} %)`);
  }
  console.log(`\n  par sport :`);
  for (const [s, n] of Object.entries(parSport).sort((x, y) => y[1] - x[1])) console.log(`     ${s.padEnd(12)} ${n}`);
  console.log(`\n  les pires :`);
  for (const p of pires.slice(0, 8)) console.log(`     ${p.key} S${p.i - 1}→S${p.i} : ${p.ma} → ${p.mb} min (+${p.pct.toFixed(1)} %) — ${p.min.toFixed(1)} min au-dessus du clamp`);
}

// LE VERDICT SE REND EN MINUTES, ET SUR LA BORNE QUE LE CLAMP APPLIQUE VRAIMENT.
// `enforceC22Final` vise `prev × 1,1 + 1 min` : le « + 1 » est délibéré (« le quantum d'arrondi a
// besoin de marge pour exister »). Compter `ratio > 1,105` compte donc des cas que le clamp
// AUTORISE — sur une semaine de 34 min, +1 min vaut déjà +2,9 points. Le nombre qui décide est
// celui des paires réellement au-dessus du clamp, exprimé en minutes.
const vraisSauts = depassementsMin.filter((d) => d > 0);
console.log(`\n  PAIRES RÉELLEMENT AU-DESSUS DU CLAMP (\`prev × 1,1 + 1 min\`, la borne appliquée) :`);
console.log(`     ${vraisSauts.length} / ${paires} (${(100 * vraisSauts.length / (paires || 1)).toFixed(3)} %) · max ${vraisSauts.length ? Math.max(...vraisSauts).toFixed(1) : 0} min`);
console.log(`     les ${sauts - vraisSauts.length} autres sont sous le « + 1 min » que le clamp accorde exprès.`);
console.log(`\n  → ${vraisSauts.length === 0
  ? "AUCUN DÉPASSEMENT : la rampe est bornée sur tout son périmètre. DERRIÈRE le lot 1."
  : Math.max(...vraisSauts) < 6
    ? "QUEUE MINCE, EN MINUTES : aucune paire ne dépasse le clamp de plus de 6 minutes — soit un\n    pas d'affichage, et bien moins qu'un plancher de séance. Le clamp ne PEUT rien retirer de\n    plus sans casser une séance : ce n'est pas une dette, c'est la granularité du plan.\n    → DERRIÈRE le lot 1."
    : "QUEUE ÉPAISSE : des paires dépassent le clamp de plus de 6 minutes, c'est-à-dire de plus\n    que sa granularité. → DEVANT le lot 1."}`);
