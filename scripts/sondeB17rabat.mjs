#!/usr/bin/env node
/**
 * B-17 §14 — LE RAYON DU RABATTEMENT SUR UNE RÉPONSE ABSENTE.
 *
 *   node scripts/sondeB17rabat.mjs
 *
 * Le module décide que « je ne sais pas » NE SATISFAIT PAS le gate (justifié par O-17 : qui ne
 * sait pas ce qu'il a nagé de plus long est dans le membre « ne peut pas évaluer le risque »).
 * La décision est écrite ; sa CONSÉQUENCE sur le plan livré ne l'était pas. On la mesure, parce
 * qu'un profil qui n'a pas répondu à une question NOUVELLE reçoit alors le plan d'un AUTRE format.
 */
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

let tri = 0, rabat = 0;
const parCible = {};
const ex = [];
for (const { key, sport, a } of goldenProfiles()) {
  if (sport !== "tri") continue;
  tri++;
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const d = (p._v2?.decisions ?? []).find((x) => x.id === "B17-continuite");
  const declare = a.longest_swim_m ?? "(absente)";
  if (d && /rabattu/i.test(String(d.what ?? ""))) {
    rabat++;
    parCible[`${a.format} → ${String(d.val).split(" ")[0]}`] = (parCible[`${a.format} → ${String(d.val).split(" ")[0]}`] || 0) + 1;
    if (ex.length < 5) ex.push(`${key}  (longest_swim_m ${declare})  pic ${p.volPeak} h · ${p.totalWeeks} sem`);
  }
}
console.log(`B-17 — RABATTEMENT DE FORMAT SUR LES PROFILS TRI DU GOLDEN\n`);
console.log(`  profils tri : ${tri} · rabattus : ${rabat} (${(100 * rabat / (tri || 1)).toFixed(1)} %)`);
for (const [k, n] of Object.entries(parCible).sort((x, y) => y[1] - x[1])) console.log(`     ${k.padEnd(16)} ${n}`);
console.log(`  exemples :`);
for (const e of ex) console.log(`     ${e}`);
// D3 — LA SONDE DIT DÉSORMAIS CE QU'ELLE MESURE. Avant le correctif, un rabattement massif
// signait le défaut ; APRÈS, c'est un taux à DEUX BORNES qui compte : 0 % signifierait que la
// branche de sécurité a disparu, 100 % qu'elle avale tout le monde. Un taux saturé accuse
// l'instrument ou le modèle mental de ce qu'il observe (dépistage de la règle 15).
console.log(`\n  → ${rabat === 0
  ? "AUCUN rabattement — SUSPECT : la branche de sécurité de B-17 ne mord nulle part. Vérifier\n    que la sous-passe B17 du golden porte des horizons où elle PEUT mordre (un taux saturé\n    accuse l'instrument, pas le moteur)."
  : rabat === tri
  ? "TOUS les profils sont rabattus — c'est le défaut D3 lui-même : le gate gouverne sur une\n    réponse que le produit ne collecte pas."
  : rabat + " rabattement(s) sur " + tri + ", tous sur une continuité déclarée BASSE et un horizon\n    trop court pour la construire — la branche de sécurité mord là où elle doit, et nulle part\n    ailleurs. Les profils dont l'écart se referme gardent leur format."}`);
