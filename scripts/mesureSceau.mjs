#!/usr/bin/env node
/**
 * T-27 — LE RANG DE CHAQUE INVARIANT DU SCEAU EST MESURÉ, PAS SUPPOSÉ (règle 7).
 *
 *   node scripts/mesureSceau.mjs
 *
 * Un invariant qu'on rend bloquant sans avoir trié ses échecs FIGE la dette au lieu de la
 * traiter — c'est la leçon de R20.6, payée sur le banc d'invariants qui sortait en code 0 quoi
 * qu'il trouve. On balaie donc les profils AVANT de décider qui lève et qui se contente d'être
 * compté.
 *
 * Le sceau est appelé en mode `strict: false` ici : on veut le COMPTE, pas la première levée.
 */
import "../src/app/bridge.ts";
import { sealPlan } from "../src/generator/seal.ts";

const SPORTS = {
  run: ["5k", "10k", "semi", "marathon"], tri: ["S", "M", "70.3", "Full"],
  bike: ["crit", "route", "clm", "cyclo", "gravel"], swim: ["sprint", "demifond", "fond", "ow"],
  duathlon: ["S", "M", "L", "PM"], trail: ["trail"], swimrun: ["experience", "sprint", "series", "championship"],
};
const HIST = ["reprise", "confirme", "ancien"], LVL = ["debutant", "inter", "avance"], INT = ["finir", "plaisir", "competition"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", pace: "5:00", terrain: "route",
  sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220", css: "1:50",
  race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique", race_night: "partielle",
  train_dplus_access: "collines", treadmill: "non", poles: "a_decider", vam_known: "oui", vam: "850",
  swim_total_m: "7850", run_total_km: "33", segments_n: "20", longest_swim_m: "1400",
  water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
};

const compte = new Map(); // id → { profils, violations, quoi, rang }
let n = 0, refus = 0;

for (const [sport, fmts] of Object.entries(SPORTS))
  for (const format of fmts) for (const history of HIST) for (const level of LVL) for (const intent of INT) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan(sport, { ...BASE, sport, format, history, level, intent }); }
    catch { refus++; continue; }
    n++;
    const r = sealPlan(plan, { format, strict: false });
    for (const v of r.verdicts) {
      const c = compte.get(v.id) ?? { profils: 0, violations: 0, quoi: v.quoi, rang: v.rang, ex: [] };
      if (v.violations.length) {
        c.profils++; c.violations += v.violations.length;
        if (c.ex.length < 3) c.ex.push(`${sport}/${format}/${history}/${level}/${intent} — ${v.violations[0]}`);
      }
      compte.set(v.id, c);
    }
  }

console.log(`T-27 — RANG DES INVARIANTS DU SCEAU, mesuré sur ${n} profils construits (${refus} refus d'entrée)\n`);
console.log("  id   profils  violations  rang proposé   invariant");
for (const [id, c] of [...compte].sort()) {
  const rang = c.profils === 0 ? "DUR" : "déclaré";
  const marque = rang.toLowerCase().startsWith(c.rang.slice(0, 3)) ? " " : "≠";
  console.log(`  ${id}  ${String(c.profils).padStart(7)}  ${String(c.violations).padStart(10)}  ${rang.padEnd(9)} ${marque}   ${c.quoi}`);
}
console.log("\n  « ≠ » = le rang écrit dans seal.ts ne correspond pas à la mesure — corriger l'un des deux.\n");
for (const [id, c] of [...compte].sort()) if (c.ex.length) {
  console.log(`  ${id} — exemples :`);
  for (const e of c.ex) console.log("     " + e);
}
