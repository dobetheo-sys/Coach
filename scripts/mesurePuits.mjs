/**
 * LE PUITS DU PLAN TRI — ce qu'il absorbe, et où part le volume quand on le borne.
 *
 * `blockBounds` rend `cap: 9999` pour tout bloc de corps sans `bnd`, hors brick et hors `long` :
 * c'est le seul chemin vers l'absence de plafond, et 38 % des séances tri en portent un. Un puits
 * n'est pas un défaut en soi — la courbe a besoin d'un endroit où déverser. Le défaut est qu'il
 * absorbe SANS TRACE : un plan qui ne peut pas placer 40 minutes les met dans une nage vitesse de
 * 210 minutes, et le total est juste. Personne ne voit rien.
 *
 * Cette sonde mesure les DEUX faces, sur le corpus (jamais sur un profil — la leçon N=1) :
 *   · ce que chaque puits absorbe (dispersion : un puits a une queue, un créneau borné sature)
 *   · où le volume se reporte quand on borne — c'est la question du §1 de « UN PUITS NON BORNÉ » :
 *     déverser dans le puits suivant déplace le défaut, il ne le ferme pas.
 *
 *   npm run mesure:puits
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";

const q = (l, p) => l.slice().sort((a, b) => a - b)[Math.min(l.length - 1, Math.floor(l.length * p))];

const par = new Map();
let profils = 0, seances = 0, minTotal = 0;
for (const { sport, a } of profiles()) {
  if (sport !== "tri") continue;
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  profils++;
  for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) {
    if (s.d === "rs") continue;
    const corps = (s.steps || []).filter((b) => b.role === "body");
    if (!corps.length) continue;
    seances++; minTotal += s.min || 0;
    const libre = corps.some((b) => !b.bnd && !s.brick && !s.long);
    const e = par.get(s.name) || { n: 0, min: [], libre: false, disc: s.d };
    e.n++; e.min.push(s.min || 0); e.libre = e.libre || libre;
    par.set(s.name, e);
  }
}
if (!profils) { console.error("✖ sonde vide — aucun profil tri généré"); process.exit(1); }

console.log("profils tri " + profils + " · séances " + seances + " · " + Math.round(minTotal / 60) + " h prescrites\n");
console.log("        n    méd    p90    max   max/méd   minutes totales   type");
const lignes = [...par].sort((x, y) => y[1].min.reduce((t, v) => t + v, 0) - x[1].min.reduce((t, v) => t + v, 0));
for (const [nom, e] of lignes) {
  const tot = e.min.reduce((t, v) => t + v, 0);
  if (tot < minTotal * 0.01) continue;                 // les types marginaux noient la lecture
  const med = q(e.min, 0.5) || 1;
  console.log("  " + (e.libre ? "∞ " : "  ") + String(e.n).padStart(5)
    + String(Math.round(med)).padStart(7) + String(Math.round(q(e.min, 0.9))).padStart(7)
    + String(Math.round(Math.max(...e.min))).padStart(7)
    + ("×" + (Math.max(...e.min) / med).toFixed(1)).padStart(10)
    + String(Math.round(tot / 60) + " h").padStart(18) + "   " + e.disc + "  " + nom);
}
console.log("\n  ∞ = au moins un bloc de corps atteint `cap: 9999` (sans `bnd`, hors brick, hors long)");
console.log("  max/méd est le signal d'ABSORPTION : un créneau borné sature près de sa médiane,");
console.log("  un puits porte une queue — c'est ce qui distingue « gros » de « libre ».");
