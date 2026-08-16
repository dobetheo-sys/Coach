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
console.log(`\n  → ${rabat === 0
  ? "aucun rabattement : la réponse est présente partout."
  : `AUCUN de ces profils ne déclare \`longest_swim_m\` — la question est NOUVELLE. Le rabattement\n    est donc gouverné par une réponse ABSENTE, pas par une capacité mesurée. C'est un ARBITRAGE\n    à porter devant le fondateur, pas un chiffre à re-épingler.`}`);
