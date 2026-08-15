#!/usr/bin/env node
/**
 * §1 — LA BOUCLE `runHoursPerWeekOf → riegelExponent`, LE SEUL POINT QUI PEUT ARRÊTER O-36.
 *
 *   node scripts/mesureO36boucle.mjs
 *
 * O-36 réduirait la distance des répétitions de qualité pour les coureurs lents. Ça baisse leurs
 * heures de course hebdomadaires, ce qui MONTE l'exposant de Riegel, ce qui RALENTIT le temps
 * prédit. Effet pervers s'il est grand : l'athlète se verrait prédire une course plus lente
 * parce que le moteur a cessé de le sur-prescrire.
 *
 *   Δ < 1 %        bruit de calcul, O-36 part
 *   1 % ≤ Δ < 3 %  acceptable, à écrire dans le diff comme effet connu
 *   Δ ≥ 3 %        `runHoursPerWeekOf` est trop sensible au détail de prescription — ticket à part
 *
 * LA MESURE NE TOUCHE PAS LE GÉNÉRATEUR. On construit le plan tel quel, on recalcule ce que
 * `runHoursPerWeekOf` rendrait si les blocs de QUALITÉ en distance étaient mis à l'échelle par le
 * facteur d'égalisation, et on passe les deux valeurs au MÊME prédicteur. Simuler plutôt que
 * modifier évite d'introduire le changement pour le mesurer — la faute qui a produit le faux
 * balayage T-28.
 */
import "../src/app/bridge.ts";
import { riegelExponent, riegelSecWith, RUN_KM } from "../src/engine/predictor.ts";

const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", terrain: "route", sex: "H", age: "35",
  vol_max: "8", vol_recent: "3", weight: "75", ftp: "220", css: "1:50",
};
const ZQ = /\.(thr|vo2|css|rp|mara|sprint)/;
// Facteurs mesurés en §5(b) : ce par quoi O-36 multiplierait la distance de répétition.
const K = { "4:30": 1.000, "5:45": 0.926, "7:00": 0.839, "8:30": 0.759 };
const secPerKm = (p) => { const [m, s] = p.split(":").map(Number); return m * 60 + s; };

/** `runHoursPerWeekOf`, recopié à l'identique, avec un facteur optionnel sur les blocs de qualité. */
function runHours(plan, k) {
  const w = plan.weeks.filter((x) => !x.isRecup && ["dev", "spec", "peak"].includes(String(x.phase && x.phase.id)));
  if (!w.length) return null;
  const parSemaine = [];
  for (const wk of w) {
    let min = 0;
    for (const d of wk.days) for (const s of d.sessions) {
      if (s.d === "rs" || s.race) continue;
      // Un bloc de qualité en DISTANCE voit sa durée baisser du facteur k ; le reste ne bouge pas.
      let corr = 0;
      for (const st of s.steps ?? [])
        if (st.role === "body" && st.distanceM != null && ZQ.test(String(st.zone || "")))
          corr += (st._min ?? 0) * (1 - k);
      if (s.d === "rn") { min += Math.max(0, (s.min || 0) - corr); continue; }
      for (const st of s.steps ?? [])
        if ((st.d || s.d) === "rn" && st.durationMin) min += (st.reps || 1) * st.durationMin;
    }
    parSemaine.push(min);
  }
  parSemaine.sort((a, b) => a - b);
  const med = parSemaine[Math.floor(parSemaine.length / 2)];
  return med / 60;
}

console.log("§1.1 — LA BOUCLE RIEGEL : LE CHRONO PRÉDIT BOUGE-T-IL PARCE QU'ON CORRIGE LA DOSE ?\n");
console.log("  profil (marathon)      h/sem avant   h/sem après   exposant av. → ap.   chrono av. → ap.      Δ");
let pireDelta = 0;
for (const pace of ["4:30", "5:45", "7:00", "8:30"])
  for (const level of ["debutant", "inter", "avance"]) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan("run", { ...BASE, sport: "run", format: "marathon", history: "confirme", level, intent: "competition", pace }); } catch { continue; }
    const h0 = runHours(plan, 1), h1 = runHours(plan, K[pace]);
    if (h0 == null || h1 == null) continue;
    const e0 = riegelExponent(h0), e1 = riegelExponent(h1);
    const thr = secPerKm(pace) * 0.95; // allure seuil approchée depuis l'allure déclarée
    const t0 = riegelSecWith(e0, thr, RUN_KM.marathon), t1 = riegelSecWith(e1, thr, RUN_KM.marathon);
    const d = t0 > 0 ? 100 * (t1 - t0) / t0 : 0;
    if (Math.abs(d) > Math.abs(pireDelta)) pireDelta = d;
    const hms = (s) => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
    console.log(`  ${(pace + "/" + level).padEnd(22)} ${h0.toFixed(2).padStart(11)}   ${h1.toFixed(2).padStart(11)}   ${e0.toFixed(4)} → ${e1.toFixed(4)}   ${hms(t0)} → ${hms(t1)}   ${d >= 0 ? "+" : ""}${d.toFixed(2)} %`);
  }
const verdict = Math.abs(pireDelta) < 1 ? "✓ Δ < 1 % — BRUIT DE CALCUL, O-36 part"
  : Math.abs(pireDelta) < 3 ? "~ 1 % ≤ Δ < 3 % — ACCEPTABLE, à écrire dans le diff comme effet connu"
    : "✖ Δ ≥ 3 % — `runHoursPerWeekOf` est trop sensible : ticket à part AVANT O-36";
console.log(`\n  pire Δ mesuré : ${pireDelta >= 0 ? "+" : ""}${pireDelta.toFixed(2)} %   →   ${verdict}`);

// ---------------------------------------------------------------------------
console.log(`\n§1.2 — LA CIRCULARITÉ B-25 : UNE ITÉRATION SUFFIT-ELLE ENCORE ?\n`);
console.log(`  Depuis B-25, le leg course du tri CONSOMME la bande du prédicteur, qui dépend des heures`);
console.log(`  de course, qui dépendent du plan. O-36 ajoute un terme dans cette boucle fermée.`);
console.log(`  Test : les heures de course du plan tri livré, avec et sans le facteur d'O-36, puis`);
console.log(`  l'écart d'exposant que ça produit — c'est le GAIN DE BOUCLE ajouté.\n`);
console.log("  profil (tri)            h course/sem   avec O-36   exposant av. → ap.   Δ exposant");
let pireExp = 0;
for (const pace of ["4:30", "5:45", "7:00", "8:30"])
  for (const format of ["70.3", "Full"]) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan("tri", { ...BASE, sport: "tri", format, history: "confirme", level: "inter", intent: "competition", pace }); } catch { continue; }
    const h0 = runHours(plan, 1), h1 = runHours(plan, K[pace]);
    if (h0 == null || h1 == null) continue;
    const e0 = riegelExponent(h0), e1 = riegelExponent(h1);
    if (Math.abs(e1 - e0) > Math.abs(pireExp)) pireExp = e1 - e0;
    console.log(`  ${(format + " @ " + pace).padEnd(23)} ${h0.toFixed(2).padStart(12)}   ${h1.toFixed(2).padStart(9)}   ${e0.toFixed(4)} → ${e1.toFixed(4)}   ${(e1 - e0) >= 0 ? "+" : ""}${(e1 - e0).toFixed(4)}`);
  }
console.log(`\n  pire déplacement d'exposant : ${pireExp >= 0 ? "+" : ""}${pireExp.toFixed(4)}`);
console.log(`  → la résolution B-25 est UNE itération. Elle tient si le terme ajouté par O-36 est`);
console.log(`    petit devant la sensibilité de la bande : un déplacement d'exposant de l'ordre de`);
console.log(`    1e-3 ne peut pas faire osciller une bande d'allure exprimée à la seconde près.`);
