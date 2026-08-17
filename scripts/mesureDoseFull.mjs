#!/usr/bin/env node
/**
 * §4b (arbitrage Q1 re-tranchée) — LE PLAFOND DE DOSE APLATIT-IL LA PROGRESSION DE LA NAGE SEUIL ?
 *
 *   node scripts/mesureDoseFull.mjs
 *
 * Le fondateur : *« si la nage seuil est à 40 min dès qu'elle touche la borne, elle ne monte plus
 * de la base au pic. Un athlète devrait voir sa dose de seuil progresser sur une préparation de
 * neuf mois ; là elle est constante. »* La question à mesurer AVANT de trancher : **combien de
 * semaines de la prépa Full sont à la borne, et à partir de laquelle.**
 *
 * On lit la SORTIE LIVRÉE (règle 15), semaine par semaine : la dose de travail au seuil de la
 * séance de nage seuil, en minutes — l'unité dans laquelle le plafond agit (règle 14).
 */
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { DOSE_CAP_MIN, parsePaceSec } from "../src/engine/constraintMatrix.ts";
import { stepWorkMin } from "../src/generator/renderer.ts";

const CAP = DOSE_CAP_MIN.thr;
const lignes = [], resume = [];
for (const { key, sport, a } of goldenProfiles()) {
  if (sport !== "tri" || !["Full", "70.3"].includes(String(a.format))) continue;
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const refs = { css: parsePaceSec(String(a.css ?? ""), "swim") || 130, thrPace: parsePaceSec(String(a.pace ?? "")) || 330 };
  const serie = [];
  for (const w of p.weeks ?? []) {
    let dose = 0;
    for (const d of w.days ?? []) for (const s of d.sessions ?? []) for (const st of s.steps ?? []) {
      if (st.role !== "body" || !/\.css$/.test(String(st.zone || ""))) continue;
      dose = Math.max(dose, stepWorkMin(st, st.d || s.d, refs));
    }
    if (dose > 0) serie.push({ num: w.num, phase: w.phase.id, dose });
  }
  if (serie.length < 4) continue;
  const bord = serie.filter((x) => x.dose >= CAP - 0.6);
  if (!bord.length) continue;
  const premier = bord[0];
  const avant = serie.filter((x) => x.num < premier.num);
  lignes.push({
    key, format: String(a.format), n: serie.length, nBord: bord.length,
    part: bord.length / serie.length, premiere: premier.num, phase: premier.phase,
    doseAvant: avant.length ? avant[0].dose : premier.dose,
    doseFin: serie[serie.length - 1].dose,
  });
}

console.log("§4b — LA DOSE DE SEUIL EN NAGE PROGRESSE-T-ELLE, OU EST-ELLE PLATE À LA BORNE ?\n");
console.log(`  plafond mesuré : ${CAP} min de travail au seuil par bloc\n`);
if (!lignes.length) { console.log("  AUCUN profil à la borne — l'instrument ne mesure rien, le vérifier."); process.exit(0); }

const parFormat = {};
for (const l of lignes) (parFormat[l.format] = parFormat[l.format] || []).push(l);
for (const [f, ls] of Object.entries(parFormat)) {
  const part = ls.reduce((t, x) => t + x.part, 0) / ls.length;
  const prem = ls.map((x) => x.premiere).sort((x, y) => x - y);
  const phases = {};
  for (const x of ls) phases[x.phase] = (phases[x.phase] || 0) + 1;
  console.log(`  ${f} — ${ls.length} profils`);
  console.log(`     semaines à la borne : ${(100 * part).toFixed(0)} % des semaines qui portent du seuil`);
  console.log(`     première semaine à la borne : médiane S${prem[Math.floor(prem.length / 2)]} · min S${prem[0]} · max S${prem[prem.length - 1]}`);
  console.log(`     phase de la première : ${JSON.stringify(phases)}`);
  const e = ls[0];
  console.log(`     exemple ${e.key} : ${e.n} semaines de seuil, ${e.nBord} à la borne, dose ${e.doseAvant.toFixed(1)} → ${e.doseFin.toFixed(1)} min`);
}

const totBord = lignes.reduce((t, x) => t + x.nBord, 0), totSem = lignes.reduce((t, x) => t + x.n, 0);
console.log(`\n  → ${totBord} semaines à la borne sur ${totSem} qui portent du seuil (${(100 * totBord / totSem).toFixed(0)} %),`);
console.log(`    sur ${lignes.length} profils. La progression est PLATE sur cette fraction : c'est la grandeur`);
console.log(`    que le ticket du §4b demande de trancher — un plafond ABSOLU là où la progression demande une montée.`);
