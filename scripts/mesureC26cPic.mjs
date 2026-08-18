#!/usr/bin/env node
/**
 * C26c AU PIC — COMBIEN DE SEMAINES SATURENT RÉELLEMENT LE BUDGET DUR ?
 *
 *   node scripts/mesureC26cPic.mjs
 *
 * Exigence du fondateur avant tout arbitrage (« C26c AU PIC — LE VO2 CÈDE » §3) : *« combien de
 * semaines de pic saturent réellement C26c sur les 989 ? Si c'est 7 profils, l'ordre de cession
 * est déclaratif. Si c'est la majorité, il devient la règle de fait de la phase de pic, et ça
 * mérite d'être su avant. »*
 *
 * ⚠ DEUX GRANDEURS, ET J'AI PUBLIÉ LA PREMIÈRE EN CROYANT RÉPONDRE À LA SECONDE.
 *
 *   (a) SATURATION RÉSIDUELLE — combien de semaines vivent près du plafond APRÈS que C26c a
 *       coupé. C'est ce que ce bloc mesure : **143 / 2 192 = 7 %**.
 *   (b) DÉCLENCHEMENT — sur combien de plans C26c ARBITRE réellement au pic. C'est la question
 *       du fondateur, et (a) n'y répond pas : la règle coupe JUSQU'À repasser sous le plafond,
 *       donc son succès EFFACE sa propre trace. Mesuré autrement — le rayon d'explosion de
 *       l'ordre de cession au golden — c'est **178 / 989 = 18 %**, deux fois et demie plus.
 *
 * Mesurer l'ÉTAT APRÈS une règle et en déduire la FRÉQUENCE de son déclenchement est faux
 * chaque fois que la règle converge : c'est la forme temporelle de la règle 15. Les deux
 * chiffres sont vrais et ne répondent pas à la même question — l'étiquette compte.
 *
 * Le calcul de (a), sur le plan LIVRÉ : temps dur PONDÉRÉ de chaque semaine de CHARGE en phase
 * de pic, contre `hardTimeCapMin` × la tolérance C26c. « Saturée » = à moins de 5 % sous le
 * plafond toléré. Le seuil est déclaré ici pour qu'on puisse le discuter.
 *
 * Le second bloc répond au §4 : « Nage vitesse » descend-elle ENCORE, maintenant que
 * `prioriteFinancement` est actif ? C'est le test RÉTROACTIF de la politique — la pièce 1
 * demandait des minutes, la politique a été écrite après elle.
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
import { intensitySplit } from "../src/engine/loadModel.ts";
import { hardTimeCapMin, weightedHardMin, C26c_HARD_TIME_TOLERANCE } from "../src/engine/constraintMatrix.ts";

const SEUIL_SATURATION = 0.95;
let semPic = 0, semSat = 0, profPic = 0, profSat = 0;
const parSport = {};
// §4 — la trajectoire de « Nage vitesse » sur les plans qui en portent assez pour en avoir une.
let nvTot = 0, nvDescend = 0;
const exemples = [];

for (const { key, sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const ctx = { history: a.history, level: a.level, injured: !!(a.injury && a.injury !== "aucune") };
  const cap = hardTimeCapMin(ctx) * C26c_HARD_TIME_TOLERANCE;
  let sat = 0, pic = 0;
  for (const w of p.weeks ?? []) {
    if (w.isRecup || w.phase?.id !== "peak") continue;
    pic++;
    const hard = (w.days ?? []).flatMap((d) => d.sessions ?? [])
      .reduce((t, s) => t + weightedHardMin(intensitySplit(s).hardByDisc), 0);
    if (hard >= cap * SEUIL_SATURATION) sat++;
  }
  if (pic) {
    profPic++; semPic += pic; semSat += sat;
    if (sat) profSat++;
    const s = parSport[sport] || (parSport[sport] = { pic: 0, sat: 0 });
    s.pic += pic; s.sat += sat;
  }
  // « Nage vitesse » : suite des minutes par occurrence, semaines de charge.
  const nv = [];
  for (const w of p.weeks ?? []) {
    if (w.isRecup || w.phase?.id === "taper") continue;
    for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      if (/Nage vitesse/i.test(s.name || "")) nv.push({ num: w.num, min: s.min || 0 });
  }
  if (nv.length >= 6) {
    nvTot++;
    const q = Math.max(1, Math.floor(nv.length / 4));
    const debut = nv.slice(0, q).reduce((t, x) => t + x.min, 0) / q;
    const fin = nv.slice(-q).reduce((t, x) => t + x.min, 0) / q;
    if (fin < debut - 1) { nvDescend++; if (exemples.length < 4) exemples.push(`${key} ${Math.round(debut)} → ${Math.round(fin)} min`); }
  }
}

console.log("C26c AU PIC — SATURATION RÉSIDUELLE du budget dur  (plan livré, 989 profils)");
console.log("  ⚠ ce n'est PAS le taux de déclenchement : C26c coupe jusqu'à repasser sous le");
console.log("    plafond, donc son succès efface sa trace. Déclenchement mesuré au rayon : 178/989 (18 %).\n");
console.log(`  profils avec une phase de pic en charge : ${profPic}`);
console.log(`  semaines de pic en charge               : ${semPic}`);
console.log(`  …dont SATURÉES (≥ ${Math.round(SEUIL_SATURATION * 100)} % du plafond toléré) : ${semSat}  (${(semSat / Math.max(1, semPic) * 100).toFixed(0)} %)`);
console.log(`  profils dont AU MOINS une semaine de pic sature : ${profSat}  (${(profSat / Math.max(1, profPic) * 100).toFixed(0)} %)`);
console.log("\n  par sport :");
for (const [sp, v] of Object.entries(parSport).sort((x, y) => y[1].sat - x[1].sat))
  console.log(`    ${sp.padEnd(10)} ${String(v.sat).padStart(4)} / ${String(v.pic).padStart(4)} semaines  (${(v.sat / Math.max(1, v.pic) * 100).toFixed(0)} %)`);

console.log(`\n§4 — « NAGE VITESSE » DESCEND-ELLE ENCORE ? (premier quart vs dernier quart)\n`);
console.log(`  plans porteurs (≥ 6 occurrences) : ${nvTot}`);
console.log(`  …dont la dose DESCEND            : ${nvDescend}  (${(nvDescend / Math.max(1, nvTot) * 100).toFixed(0)} %)`);
for (const e of exemples) console.log(`      ${e}`);
