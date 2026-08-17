#!/usr/bin/env node
/**
 * O-46 §2 — QUELLE DISTANCE DE SÉANCE LE PLAN CHERCHE-T-IL, AVANT QUE `CAP_SWIM` NE MORDE ?
 *
 *   node scripts/mesureO46.mjs
 *
 * « Si le plafond mord souvent, la distance recherchée est le meilleur candidat pour la nouvelle
 * valeur. » On ne modélise pas ce que le générateur voudrait : on RETIRE le plafond (règle 15 —
 * expérience contrôlée, un seul facteur varie) et on observe ce qu'il produit alors.
 *
 * ⚠ AXE DE LA TABLE : formats de TRIATHLON uniquement. Les formats de nage pure portent la même
 * clé dans `CAP_SWIM` mais relèvent d'une autre logique (plafond d'entraînement, ×2 à ×14 de leur
 * distance de course) — les mêler serait la faute que le §5 d'O-46 vient de faire écrire en règle.
 */
import "../src/app/bridge.ts";
import { CAP_SWIM } from "../src/engine/constraintMatrix.ts";
import { TRI_SWIM } from "../src/engine/predictor.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

const metresOf = (s) => (s.steps ?? []).reduce((t, st) => t + (st.distanceM ? (st.reps || 1) * st.distanceM : 0), 0);
const maxSwim = (p) => {
  let m = 0;
  for (const w of p.weeks ?? []) { if (w.phase?.id === "taper" || w.isRecup) continue;
    for (const d of w.days ?? []) for (const s of d.sessions ?? []) if (s.d === "sw") m = Math.max(m, metresOf(s)); }
  return m;
};

const profils = [...goldenProfiles()].filter((x) => x.sport === "tri");
const memo = { ...CAP_SWIM };
const res = {};
for (const { sport, a } of profils) {
  const f = a.format;
  let avant, apres;
  try { avant = maxSwim(globalThis.EBV2.buildPlan(sport, a)); } catch { continue; }
  CAP_SWIM[f] = 100000;                       // le plafond retiré, et RIEN d'autre
  try { apres = maxSwim(globalThis.EBV2.buildPlan(sport, a)); } catch { apres = null; }
  CAP_SWIM[f] = memo[f];
  if (apres == null) continue;
  (res[f] ||= []).push({ avant, apres });
}

const q = (xs, p) => { const t = [...xs].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(p * t.length))]; };
console.log(`O-46 §2 — LA DISTANCE QUE LE PLAN CHERCHE, PLAFOND RETIRÉ  (formats de TRIATHLON)\n`);
console.log(`  format   n │ course │ plafond │ séance max AVEC plafond │ … SANS plafond (recherchée) │ mord ?`);
for (const [f, xs] of Object.entries(res)) {
  const av = xs.map((x) => x.avant), ap = xs.map((x) => x.apres);
  const mord = xs.filter((x) => x.avant >= memo[f] - 25).length;
  console.log(`  ${f.padEnd(6)} ${String(xs.length).padStart(3)} │ ${String(TRI_SWIM[f].dist).padStart(6)} │ ${String(memo[f]).padStart(7)} │ méd ${String(q(av, 0.5)).padStart(5)}  max ${String(Math.max(...av)).padStart(5)} │ méd ${String(q(ap, 0.5)).padStart(5)}  max ${String(Math.max(...ap)).padStart(5)} │ ${mord}/${xs.length}`);
}
console.log(`\n  « mord » = séances posées à moins de 25 m du plafond (le pas de quantification).`);
console.log(`\n  RAPPORT à la distance de course, plafond retiré :`);
for (const [f, xs] of Object.entries(res)) {
  const ap = xs.map((x) => x.apres);
  console.log(`     tri/${f.padEnd(5)} médiane ×${(q(ap, 0.5) / TRI_SWIM[f].dist).toFixed(2)} · max ×${(Math.max(...ap) / TRI_SWIM[f].dist).toFixed(2)}`);
}
