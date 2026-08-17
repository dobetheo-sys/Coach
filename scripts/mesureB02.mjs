#!/usr/bin/env node
/**
 * MESURE B-02 — la variante de PONDÉRATION, avant d'écrire quoi que ce soit (règle 7).
 *
 *   node scripts/mesureB02.mjs
 *
 * Le ticket propose :
 *     hardCap = clamp(0,12 × minutes_hebdo, 25, 60)     ← discipline-AVEUGLE
 *     minutes dures pondérées : course/trail ×1,00 · vélo ×0,75 · nage ×0,50
 *
 * Ce script ne modifie RIEN : il calcule, sur les 949 profils du golden, combien de profils
 * auraient au moins une semaine de charge au-dessus du plafond, dans TROIS lectures —
 * pondérée (la proposition), brute (le même plafond sans pondération), et le drapeau
 * « disciplines d'impact » (l'arbitrage du 13/08, pour situer). Les deux critères de
 * recevabilité encore en vigueur (le 3ᵉ est caduc depuis la clôture de B-02a) :
 *     1. mord sur < 10 % des profils du golden
 *     2. ≥ 70 % des profils touchés sont sous 5 h/semaine
 *
 * La pondération se calcule au niveau du STEP, avec la discipline du step (`st.d`) et non
 * celle de la séance : un brick porte deux disciplines, et les attribuer à la séance entière
 * fausserait exactement les profils que la mesure doit départager.
 */
import "../src/app/bridge.ts";
import { intensitySplit } from "../src/engine/loadModel.ts";
import { C26c_HARD_TIME_TOLERANCE } from "../src/engine/constraintMatrix.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { estCharge } from "./lib/planMetrics.mjs";

/** La pondération proposée. Elle vit ICI et nulle part ailleurs tant qu'elle n'est pas adoptée. */
const POIDS = { rn: 1.0, bk: 0.75, sw: 0.5 };
const IMPACT = new Set(["run", "trail", "duathlon"]);
const capDe = (min) => Math.min(60, Math.max(25, 0.12 * min));

/**
 * Minutes DURES d'un step, dans l'arithmétique du MOTEUR : on lui soumet le step seul et on
 * lit ce qu'il en fait. Mon premier instrument recopiait la formule (distance ÷ allure) ET
 * portait ses propres constantes d'allure de repli — la faute d'unité que ce chantier traque
 * ailleurs, dans la sonde qui devait la mesurer. `intensitySplit` importe donc, elle ne se
 * réécrit pas (R11.1), et ses refs par défaut sont celles du moteur.
 */
function durStep(st, sDisc) {
  try {
    const sp = intensitySplit({ d: st.d || sDisc, steps: [st] });
    return { hard: sp.hardMin, total: sp.easyMin + sp.modMin + sp.hardMin };
  } catch { return { hard: 0, total: 0 }; }
}

/** Minutes dures d'une semaine, brutes et pondérées, chaque step attribué à SA discipline. */
function durSemaine(w, poids = POIDS) {
  let brut = 0, pond = 0, total = 0;
  for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
    if (s.d === "rs") continue;
    for (const st of s.steps ?? []) {
      const { hard, total: t } = durStep(st, s.d);
      total += t;
      if (hard <= 0) continue;
      const disc = st.d || s.d;
      brut += hard;
      pond += hard * (poids[disc] ?? 1.0);
    }
  }
  return { brut, pond, total };
}

// BALAYAGE : la pondération proposée est-elle LOIN du critère, ou à côté ? On fait varier les
// deux poids non-course, la structure de la règle restant identique. Ce n'est PAS un choix de
// valeur — c'est ce qui permet au fondateur de savoir si son §2 se rattrape par calibrage.
const JEUX = [
  ["pondere", { rn: 1, bk: 0.75, sw: 0.5 }],
  ["pond-0.6-0.4", { rn: 1, bk: 0.6, sw: 0.4 }],
  ["pond-0.5-0.33", { rn: 1, bk: 0.5, sw: 0.33 }],
  ["pond-0.4-0.25", { rn: 1, bk: 0.4, sw: 0.25 }],
];
const lectures = { pondere: [], "pond-0.6-0.4": [], "pond-0.5-0.33": [], "pond-0.4-0.25": [], brut: [], impact: [] };
let vus = 0;
const parSport = { pondere: {}, "pond-0.6-0.4": {}, "pond-0.5-0.33": {}, "pond-0.4-0.25": {}, brut: {}, impact: {} };

for (const { key, sport, a } of goldenProfiles()) {
  let plan;
  try { plan = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  vus++;
  const pires = {}; let pireB = 0;
  for (const w of (plan.weeks ?? []).filter(estCharge)) {
    for (const [nom, poids] of JEUX) {
      const { pond, total } = durSemaine(w, poids);
      if (total <= 0) continue;
      const cap = capDe(total) * C26c_HARD_TIME_TOLERANCE;
      if (pond - cap > (pires[nom] ?? 0)) pires[nom] = pond - cap;
    }
    const { brut, total } = durSemaine(w);
    if (total > 0 && brut - capDe(total) * C26c_HARD_TIME_TOLERANCE > pireB) pireB = brut - capDe(total) * C26c_HARD_TIME_TOLERANCE;
  }
  const volHebdoMed = (() => {
    const v = (plan.weeks ?? []).filter(estCharge).map((w) => durSemaine(w).total).sort((x, y) => x - y);
    return v.length ? v[Math.floor(v.length / 2)] / 60 : 0;
  })();
  const ligne = { key, sport, volH: volHebdoMed };
  for (const [nom] of JEUX) if ((pires[nom] ?? 0) > 0) { lectures[nom].push(ligne); parSport[nom][sport] = (parSport[nom][sport] || 0) + 1; }
  if (pireB > 0) { lectures.brut.push(ligne); parSport.brut[sport] = (parSport.brut[sport] || 0) + 1; }
  if (pireB > 0 && IMPACT.has(sport)) { lectures.impact.push(ligne); parSport.impact[sport] = (parSport.impact[sport] || 0) + 1; }
}

console.log(`MESURE B-02 — ${vus} profils du golden, plafond clamp(0,12 × min_hebdo, 25, 60) × tolérance C26c ${C26c_HARD_TIME_TOLERANCE}\n`);
for (const [nom, l] of Object.entries(lectures)) {
  const pct = (l.length / vus) * 100;
  const sous5 = l.filter((x) => x.volH < 5).length;
  const conc = l.length ? (sous5 / l.length) * 100 : 0;
  const c1 = pct < 10, c2 = l.length === 0 || conc >= 70;
  const libelle = nom === "pondere" ? "PONDÉRÉE — la proposition (×1 / ×0,75 / ×0,5)" : nom === "brut" ? "brute (aucune pondération)" : nom === "impact" ? "drapeau « disciplines d'impact » (13/08)" : "pondération alternative " + nom.replace("pond-", "×1 / ×").replace("-", " / ×");
  console.log(`${libelle}`);
  console.log(`  touchés : ${l.length}/${vus} (${pct.toFixed(1)} %) — critère 1 (< 10 %) : ${c1 ? "✓" : "✖"}`);
  console.log(`  sous 5 h/sem : ${sous5}/${l.length} (${conc.toFixed(1)} %) — critère 2 (≥ 70 %) : ${c2 ? "✓" : "✖"}`);
  console.log(`  par sport : ${JSON.stringify(parSport[nom])}`);
  const q = l.map((x) => x.volH).sort((a, b) => a - b);
  if (q.length) console.log(`  volume hebdo des touchés : min ${q[0].toFixed(1)} h · médiane ${q[Math.floor(q.length / 2)].toFixed(1)} h · max ${q[q.length - 1].toFixed(1)} h`);
  console.log("");
}
