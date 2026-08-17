#!/usr/bin/env node
/**
 * §5 — CE QUI EST CALIBRÉ EN SUPPOSANT UNE PRESCRIPTION EN DISTANCE (avant d'écrire O-36).
 *
 *   node scripts/mesureO36amont.mjs
 *
 * O-36 convertirait les blocs prescrits en DISTANCE (`distanceM`) vers du TEMPS. Le fondateur
 * demande de balayer ce que cette conversion déplacerait — « la conversion change la base de
 * calibrage de tout ce qui en dépend ».
 *
 * Ce balayage répond à ses trois points, et il OBSERVE au lieu de modéliser (la leçon de T-28) :
 * il construit les plans, compte les blocs réellement prescrits en distance, et liste les bornes
 * qui les gouvernent AUJOURD'HUI — celles qui cesseraient de s'appliquer, et celles qui
 * s'appliqueraient pour la première fois.
 */
import "../src/app/bridge.ts";

const SP = {
  run: ["5k", "10k", "semi", "marathon"], tri: ["S", "M", "70.3", "Full"],
  bike: ["crit", "route", "clm", "cyclo", "gravel"], swim: ["sprint", "demifond", "fond", "ow"],
  duathlon: ["S", "M", "L", "PM"], trail: ["trail"], swimrun: ["experience", "sprint", "series", "championship"],
};
const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"], I = ["finir", "plaisir", "competition"];
const PACES = ["4:30", "5:45", "7:00", "8:30"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", terrain: "route",
  sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220", css: "1:50",
  race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique", race_night: "partielle",
  train_dplus_access: "collines", treadmill: "non", poles: "a_decider", vam_known: "oui", vam: "850",
  swim_total_m: "7850", run_total_km: "33", segments_n: "20", longest_swim_m: "1400",
  water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
};

const parDisc = {}, bndFloors = {}, sansBnd = {};
let blocsDist = 0, blocsTemps = 0, seancesNage = 0, seancesNageAvecM = 0;

for (const [sport, fmts] of Object.entries(SP))
  for (const format of fmts) for (const history of H) for (const level of L) for (const intent of I)
    for (const pace of (sport === "run" || sport === "trail" ? PACES : ["5:00"])) {
      let plan;
      try { plan = globalThis.EBV2.buildPlan(sport, { ...BASE, sport, format, history, level, intent, pace }); } catch { continue; }
      for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
        if (s.d === "sw") { seancesNage++; if ((s.steps || []).some((st) => st.distanceM != null)) seancesNageAvecM++; }
        for (const st of s.steps ?? []) {
          if (st.role !== "body") continue;
          if (st.distanceM == null) { blocsTemps++; continue; }
          blocsDist++;
          const disc = String(st.d || s.d);
          parDisc[disc] = (parDisc[disc] || 0) + 1;
          if (st.bnd) {
            const cle = `${disc} · reps ${(st.reps || 1) > 1 ? ">1" : "=1"}`;
            (bndFloors[cle] ??= { n: 0, floors: new Set(), caps: new Set() });
            bndFloors[cle].n++;
            bndFloors[cle].floors.add(st.bnd.floor);
            bndFloors[cle].caps.add(st.bnd.cap);
          } else sansBnd[disc] = (sansBnd[disc] || 0) + 1;
        }
      }
    }

console.log("§5.3 — CE QUE LA CONVERSION DISTANCE → TEMPS DÉPLACERAIT\n");
console.log(`  blocs de corps prescrits en DISTANCE : ${blocsDist}   ·   en TEMPS : ${blocsTemps}`);
console.log(`  répartition des blocs en distance : ` + Object.entries(parDisc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));

console.log(`\n  ⚠ LES BORNES DE CES BLOCS SONT EN MÈTRES — les convertir sans elles est une faute d'unité :`);
console.log("     cas                    blocs   planchers (m)                  plafonds (m)");
for (const [cle, e] of Object.entries(bndFloors).sort()) {
  const f = [...e.floors].sort((a, b) => a - b), c = [...e.caps].sort((a, b) => a - b);
  console.log(`     ${cle.padEnd(22)} ${String(e.n).padStart(5)}   ${(f.slice(0, 4).join(", ") + (f.length > 4 ? "…" : "")).padEnd(30)} ${c.slice(0, 4).join(", ")}${c.length > 4 ? "…" : ""}`);
}
if (Object.keys(sansBnd).length) console.log(`     (sans bnd : ` + Object.entries(sansBnd).map(([k, v]) => `${k} ${v}`).join(" · ") + ")");

console.log(`\n  ⚠ LES PLANCHERS DE SÉANCE NAGE (C24/C24b) SE MESURENT EN MÈTRES, SUR LA SÉANCE :`);
console.log(`     séances de nage : ${seancesNage} · dont portant au moins un bloc en distance : ${seancesNageAvecM}`);
console.log(`     `+`si les blocs passent au temps, \`metersOf(sx)\` rend 0 et la passe C24/C24b sort par`);
console.log(`     son \`if (tot <= 0) continue\` — un plancher de SÉCURITÉ cesserait de s'appliquer EN SILENCE.`);

console.log(`\n  RÉPONSES AUX TROIS POINTS DU §5 :`);
console.log(`  1. \`enforceLabelVsDose\` n'a AUCUNE cible de dose : ses deux cibles sont des PLAFONDS`);
console.log(`     (C25_RECOVERY_SESSION_CAP_MIN, absolu · \`lg.min\`, relatif à la longue livrée).`);
console.log(`  2. NON — elle ne peut pas rallonger : ses 5 mutations de dose sont toutes gardées par`);
console.log(`     \`if (next < courant)\`. Le scénario « il la juge sous-dosée et l'étend » n'existe pas.`);
console.log(`  3. Le vrai risque est AILLEURS et il est ci-dessus : les bornes en MÈTRES.`);

// ---------------------------------------------------------------------------
// §2.5 — LA QUEUE PAR TRANCHE D'ALLURE. « Si le mouvement ne se concentre pas sur les allures
// lentes, mon argument d'O-36 est faux et l'arbitrage est à refaire. » (fondateur, 15/08)
//
// On mesure la DOSE RÉELLE (minutes dans la zone) des blocs de COURSE prescrits en distance,
// tranche d'allure par tranche d'allure. Si la même prescription coûte deux fois plus de temps
// au coureur lent, le mouvement se concentre bien sur lui.
const ZQ = /\.(thr|vo2|css|rp|mara|sprint)/;
const parAllure = {};
for (const pace of PACES) {
  const e = parAllure[pace] = { blocs: 0, minTot: 0, pire: 0, exemple: "" };
  for (const format of SP.run) for (const history of H) for (const level of L) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan("run", { ...BASE, sport: "run", format, history, level, intent: "competition", pace }); } catch { continue; }
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      for (const st of s.steps ?? []) {
        if (st.role !== "body" || st.distanceM == null) continue;
        if (!ZQ.test(String(st.zone || ""))) continue;
        // la dose en temps = ce que le moteur a déjà calculé pour cette prescription
        const min = st._min ?? 0;
        e.blocs++; e.minTot += min;
        if (min > e.pire) { e.pire = min; e.exemple = `${s.name} — ${st.reps || 1}×${st.distanceM} m`; }
      }
  }
}
console.log(`\n§2.5 — DOSE DES BLOCS DE QUALITÉ PRESCRITS EN DISTANCE, PAR TRANCHE D'ALLURE (course)\n`);
console.log("  allure   blocs   dose moyenne   dose max   exemple du pire");
const ref = parAllure[PACES[0]];
for (const p of PACES) {
  const e = parAllure[p];
  const moy = e.blocs ? e.minTot / e.blocs : 0;
  const moyRef = ref.blocs ? ref.minTot / ref.blocs : 0;
  console.log(`  ${p.padEnd(8)} ${String(e.blocs).padStart(5)}   ${moy.toFixed(1).padStart(8)} min`
    + `   ${e.pire.toFixed(0).padStart(6)} min   ${e.exemple}`
    + (p !== PACES[0] && moyRef ? `   (×${(moy / moyRef).toFixed(2)} vs ${PACES[0]})` : ""));
}
const m0 = ref.blocs ? ref.minTot / ref.blocs : 0;
const mL = parAllure[PACES[PACES.length - 1]];
const mLv = mL.blocs ? mL.minTot / mL.blocs : 0;
console.log(`\n  → le coureur le plus lent reçoit ×${m0 ? (mLv / m0).toFixed(2) : "?"} la dose du plus rapide`);
console.log(`     pour la MÊME prescription. C'est la thèse d'O-36 : si ce rapport vaut ~1, elle tombe.`);
