#!/usr/bin/env node
/**
 * O-44 §3 — LES QUATRE MESURES QUI CONDITIONNENT LA VALEUR DU PLANCHER DE DURÉE.
 *
 *   node scripts/mesureO44.mjs
 *
 * La pathologie n'est pas « six jours », c'est **dix-sept minutes** : personne ne se déplace
 * jusqu'à une piscine pour dix-sept minutes d'eau. Un `MAX_SWIM_DAYS` inventerait une limite
 * physiologique qui n'existe pas (la technique est une compétence, elle s'acquiert par la
 * répétition) ; un PLANCHER DE DURÉE borne la fréquence par `volume ÷ plancher`, sans rien
 * inventer et en s'auto-échelonnant.
 *
 * Ce script ne corrige rien. Il rend les quatre chiffres que le fondateur demande AVANT :
 *   §1  la durée qu'un plafond C15 (850 m débutant) autorise, en minutes, APRÈS O-42 ;
 *   §2  la distribution des durées de séance de nage sur les 136 profils du golden ;
 *   §3  le plancher qui ramènerait les débutants à 3-4 séances, et ce qu'il coûte aux autres ;
 *   §4  L'UNITÉ — « 2,08 h » est-il du temps DANS L'EAU ou du temps DÉCLARÉ ? `SWIM_TIME_FACTOR`
 *       change complètement le calcul, et c'est le piège que la journée a produit trois fois.
 */
import "../src/app/bridge.ts";
import { ZDEF } from "../src/generator/renderer.ts";
import {
  C15_BEGINNER_SWIM_SESSION_CAP_M, C24_MIN_SWIM_SESSION_M, C24B_MIN_SWIM_SESSION_BEGINNER_M,
  SWIM_TIME_FACTOR_BY_HISTORY, swimTimeFactorOf,
} from "../src/engine/constraintMatrix.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

const val = (x) => (x && typeof x === "object" && "val" in x ? x.val : x);
const C15 = val(C15_BEGINNER_SWIM_SESSION_CAP_M);
const C24 = val(C24_MIN_SWIM_SESSION_M);
const C24B = val(C24B_MIN_SWIM_SESSION_BEGINNER_M);

// ---- §1 — ce que C15 autorise EN MINUTES, après O-42 -----------------------
// La durée d'un bloc de nage = distance × allure de la ZONE (O-42). Le plafond C15 est en
// MÈTRES : sa traduction en minutes dépend donc du CSS de l'athlète ET de la zone du bloc.
console.log("O-44 §3 — LES QUATRE MESURES DU PLANCHER DE DURÉE\n");
console.log("§1 — CE QUE LES PLAFONDS EN MÈTRES AUTORISENT, EN MINUTES (après O-42)\n");
const mult = (z) => (ZDEF[z].lo + ZDEF[z].hi) / 2;
console.log(`     C15 (plafond séance débutant) ${C15} m · C24 (plancher non-débutant) ${C24} m · C24b (plancher débutant) ${C24B} m\n`);
console.log(`     CSS      │ ${C15} m en sw.easy │ ${C15} m en sw.css │ ${C24} m en sw.easy │ ${C24B} m en sw.easy`);
for (const cssTxt of ["1:30", "1:50", "2:00", "2:30", "3:00"]) {
  const [m, sec] = cssTxt.split(":").map(Number);
  const css = m * 60 + sec;
  const min = (metres, z) => ((metres / 100) * (css * mult(z))) / 60;
  console.log(`     ${cssTxt}/100m │       ${min(C15, "sw.easy").toFixed(1).padStart(5)} min │      ${min(C15, "sw.css").toFixed(1).padStart(5)} min │       ${min(C24, "sw.easy").toFixed(1).padStart(5)} min │       ${min(C24B, "sw.easy").toFixed(1).padStart(5)} min`);
}
console.log(`\n     → un plancher de durée SUPÉRIEUR à la colonne « ${C15} m en sw.easy » serait
       INATTEIGNABLE sous C15 pour un débutant à ce CSS : la règle se contredirait.`);

// ---- §2 — distribution des durées de séance de nage ------------------------
console.log(`\n§2 — DURÉES DE SÉANCE DE NAGE LIVRÉES (136 profils de natation du golden)\n`);
const durees = [], parNiveau = {};
let profils = 0;
const joursDe = (p) => Math.max(...(p.weeks ?? []).map((w) => (w.days ?? []).filter((d) => (d.sessions ?? []).some((s) => s.d === "sw" && s.min > 0)).length));
const lignes = [];
for (const { key, sport, a } of goldenProfiles()) {
  if (sport !== "swim") continue;
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  profils++;
  const d = [];
  for (const w of p.weeks ?? []) for (const day of w.days ?? []) for (const s of day.sessions ?? [])
    if (s.d === "sw" && (s.min || 0) > 0) { durees.push(s.min); d.push(s.min); (parNiveau[a.level] ||= []).push(s.min); }
  lignes.push({ key, lvl: a.level, hist: a.history, jours: joursDe(p), med: d.length ? Math.round(d.reduce((t, x) => t + x, 0) / d.length) : 0, min: d.length ? Math.min(...d) : 0 });
}
const q = (xs, pr) => { const t = [...xs].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(pr * t.length))]; };
console.log(`     ${durees.length} séances de nage sur ${profils} profils`);
console.log(`     p10 ${q(durees, 0.1)} · médiane ${q(durees, 0.5)} · p90 ${q(durees, 0.9)} · min ${Math.min(...durees)} · max ${Math.max(...durees)} min`);
for (const [lo, hi] of [[0, 15], [15, 20], [20, 25], [25, 30], [30, 45], [45, Infinity]]) {
  const n = durees.filter((x) => x >= lo && x < hi).length;
  console.log(`       ${(`${lo}–${hi === Infinity ? "…" : hi} min`).padEnd(12)} ${String(n).padStart(5)}  (${(100 * n / durees.length).toFixed(1)} %)`);
}
console.log(`\n     par niveau (durée médiane) :`);
for (const [k, v] of Object.entries(parNiveau)) console.log(`       ${k.padEnd(10)} ${q(v, 0.5)} min  (n=${v.length})`);

// ---- §3 — le plancher qui ramène les débutants à 3-4 séances ---------------
console.log(`\n§3 — QUEL PLANCHER RAMÈNE LES DÉBUTANTS À 3-4 SÉANCES ?\n`);
console.log(`     Simulation à VOLUME CONSTANT : la fréquence devient \`volume hebdo ÷ plancher\`.`);
console.log(`     plancher │ débutants : jours médians │ tous : jours médians │ profils dont la fréquence baisse`);
for (const pl of [20, 22, 25, 28, 30, 35]) {
  const sim = lignes.map((l) => {
    const vol = l.med * l.jours;                       // volume hebdo approché de la semaine max
    return { ...l, nj: Math.max(1, Math.min(l.jours, Math.floor(vol / pl))) };
  });
  const deb = sim.filter((l) => l.lvl === "debutant");
  const med = (xs) => q(xs.map((l) => l.nj), 0.5);
  console.log(`     ${String(pl).padStart(6)} min │${String(med(deb)).padStart(24)} │${String(med(sim)).padStart(21)} │ ${sim.filter((l) => l.nj < l.jours).length} / ${sim.length}`);
}

// ---- §4 — l'unité --------------------------------------------------------
console.log(`\n§4 — L'UNITÉ : « 2,08 h » EST-IL DU TEMPS DANS L'EAU OU DU TEMPS DÉCLARÉ ?\n`);
console.log(`     SWIM_TIME_FACTOR par historique : ${JSON.stringify(SWIM_TIME_FACTOR_BY_HISTORY)}`);
console.log(`     (reprise ${swimTimeFactorOf("reprise")} · confirme ${swimTimeFactorOf("confirme")} · ancien ${swimTimeFactorOf("ancien")})`);
console.log(`
     Le facteur code « une heure de BASSIN n'est pas une heure de NAGE ». Il s'applique à la
     DÉCLARATION de l'athlète (O-35 : \`swimTime\` a quitté les facteurs de la chaîne, ce n'est pas
     une réduction mais une conversion d'unité). Les durées de séance mesurées au §2 viennent de
     \`stepMin\` : ce sont des minutes DANS L'EAU, elles ne portent aucun facteur.

     → un plancher de durée doit donc être posé en minutes DANS L'EAU, comme les durées qu'il
       borne. Le poser sur du temps de bassin le rendrait ${(1 / swimTimeFactorOf("reprise")).toFixed(2)}× trop haut chez un
       athlète en reprise — le piège d'unité que la journée a produit trois fois.`);
