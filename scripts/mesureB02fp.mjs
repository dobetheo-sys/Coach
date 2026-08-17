#!/usr/bin/env node
/**
 * MESURE DU CRITÈRE 1' (B-02, arbitrage du 14/08/2026) — le TAUX DE FAUX POSITIFS.
 *
 *   node scripts/mesureB02fp.mjs
 *
 * Le critère 1 (« mord sur < 10 % des profils ») est RETIRÉ : il compte les profils touchés,
 * pas les profils touchés À TORT, et la mesure de la pondération a montré que c'est
 * exactement la distinction qui départage les deux règles. Le critère qui le remplace :
 *
 *     1'  aucun profil n'est touché pour une raison qui ne s'applique pas à lui.
 *
 * Il s'instancie ici sur la population que la pondération ajoute et que le drapeau exemptait —
 * les TRIATHLONS : leur morsure vient-elle de minutes dures réellement disproportionnées, ou
 * d'un artefact (une zone comptée dure par repli, un leg de brick sans zone, une bande) ?
 *
 * On ne juge pas sur le total : on DÉCOMPOSE la semaine qui mord, zone par zone, et on lit ce
 * qui la remplit. Un artefact se voit à ce qu'il est concentré sur une seule zone suspecte.
 */
import "../src/app/bridge.ts";
import { intensitySplit } from "../src/engine/loadModel.ts";
import { C26c_HARD_TIME_TOLERANCE } from "../src/engine/constraintMatrix.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { estCharge } from "./lib/planMetrics.mjs";

const POIDS = { rn: 1.0, bk: 0.75, sw: 0.5 };
const capDe = (min) => Math.min(60, Math.max(25, 0.12 * min));

/** Minutes dures d'un step, dans l'arithmétique du moteur (R11.1 : on importe, on ne recopie pas). */
function durStep(st, sDisc) {
  try {
    const sp = intensitySplit({ d: st.d || sDisc, steps: [st] });
    return { hard: sp.hardMin, total: sp.easyMin + sp.modMin + sp.hardMin };
  } catch { return { hard: 0, total: 0 }; }
}

/** La semaine qui mord le plus fort, décomposée par ZONE. */
function pireSemaine(plan) {
  let pire = null;
  for (const w of (plan.weeks ?? []).filter(estCharge)) {
    let pond = 0, total = 0;
    const parZone = {};
    for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
      if (s.d === "rs") continue;
      for (const st of s.steps ?? []) {
        const { hard, total: t } = durStep(st, s.d);
        total += t;
        if (hard <= 0) continue;
        const disc = st.d || s.d;
        const p = hard * (POIDS[disc] ?? 1);
        pond += p;
        const z = typeof st.zone === "string" && st.zone ? st.zone : (st.leg === "run" ? "(leg course sans zone)" : "(sans zone)");
        parZone[z] = (parZone[z] || 0) + p;
      }
    }
    if (total <= 0) continue;
    const cap = capDe(total) * C26c_HARD_TIME_TOLERANCE;
    const exces = pond - cap;
    if (!pire || exces > pire.exces) pire = { num: w.num, pond, total, cap, exces, parZone };
  }
  return pire;
}

const touches = [];
for (const { key, sport, a } of goldenProfiles()) {
  if (sport !== "tri") continue;
  let plan;
  try { plan = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const p = pireSemaine(plan);
  if (p && p.exces > 0) touches.push({ key, format: a.format, ...p });
}

console.log(`CRITÈRE 1' — les ${touches.length} profils TRI que la pondération ajoute (le drapeau les exemptait)\n`);
const zonesGlobales = {};
for (const t of touches) for (const [z, m] of Object.entries(t.parZone)) zonesGlobales[z] = (zonesGlobales[z] || 0) + m;
const tri = Object.entries(zonesGlobales).sort((x, y) => y[1] - x[1]);
console.log("D'OÙ VIENNENT LES MINUTES DURES PONDÉRÉES (toutes semaines mordantes cumulées) :");
const totZ = tri.reduce((t, [, m]) => t + m, 0);
for (const [z, m] of tri) console.log(`  ${z.padEnd(26)} ${Math.round(m).toString().padStart(6)} min  ${((m / totZ) * 100).toFixed(1).padStart(5)} %`);

console.log("\nPROFIL PAR PROFIL — la semaine qui mord, et de combien :");
console.log("  profil".padEnd(44) + "vol/sem   dur pond.  plafond  excès   part dure");
for (const t of touches.sort((x, y) => y.exces - x.exces)) {
  const part = (t.pond / t.total) * 100;
  console.log("  " + t.key.padEnd(42)
    + (t.total / 60).toFixed(1).padStart(6) + " h"
    + Math.round(t.pond).toString().padStart(10) + " min"
    + Math.round(t.cap).toString().padStart(8) + Math.round(t.exces).toString().padStart(8)
    + part.toFixed(1).padStart(9) + " %");
}
const exces = touches.map((t) => t.exces).sort((a, b) => a - b);
if (exces.length) {
  console.log(`\nexcès : min ${Math.round(exces[0])} min · médiane ${Math.round(exces[Math.floor(exces.length / 2)])} · max ${Math.round(exces[exces.length - 1])}`);
  const marginaux = touches.filter((t) => t.exces <= 5).length;
  console.log(`profils dont l'excès tient en ≤ 5 min (le bruit de quantification des répétitions) : ${marginaux}/${touches.length}`);
}
