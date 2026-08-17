#!/usr/bin/env node
/**
 * O-44 §0b — LE SCORE D'AUDIT TIENT-IL COMPTE DES ALERTES ?
 *
 *   node scripts/mesureScoreAlertes.mjs
 *
 * Le rapport présente un score en tête ; un lecteur le lira comme le résumé du lot. Si le score
 * ignore les alertes, il ne dit rien d'un lot dont le changement principal EST une alerte.
 *
 * ⚠ DEUX SOURCES, ET C'EST TOUT LE PIÈGE DE CETTE MESURE. `generateAudited()` rend le plan de
 * `generatePlan()`, qui ne porte PAS `_v2` — ce champ est posé par le PONT (`buildPlanV2`). Lire
 * `r.plan._v2.warnings` rend donc systématiquement `undefined`, et un repli silencieux sur `[]`
 * range tous les profils dans « 0 alerte ». C'est ainsi que j'ai publié 92,3 / 92,6 / 99,0 / 95,0
 * avec des effectifs 20/64/15/9 : des chiffres FAUX, produits par la faute d'instrument que je
 * venais de documenter un paragraphe plus haut. Les alertes et les décisions se lisent sur le plan
 * du PONT, le score sur l'objet AUDITÉ — deux appels, assumés.
 */
import "../src/app/bridge.ts";
import { generateAudited } from "../src/generator/repairLoop.ts";

const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"];
const I = ["competition", "finir", "plaisir"];
const base = { vol_max: "10", sessions_max: "6", dispo: "semaine", off_which: "", injury: "", age: "35",
  ftp_known: "oui", ftp: "250", pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:55", races: "non" };
// La MÊME dispersion que `runV2Audit` (§0a) — sinon on mesurerait un autre corpus que celui qui
// produit le score du rapport.
const DISP = [
  { longest_swim_known: "non" },
  { longest_swim_known: "oui", longest_swim_m: "100" },
  { longest_swim_known: "oui", longest_swim_m: "800" },
  { longest_swim_known: "oui", longest_swim_m: "2500" },
];

const parAlertes = {}, parBranche = {};
for (const format of ["S", "M", "70.3", "Full"]) {
  for (const h of H) for (const l of L) for (const i of I) {
    const a = { ...base, sport: "tri", format, history: h, level: l, intent: i,
      ...DISP[(H.indexOf(h) * I.length + I.indexOf(i)) % 4] };
    let r, p;
    try { r = generateAudited(a); p = globalThis.EBV2.buildPlan("tri", a); } catch { continue; }
    const n = (p._v2?.warnings ?? []).length;
    const dec = (p._v2?.decisions ?? []).find((x) => x.id === "B17-continuite");
    const br = !dec ? "gate satisfait"
      : /rabattu/i.test(String(dec.what)) ? "RABATTU"
      : /ATTENTE/i.test(String(dec.what)) ? "test (inconnue)" : "format gardé";
    (parAlertes[n] = parAlertes[n] || []).push(r.audit.score);
    (parBranche[br] = parBranche[br] || []).push(r.audit.score);
  }
}

const stat = (v) => {
  const m = v.reduce((t, x) => t + x, 0) / v.length;
  const sd = Math.sqrt(v.reduce((t, x) => t + (x - m) ** 2, 0) / v.length);
  return { m, sd, lo: Math.min(...v), hi: Math.max(...v), n: v.length };
};
const ligne = (k, v) => {
  const s = stat(v);
  return `  ${String(k).padEnd(16)} n=${String(s.n).padStart(3)}  moyenne ${s.m.toFixed(1).padStart(5)}  `
    + `[${String(s.lo).padStart(3)} … ${String(s.hi).padStart(3)}]  écart-type ${s.sd.toFixed(1).padStart(4)}`;
};

console.log("O-44 §0b — SCORE D'AUDIT ET ALERTES (corpus tri dispersé, 108 profils)\n");
console.log("PAR NOMBRE D'AVERTISSEMENTS");
for (const k of Object.keys(parAlertes).sort((a, b) => a - b)) console.log(ligne(k + " alerte(s)", parAlertes[k]));
console.log("\nPAR BRANCHE DU GATE B-17");
for (const k of Object.keys(parBranche)) console.log(ligne(k, parBranche[k]));

// Le verdict porte sur la MONOTONIE : si le score pénalisait les alertes, la moyenne baisserait
// quand leur nombre monte. Une relation ABSENTE est la réponse recherchée — pas une relation
// inverse, que j'avais cru voir sur des chiffres faux.
const cles = Object.keys(parAlertes).map(Number).sort((a, b) => a - b);
const moy = cles.map((k) => stat(parAlertes[k]).m);
const decroissante = moy.every((x, i) => i === 0 || x <= moy[i - 1] + 0.01);
const ecarts = cles.map((k) => stat(parAlertes[k]).sd);
console.log(`\n  → ${decroissante
  ? "LE SCORE BAISSE QUAND LES ALERTES MONTENT : il en tient compte, et la hausse a une autre cause."
  : "AUCUNE RELATION MONOTONE : le score n'est PAS une fonction du nombre d'alertes. Il ne dit donc\n    rien d'un lot dont le changement principal est une alerte — et son libellé doit le porter."}`);
console.log(`  écarts-types ${ecarts.map((x) => x.toFixed(1)).join(" / ")} : les moyennes se recouvrent largement,`);
console.log(`  aucune ne doit être citée seule comme un effet.`);
