#!/usr/bin/env node
/**
 * §5 (O-36 RE-CADRÉ) — LES TROIS MESURES EXIGÉES AVANT D'ÉCRIRE LA DISTANCE ADAPTATIVE.
 *
 *   node scripts/mesureO36cible.mjs
 *
 * Le ticket a changé d'énoncé : ce n'est pas une conversion d'unité, c'est un mécanisme
 * d'adaptation SOUS-CALIBRÉ. Le moteur adapte déjà le NOMBRE de répétitions (3,84 → 3,01 entre
 * 4:30 et 8:30) mais pas leur LONGUEUR (~1 672 m partout), d'où un résidu de +50 % de temps de
 * travail chez le lent. La décision : rendre la distance par répétition dépendante de l'allure.
 *
 *   a) l'équivalent course de `metersOf` — quelle règle lit une distance de bloc en COURSE ?
 *   b) la plage des distances de répétition résultantes — reste-t-elle une prescription sensée ?
 *   c) C25 sur le profil lent — 43,3 min de travail, un plafond de dose aurait-il dû mordre ?
 */
import "../src/app/bridge.ts";
import { DOSE_CAP_MIN } from "../src/engine/constraintMatrix.ts";

const PACES = ["4:30", "5:45", "7:00", "8:30"];
const FMT = ["5k", "10k", "semi", "marathon"];
const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", terrain: "route", sex: "H", age: "35",
  vol_max: "8", vol_recent: "3", weight: "75",
};
const ZQ = /\.(thr|vo2|css|rp|mara|sprint)/;

// ---- (b) et (c) : on relit les blocs de qualité en distance, par allure -------------------
const secPerKm = (p) => { const [m, s] = p.split(":").map(Number); return m * 60 + s; };
const parAllure = {};
for (const pace of PACES) {
  const e = parAllure[pace] = { blocs: 0, minTot: 0, distances: [], doses: [], parZone: {} };
  for (const format of FMT) for (const history of H) for (const level of L) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan("run", { ...BASE, sport: "run", format, history, level, intent: "competition", pace }); } catch { continue; }
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      for (const st of s.steps ?? []) {
        if (st.role !== "body" || st.distanceM == null) continue;
        const z = String(st.zone || "");
        if (!ZQ.test(z)) continue;
        const dose = st._min ?? 0;
        e.blocs++; e.minTot += dose;
        e.distances.push(st.distanceM);
        e.doses.push({ dose, z, reps: st.reps || 1, dist: st.distanceM, nom: s.name });
        (e.parZone[z] ??= { n: 0, min: 0 }); e.parZone[z].n++; e.parZone[z].min += dose;
      }
  }
}

// La distance qui ÉGALISERAIT le temps de travail sur le profil de référence (le plus rapide).
const ref = parAllure[PACES[0]];
const moyRef = ref.blocs ? ref.minTot / ref.blocs : 0;

console.log("§5 (O-36 re-cadré) — LES TROIS MESURES\n");
console.log("(b) PLAGE DES DISTANCES DE RÉPÉTITION, ACTUELLE ET APRÈS ÉGALISATION\n");
console.log("  allure   blocs   dist. actuelle (min–méd–max)      dose moy   facteur d'égalisation   dist. médiane visée");
for (const p of PACES) {
  const e = parAllure[p];
  if (!e.blocs) continue;
  const ds = [...e.distances].sort((a, b) => a - b);
  const med = ds[Math.floor(ds.length / 2)];
  const moy = e.minTot / e.blocs;
  const k = moy > 0 ? moyRef / moy : 1; // ce par quoi il faudrait multiplier la distance
  console.log(`  ${p.padEnd(8)} ${String(e.blocs).padStart(5)}   ${String(ds[0]).padStart(5)} – ${String(med).padStart(5)} – ${String(ds[ds.length - 1]).padStart(5)} m`
    + `      ${moy.toFixed(1).padStart(5)} min   ×${k.toFixed(3)}                  ${Math.round(med * k)} m`);
}
const plusCourte = Math.min(...PACES.map((p) => {
  const e = parAllure[p]; if (!e.blocs) return Infinity;
  const k = moyRef / (e.minTot / e.blocs);
  return Math.min(...e.distances) * k;
}));
console.log(`\n  → la distance de répétition la PLUS COURTE que l'égalisation produirait : ${Math.round(plusCourte)} m`);
console.log(`     (seuil de bon sens évoqué : ~400 m pour une séance au seuil — un plancher sera nécessaire`);
console.log(`      si on descend en dessous, et il devra être un MAILLON DÉCLARÉ quand il mord.)`);

console.log(`\n(c) C25 / PLAFOND DE DOSE SUR LE PROFIL LENT\n`);
console.log(`  DOSE_CAP_MIN (plafond de dose par bloc de qualité, minutes dans la zone) :`);
for (const [z, v] of Object.entries(DOSE_CAP_MIN)) console.log(`     ${z.padEnd(10)} ${v} min`);
for (const p of [PACES[0], PACES[PACES.length - 1]]) {
  const e = parAllure[p];
  console.log(`\n  allure ${p} — dose par zone (moyenne sur les blocs de cette zone) :`);
  for (const [z, v] of Object.entries(e.parZone).sort()) {
    // `DOSE_CAP_MIN` est clé par le SUFFIXE de zone (`thr`, `vo2`), pas par la clé complète
    // (`rn.thr`). Ma première écriture lisait `DOSE_CAP_MIN[z]` et affichait « aucun plafond
    // déclaré » sur des zones QUI EN ONT UN — douzième occurrence de la famille, attrapée avant
    // publication parce que le chiffre contredisait la table imprimée deux lignes plus haut.
    const cap = DOSE_CAP_MIN[String(z).split(".").pop()];
    console.log(`     ${z.padEnd(10)} ${String(v.n).padStart(4)} blocs · ${(v.min / v.n).toFixed(1).padStart(5)} min/bloc`
      + (cap ? `   (plafond ${cap} min — ${(v.min / v.n) > cap ? "⚠ DÉPASSÉ EN MOYENNE" : "respecté"})` : "   (aucun plafond déclaré pour cette zone)"));
  }
}
console.log(`\n  → la dose de 43,3 min du profil lent est une MOYENNE sur toutes les zones de qualité :`);
console.log(`     ce n'est pas 43 min de seuil dans un seul bloc. Le plafond de dose se lit PAR BLOC`);
console.log(`     et PAR ZONE — c'est pour ça qu'il ne mord pas là où on l'attendait.`);
