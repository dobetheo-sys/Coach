#!/usr/bin/env node
/**
 * QUELLE RÈGLE MORD VRAIMENT ? — LA FRÉQUENCE SE MESURE AU DÉCLENCHEMENT, JAMAIS SUR LE LIVRÉ.
 *
 *   npm run mesure:morsure
 *
 * Arbitrage du fondateur (« UN CORRECTEUR QUI RÉUSSIT EFFACE SA PROPRE TRACE », 18/08/2026) :
 *
 *     il laisse une SIGNATURE      → la sortie est lisible
 *       DOSE_CAP_MIN clampe à 40 : un bloc exactement à 40 PROUVE le clamp
 *       un plancher pose une valeur : la valeur EST le témoin
 *
 *     il RESTAURE l'invariant      → la sortie ne dit rien
 *       C26c coupe jusqu'à « sous le plafond » : « sous » est aussi l'état normal
 *       une réallocation qui compense : le total est le même dans les deux cas
 *
 * Donc **tout mécanisme qui restaure sans marquer se compte au DÉCLENCHEMENT**. La méthode est
 * la neutralisation : on désactive la règle (par `npm run casser`, jamais par un `sed` ad hoc),
 * on régénère les 989 profils, et on compte ceux dont le plan CHANGE.
 *
 * CE QUE CE SCRIPT A RECTIFIÉ EN NAISSANT : l'arbitrage B-02 déclarait *« le plafond actuel est
 * dormant : sur les 945 profils du golden, il ne mord que sur 6 profils (0,6 %) »* — lu sur le
 * LIVRÉ. Mesuré au déclenchement : **118 sur 985, 12 %**. Un facteur VINGT. La conclusion « la
 * règle ne protège aujourd'hui presque personne » était fausse ; le refus du recalibrage tenait
 * heureusement à d'autres critères mesurés (45 % du catalogue touché, 64 % de la population nage).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = join(import.meta.dirname, "..");
const SONDE = join(RACINE, "scripts", "_morsureSonde.mjs");
writeFileSync(SONDE, `import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
const out = [];
for (const { key, sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  let h = 0;
  for (const w of p.weeks || []) for (const d of w.days || []) for (const s of d.sessions || []) h += (s.min || 0);
  out.push(key + "\\t" + Math.round(h));
}
console.log(out.join("\\n"));
`);

/** Les correcteurs qui RESTAURENT un invariant — donc invisibles sur le livré.
 *  `avant`/`apres` neutralisent la règle sans toucher au reste (le harnais restaure ensuite). */
const REGLES = [
  { nom: "C26c — plafond de temps dur",
    avant: "for (let tour = 0; tour < 200 && weekHard() > cap; tour++) {",
    apres: "for (let tour = 0; tour < 0 && weekHard() > cap; tour++) {" },
  { nom: "C22 — lissage ≤ +10 %/sem",
    avant: "for (let g = 0; g < 4 && weekMinOf(wk) > prevCharge * C22_MAX_WEEKLY_GROWTH + 1; g++) {",
    apres: "for (let g = 0; g < 0 && weekMinOf(wk) > prevCharge * C22_MAX_WEEKLY_GROWTH + 1; g++) {" },
  { nom: "I14 — la longue est la plus longue",
    avant: "  function enforceLabelVsDose(): void {",
    apres: "  function enforceLabelVsDose(): void { if (1) return;" },
  { nom: "I14b — regarnissage des faciles",
    avant: "  function refillEasyAfterLabelCap(cuts?: Map<number, number>, ciblesForcees?: Map<number, number>): void {",
    apres: "  function refillEasyAfterLabelCap(cuts?: Map<number, number>, ciblesForcees?: Map<number, number>): void { if (1) return;" },
];

const lire = (txt) => new Map(txt.trim().split("\n").filter((l) => l.includes("\t")).map((l) => l.split("\t")));
const ref = lire(execSync(`node ${SONDE}`, { cwd: RACINE, encoding: "utf8", maxBuffer: 64e6 }));

console.log("QUELLE RÈGLE MORD ? — mesure au DÉCLENCHEMENT, par neutralisation\n");
console.log("  corpus : " + ref.size + " profils · méthode : npm run casser puis régénération\n");
for (const r of REGLES) {
  let sans;
  try {
    sans = lire(execSync(
      `npm run --silent casser -- --fichier src/generator/planGenerator.ts --avant ${JSON.stringify(r.avant)} --apres ${JSON.stringify(r.apres)} -- node ${SONDE}`,
      { cwd: RACINE, encoding: "utf8", maxBuffer: 64e6, stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    console.log(`  ${r.nom.padEnd(34)}  ✖ neutralisation impossible (le motif a changé — À REVOIR)`);
    continue;
  }
  let n = 0, tot = 0;
  for (const [k, v] of ref) if (sans.has(k)) { tot++; if (sans.get(k) !== v) n++; }
  console.log(`  ${r.nom.padEnd(34)}  ${String(n).padStart(4)} / ${tot} profils  (${(n / Math.max(1, tot) * 100).toFixed(0)} %)`);
}
console.log("\n  Un « 0 % » ici accuserait la neutralisation avant d'accuser la règle : une règle");
console.log("  qu'on désactive sans que rien ne bouge n'a pas été désactivée (règle 15).");
