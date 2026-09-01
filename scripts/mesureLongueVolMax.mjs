/**
 * O-77 — LA SORTIE LONGUE RÉTRÉCIT QUAND LE VOLUME DEMANDÉ AUGMENTE.
 *
 * Un seul facteur varie (`vol_max`), tout le reste est tenu fixe : c'est la seule façon de lire
 * une causalité (corollaire de la règle 15). La grandeur observée est la durée LIVRÉE de la
 * sortie longue, jamais une borne déclarée — une borne dirait ce que le moteur autorise, pas ce
 * qu'il prescrit.
 *
 *   npm run mesure:longue-volmax
 */
import "../src/app/bridge.ts";
import { createRequire } from "node:module";
const { courseDans } = createRequire(import.meta.url)("../bench-dates.cjs");

const BASE = {
  intent: "competition", level: "inter", history: "ancien", dispo: "quotidienne", shift_ok: "non",
  doubles: "oui", off_days: "non", sex: "H", sleep: "moyen", life_load: "normale",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non",
  age: "30", weight: "85", height: "181", sessions_max: "8",
  race_date: courseDans(43), format: "70.3", terrain: "vallonne",
  ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:41", css_known: "oui", css: "2:15",
};

console.log("O-77 — sortie longue livrée, `vol_max` seul facteur variable (70.3, 43 semaines, vol_recent 9)\n");
const medianes = [];
for (const vm of ["9", "11", "13"]) {
  const plan = globalThis.EBV2.buildPlan("tri", { ...BASE, vol_max: vm, vol_recent: "9" });
  const l = [];
  for (const w of plan.weeks) for (const d of w.days) for (const s of d.sessions)
    if (s.name === "Sortie longue CAP") l.push(Math.round(s.min || 0));
  if (!l.length) { console.log("  vol_max " + vm + " : aucune « Sortie longue CAP » — la sonde ne mesure rien"); continue; }
  const tri = l.slice().sort((a, b) => a - b);
  const med = tri[Math.floor(tri.length / 2)];
  medianes.push(med);
  console.log("  vol_max " + vm.padStart(2) + "   longue CAP " + String(l.length).padStart(2) + "× · "
    + Math.min(...l) + "-" + Math.max(...l) + " min (médiane " + med + ")");
}
// UN ZÉRO A BESOIN DE SA POPULATION : le verdict ne vaut que si les trois enveloppes ont produit
// une mesure. Trois plans sans sortie longue rendraient « pas d'inversion », c'est-à-dire vert.
if (medianes.length < 3) { console.error("\n✖ population insuffisante — le verdict n'a pas de base"); process.exit(1); }
// RÈGLE 21 (fiche 44 T10, 01/09/2026) — LA MÉDIANE ÉTAIT UN FAUX VERT : une propriété qui varie
// avec la POSITION se mesure PAR POSITION d'abord. Mesuré le jour où la médiane est passée
// verte (82 → 93 → 93) : par semaine, S1-S7 tombent de 82 à 51 min (−31) pendant que la fin de
// plan monte — l'agrégat additionnait les deux et concluait « pas d'inversion ». La cause est
// nommée au ticket : `sessionScale` (reasoningEngine) est une constante de PLAN dérivée de
// l'enveloppe déclarée — une valeur de fin de rampe appliquée à la semaine 1 (règle 20) ; les
// blocs de qualité naissent gros, la rampe `vol_recent` épingle le total, la longue élastique
// absorbe. Le compte de séances, lui, ne bouge pas (8 = 8 : la piste « fréquence » du ticket
// est RÉFUTÉE).
const parSemaine = (vm) => {
  const plan = globalThis.EBV2.buildPlan("tri", { ...BASE, vol_max: vm, vol_recent: "9" });
  const out = {};
  for (const w of plan.weeks) for (const d of w.days) for (const s of d.sessions)
    if (s.name === "Sortie longue CAP") out[w.num] = Math.round(s.min || 0);
  return out;
};
const bas = parSemaine("9"), haut = parSemaine("13");
let baisse = 0, comparables = 0; const ex = [];
for (const k of Object.keys(bas)) {
  if (haut[k] == null) continue;
  comparables++;
  if (haut[k] < bas[k] - 5) { baisse++; if (ex.length < 3) ex.push("S" + k + " : " + bas[k] + " → " + haut[k]); }
}
if (!comparables) { console.error("\n✖ aucune semaine comparable — le verdict n'a pas de base"); process.exit(1); }
const inverse = medianes[medianes.length - 1] < medianes[0] || baisse > 0;
console.log("\n" + (inverse
  ? "✖ INVERSION : déclarer plus de volume RACCOURCIT la sortie longue sur " + baisse + " semaine(s) sur "
    + comparables + " (" + ex.join(" · ") + ") — médianes " + medianes.join(" → ") + " min"
  : "✓ pas d'inversion sur l'axe vol_max (médianes " + medianes.join(" → ") + " min · 0 semaine en baisse sur " + comparables + ")"));
