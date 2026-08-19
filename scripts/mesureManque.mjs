/**
 * §2 — LE MANQUE : combien le moteur ne parvient-il PAS à placer, et sous quelle forme le dire ?
 *
 * Le plan annonce une cible de volume par semaine (`vol_declared`) et en livre une autre. L'écart
 * est le VOLUME QUE LES BORNES DE SÉANCE NE PEUVENT PAS PLACER — c'est lui qui dit de combien le
 * plafond structurel est trop bas, et c'est aujourd'hui la seule grandeur du moteur que rien
 * n'affiche.
 *
 * La sonde répond à la question de FORME posée par le fondateur (« UN PUITS NON BORNÉ » §2) :
 * *« si c'est la majorité, le maillon ne peut pas être un message hebdomadaire — un athlète qui
 * lit “ton plan ne peut pas placer 40 min” chaque semaine cesse de le lire en trois semaines »*.
 * Elle mesure donc la PART DE PLANS concernés et l'ampleur TOTALE par plan, jamais une moyenne
 * hebdomadaire — la moyenne répondrait à une autre question que celle qui décide.
 *
 * Semaines de RÉCUP et d'AFFÛTAGE exclues : leur cible est délibérément basse, un « manque » y
 * serait le fonctionnement normal (même famille que les trois invariants périmés de R20.6).
 *
 *   npm run mesure:manque
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";

const q = (l, x) => l.slice().sort((u, v) => u - v)[Math.min(l.length - 1, Math.floor(l.length * x))];

const parPlan = [];
let generes = 0;
for (const { sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  generes++;
  let cible = 0, livre = 0, sem = 0;
  for (const w of p.weeks) {
    if (w.isRecup || w.phase?.id === "taper") continue;
    const c = (w.vol_declared ?? w.vol ?? 0) * 60;
    if (!(c > 0)) continue;
    const l = w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
    sem++; cible += c; livre += l;
  }
  if (sem) parPlan.push({ sport, manqueH: (cible - livre) / 60, pct: cible > 0 ? (cible - livre) / cible : 0 });
}
// UN ZÉRO A BESOIN DE SA POPULATION : « 0 manque » est un résultat possible et il se lirait comme
// une bonne nouvelle. On assert donc que la mesure A EU LIEU, séparément de son résultat.
if (parPlan.length < 500) {
  console.error("✖ population insuffisante : " + parPlan.length + " plans mesurés — le verdict n'a pas de base");
  process.exit(1);
}

const m = parPlan.map((x) => x.manqueH), pc = parPlan.map((x) => x.pct);
console.log("§2 — le volume que les bornes de séance ne placent pas\n");
console.log("plans mesurés : " + parPlan.length + " / " + generes + " générés\n");
for (const s of [0.5, 1, 2, 3]) {
  const n = parPlan.filter((x) => x.manqueH > s).length;
  console.log("  manque TOTAL du plan > " + s + " h : " + String(n).padStart(4) + "  (" + (100 * n / parPlan.length).toFixed(0) + " %)");
}
console.log("\n  par plan : méd " + q(m, 0.5).toFixed(1) + " h · p90 " + q(m, 0.9).toFixed(1) + " h · max " + Math.max(...m).toFixed(1) + " h");
console.log("  en part de la cible : méd " + (100 * q(pc, 0.5)).toFixed(1) + " % · p90 " + (100 * q(pc, 0.9)).toFixed(1) + " %");

const parSport = new Map();
for (const x of parPlan) { const e = parSport.get(x.sport) || []; e.push(x.pct); parSport.set(x.sport, e); }
console.log("\n  part de la cible non placée, par sport :");
for (const [sp, e] of [...parSport].sort((u, v) => q(v[1], 0.5) - q(u[1], 0.5)))
  console.log("    " + sp.padEnd(10) + " méd " + (100 * q(e, 0.5)).toFixed(1) + " %   n = " + e.length);

const majorite = parPlan.filter((x) => x.manqueH > 0.5).length / parPlan.length;
console.log("\n  " + (majorite > 0.5
  ? "→ la MAJORITÉ des plans est concernée : le manque se déclare UNE FOIS par plan, avec son\n    ampleur totale — un message hebdomadaire cesserait d'être lu (§2)."
  : "→ minorité de plans : un message par semaine reste lisible."));
