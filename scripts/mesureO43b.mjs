#!/usr/bin/env node
/**
 * O-43 §1 et §2 (O43_R10_NE_TIENT_PAS) — LES DEUX MESURES QUI DÉCIDENT.
 *
 *   node scripts/mesureO43b.mjs
 *
 * §1 — LE LIVRÉ DÉPASSE-T-IL LE DÉCLARÉ ? Avant O-42, le clone saturé contenait un travail MAL
 *      COMPTÉ : les mêmes mètres, sous-évalués en minutes. La sonde a peut-être RAISON de ne plus
 *      mordre, et l'ancien plan sous-livrait par rapport à ce que l'athlète avait déclaré.
 *        livré ≤ déclaré → la sonde a raison, l'issue 1 ANNULERAIT une correction ;
 *        livré > déclaré → un plafond est franchi, c'est un bug net.
 *      ⚠ L'unité décide : `vol_max` est déclaré en heures de BASSIN, le livré est en heures
 *      d'EAU. On compare après conversion par `swimTimeFactorOf` (O-35), jamais avant.
 *
 * §2 — R10 COUVRE-T-ELLE LA NAGE ? La rampe est la protection INTENTIONNELLE du moteur, celle
 *      qu'il cite comme mécanisme anti-blessure. Si elle ne borne pas une hausse de 71 % à
 *      `vol_recent: 0`, c'est un défaut autonome et antérieur.
 */
import "../src/app/bridge.ts";
import { swimTimeFactorOf } from "../src/engine/constraintMatrix.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

const wm = (w) => (w.days ?? []).reduce((t, d) => t + (d.sessions ?? []).reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0);
const picMin = (p) => Math.max(...(p.weeks ?? []).map(wm));

console.log("O-43 §1 — LE LIVRÉ DÉPASSE-T-IL CE QUE L'ATHLÈTE A DÉCLARÉ ?\n");
console.log("     (vol_max est en heures de BASSIN · le livré en heures d'EAU · on convertit avant de comparer)\n");
console.log("     profil                                    vol_max │ plafond en eau │ pic livré │ ratio");
let depassements = 0, vus = 0;
const lignes = [];
for (const { key, sport, a } of goldenProfiles()) {
  if (sport !== "swim") continue;
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  vus++;
  const declH = parseFloat(String(a.vol_max ?? ""));
  if (!(declH > 0)) continue;
  const f = swimTimeFactorOf(a.history);
  const plafondEau = declH * f;
  const livreH = picMin(p) / 60;
  const ratio = livreH / plafondEau;
  // ⚠ TOLÉRANCE, PARCE QUE 100 % N'EST PAS UN DÉPASSEMENT. Ma première écriture testait
  // `ratio > 1` et rendait « DES PLAFONDS SONT FRANCHIS » sur UN profil — `G/swim/ow/vol-min`,
  // à 1,80 h livrées pour 1,80 h autorisées, c'est-à-dire un plan posé EXACTEMENT sur son
  // plafond, ce qui est le comportement correct. Un verdict binaire sur une égalité flottante
  // est la même faute de seuil que la journée a produite trois fois.
  if (ratio > 1.02) depassements++;
  lignes.push({ key, declH, plafondEau, livreH, ratio, lvl: a.level, hist: a.history });
}
lignes.sort((x, y) => y.ratio - x.ratio);
for (const l of lignes.slice(0, 8))
  console.log(`     ${l.key.padEnd(42)} ${String(l.declH).padStart(4)} h │ ${l.plafondEau.toFixed(2).padStart(10)} h │ ${l.livreH.toFixed(2).padStart(7)} h │ ${(l.ratio * 100).toFixed(0).padStart(4)} %`);
const q = (xs, pr) => { const t = [...xs].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(pr * t.length))]; };
const ratios = lignes.map((l) => l.ratio);
console.log(`\n     ${vus} profils de natation · ratio livré/plafond : médiane ${(q(ratios, 0.5) * 100).toFixed(0)} % · p90 ${(q(ratios, 0.9) * 100).toFixed(0)} % · max ${(Math.max(...ratios) * 100).toFixed(0)} %`);
console.log(`     profils dont le LIVRÉ DÉPASSE le plafond déclaré de plus de 2 % : ${depassements} / ${lignes.length}`);
console.log(`     (profils posés À 100 % de leur plafond, ce qui est le comportement correct : ${lignes.filter((l) => l.ratio > 0.99 && l.ratio <= 1.02).length})`);
console.log(`\n     → ${depassements === 0
  ? "AUCUN DÉPASSEMENT. La sonde a le droit de ne plus mordre : le plan reste très en dessous\n       de ce que l'athlète a déclaré pouvoir faire. L'issue 1 annulerait une correction au lieu\n       de réparer un défaut — le problème est ailleurs."
  : "DES PLAFONDS SONT FRANCHIS : c'est un bug net, l'issue 1 répare."}`);

console.log(`\n\nO-43 §2 — LA RAMPE R10 COUVRE-T-ELLE LA NAGE, ET QUE FAIT-ELLE À \`vol_recent: 0\` ?\n`);
console.log(`     \`_rampCap = Math.max(2 × unit, vol_recent × unit × 1,1)\` — \`unit\` = SWIM_TIME_FACTOR en nage.`);
console.log(`     Le PLANCHER de 2 h est générique : en nage il vaut 2 × ${swimTimeFactorOf("reprise")} = ${(2 * swimTimeFactorOf("reprise")).toFixed(2)} h d'eau (reprise).\n`);
const base = { sport: "swim", format: "fond", history: "reprise", level: "debutant", intent: "finir",
  sessions_max: "6", dispo: "quotidienne", doubles: "non", age: "35", sex: "H",
  css: "2:00", css_known: "oui", vol_max: "10", injury: "aucune",
  med_pain: "non", med_dizzy: "non", med_treat: "non", milieu: "bassin", swim_limit: "technique" };
console.log(`     vol_recent │ départ théorique de la rampe │ S1 livrée │ pic livré │ plafond \`ramp\` de la chaîne`);
for (const vr of ["0", "1", "2", "4", "8"]) {
  const p = globalThis.EBV2.buildPlan("swim", { ...base, vol_recent: vr });
  const dep = Math.max(2 * swimTimeFactorOf("reprise"), Number(vr) * swimTimeFactorOf("reprise") * 1.1);
  const ramp = (p._r202?.plafonds ?? []).find((x) => String(x.id) === "ramp");
  console.log(`     ${vr.padStart(10)} │ ${dep.toFixed(2).padStart(27)} h │ ${String(wm(p.weeks[0])).padStart(6)} min │ ${String(picMin(p)).padStart(6)} min │ ${ramp ? ramp.livre.toFixed(2) + " h" : "(pas dans la chaîne)"}`);
}
console.log(`
     → LA RAMPE COUVRE BIEN LA NAGE (elle est convertie par \`swimTime\`, R20.7, et le plan est
       mono-sport : son total EST la nage). Ce qui ne tient pas est son PLANCHER : \`2 × unit\`
       est un minimum GÉNÉRIQUE, donc déclarer « je ne m'entraîne pas du tout » et déclarer 2 h
       de bassin par semaine donnent EXACTEMENT le même point de départ. La réponse la plus
       protectrice du domaine n'est pas plus protectrice que celle du milieu — c'est le piège du
       zéro (R20.1-a) sous une forme nouvelle : le zéro est bien LU, mais un plancher l'écrase
       juste après.`);
