#!/usr/bin/env node
/**
 * LES PARTS PAR DISCIPLINE — CE QUE LE PLAN DONNE CONTRE CE QUE L'ÉPREUVE DEMANDE.
 *
 *   npm run mesure:parts [profil]
 *
 * Préalable du lot vélo (fondateur, « LE LOT VÉLO » §1) : *« l'allocation est-elle exprimée en
 * PARTS ou en HEURES ABSOLUES dans le moteur ? »*
 *
 * **Ni l'un ni l'autre : elle est IMPLICITE.** Le schéma de semaine (`weekBuilder.schema`) est
 * agnostique de la discipline — il ne pose que des CRÉNEAUX (`dur1`, `dur2`, `durLong`,
 * `facileR`, `facile2`, `recup`). C'est `buildTriSessions` qui décide quelle discipline occupe
 * quel créneau, par phase. La part livrée est donc le PRODUIT « nombre de créneaux » × « taille
 * du type qui l'occupe », et rien dans le moteur ne la nomme ni ne la vise.
 *
 * Conséquence pour le lot : le préalable n'est pas de « rendre proportionnelle » une allocation
 * absolue — c'est de faire EXISTER une cible de part. Et ça confirme la dépendance du §4 : à
 * créneaux constants, la part d'une discipline ne bouge que si la TAILLE de ses types bouge.
 *
 * Les bricks sont VENTILÉS par leg (vélo/course) : les compter en bloc dirait « 33 % de vélo »
 * en incluant du temps de course, et les ignorer dirait « 22 % » en jetant la moitié du vélo
 * réellement roulé. Les deux chiffres sont donnés, avec leur étiquette.
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";

const CIBLE_COURSE = { "70.3": { sw: 12, bk: 52, rn: 34 }, Full: { sw: 10, bk: 54, rn: 34 }, M: { sw: 15, bk: 50, rn: 33 }, S: { sw: 16, bk: 50, rn: 32 } };

function parts(p) {
  const m = { sw: 0, bk: 0, rn: 0, autre: 0 };
  let brickBk = 0, brickRn = 0;
  for (const w of p.weeks || []) {
    if (w.isRecup || w.phase?.id === "taper") continue;
    for (const d of w.days || []) for (const s of d.sessions || []) {
      if (s.d === "rs" || s.race) continue;
      if (s.d === "br") {
        // le brick se ventile par LEG, sinon on compte du temps de course comme du vélo
        for (const b of s.steps || []) {
          const min = (b.reps || 1) * (b.durationMin || 0);
          if (b.leg === "bike") brickBk += min;
          else if (b.leg === "run" || b.d === "rn") brickRn += min;
        }
        continue;
      }
      if (m[s.d] != null) m[s.d] += s.min || 0; else m.autre += s.min || 0;
    }
  }
  const pur = m.sw + m.bk + m.rn + m.autre;
  const tot = pur + brickBk + brickRn;
  return { m, brickBk, brickRn, pur, tot };
}

const cible = process.argv[2];
const lignes = [];
for (const { key, sport, a } of profiles()) {
  if (sport !== "tri") continue;
  if (cible && !key.includes(cible)) continue;
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const fmt = a.format;
  const r = parts(p);
  if (!r.tot) continue;
  lignes.push({ key, fmt, ...r });
}

const pct = (x, t) => (t ? (x / t * 100) : 0);
console.log("PARTS PAR DISCIPLINE — plan livré (semaines de charge), bricks VENTILÉS par leg\n");
console.log("  format   n     nage    vélo    course      (cible d'épreuve : nage/vélo/course)");
const parFmt = {};
for (const l of lignes) (parFmt[l.fmt] ||= []).push(l);
for (const [fmt, ls] of Object.entries(parFmt)) {
  const s = ls.reduce((t, l) => ({ sw: t.sw + l.m.sw, bk: t.bk + l.m.bk + l.brickBk, rn: t.rn + l.m.rn + l.brickRn, tot: t.tot + l.tot }), { sw: 0, bk: 0, rn: 0, tot: 0 });
  const c = CIBLE_COURSE[fmt];
  console.log(`  ${String(fmt).padEnd(6)} ${String(ls.length).padStart(4)}   ${pct(s.sw, s.tot).toFixed(0).padStart(4)} %  ${pct(s.bk, s.tot).toFixed(0).padStart(4)} %  ${pct(s.rn, s.tot).toFixed(0).padStart(6)} %`
    + (c ? `        ${c.sw} / ${c.bk} / ${c.rn}` : ""));
}
console.log("\n  ÉCART vélo (part du plan − part de l'épreuve), par format :");
for (const [fmt, ls] of Object.entries(parFmt)) {
  const c = CIBLE_COURSE[fmt]; if (!c) continue;
  const s = ls.reduce((t, l) => ({ bk: t.bk + l.m.bk + l.brickBk, tot: t.tot + l.tot }), { bk: 0, tot: 0 });
  const d = pct(s.bk, s.tot) - c.bk;
  console.log(`    ${String(fmt).padEnd(6)} ${d > 0 ? "+" : ""}${d.toFixed(0)} points`);
}
console.log("\n  (le vélo PUR, hors bricks, est l'autre étiquette — les deux répondent à deux questions)");
for (const [fmt, ls] of Object.entries(parFmt)) {
  const s = ls.reduce((t, l) => ({ bk: t.bk + l.m.bk, brk: t.brk + l.brickBk, tot: t.tot + l.tot }), { bk: 0, brk: 0, tot: 0 });
  console.log(`    ${String(fmt).padEnd(6)} vélo pur ${pct(s.bk, s.tot).toFixed(0)} % · dont brick ${pct(s.brk, s.tot).toFixed(0)} points en plus`);
}
