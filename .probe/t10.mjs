// O-77 par POSITION (règle 21) — la longue par semaine, vol_max 9 contre 13, même fixture.
import "../src/app/bridge.ts";
import { createRequire } from "node:module";
const { courseDans } = createRequire(import.meta.url)("../bench-dates.cjs");
const BASE = {
  intent: "competition", level: "inter", history: "ancien", dispo: "quotidienne", shift_ok: "non",
  doubles: "oui", off_days: "non", sex: "H", sleep: "moyen", life_load: "normale",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non",
  age: "30", weight: "85", height: "181", sessions_max: "8",
  race_date: courseDans(43), format: "70.3", terrain: "vallonne",
  ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:41", css_known: "oui", css: "2:15",
};
const longueParSemaine = (vm) => {
  const plan = globalThis.EBV2.buildPlan("tri", { ...BASE, vol_max: vm, vol_recent: "9" });
  const out = {};
  for (const w of plan.weeks) for (const d of w.days) for (const s of d.sessions)
    if (s.name === "Sortie longue CAP") out[w.num] = Math.round(s.min || 0);
  return out;
};
const a9 = longueParSemaine("9"), a13 = longueParSemaine("13");
let baisse = 0, hausse = 0, egal = 0; const ex = [];
for (const k of Object.keys(a9)) {
  if (a13[k] == null) continue;
  const d = a13[k] - a9[k];
  if (d < -5) { baisse++; if (ex.length < 6) ex.push(`S${k} : ${a9[k]} → ${a13[k]} (${d})`); }
  else if (d > 5) hausse++;
  else egal++;
}
console.log("semaines comparables :", baisse + hausse + egal, "· la longue BAISSE (>5 min) :", baisse, "· monte :", hausse, "· stable :", egal);
console.log(ex.join("\n"));

// CAUSE — semaine 1 : mêmes minutes (rampe vol_recent), plus de séances ?
for (const vm of ["9", "13"]) {
  const plan = globalThis.EBV2.buildPlan("tri", { ...BASE, vol_max: vm, vol_recent: "9" });
  const w = plan.weeks[0];
  const ss = w.days.flatMap((d) => d.sessions.filter((s) => s.d !== "rs"));
  const tot = ss.reduce((t, s) => t + (s.min || 0), 0);
  console.log("vol_max", vm, "S1 :", ss.length, "séances ·", tot, "min ·", ss.map((s) => s.name + " " + Math.round(s.min)).join(" · "));
}
