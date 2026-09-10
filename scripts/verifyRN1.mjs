// Bloc `verify` de RN1 (BUGS_OUVERTS.md) — la dose d'entretien seuil course n'existe QUE pour
// les profils tri en intent="competition" ("marges resserrées"), à basse fréquence en spec/peak
// jamais en dev/base/taper, et reste soumise à `dailyAdjuster` comme toute autre séance dure.
import { generatePlan } from "../src/generator/planGenerator.ts";
import { adjustDay } from "../src/readiness/dailyAdjuster.ts";

const base = { sport: "tri", format: "70.3", history: "confirme", level: "inter", vol_max: "12", vol_recent: "8",
  sessions_max: "10", dispo: "quotidienne", doubles: "non", weight: "72", height: "178", sex: "H",
  age: "35", off_days: "non" };

function compte(profile) {
  const { plan } = generatePlan(profile);
  let devWith = 0, devTotal = 0, specPeakWith = 0, specPeakTotal = 0, taperWith = 0, taperTotal = 0;
  for (const wk of plan.weeks) {
    if (wk.isRecup) continue;
    const has = wk.days.some((d) => d.sessions.some((s) => s.d === "rn" && s.name === "Seuil course (entretien)"));
    if (wk.phase.id === "dev") { devTotal++; if (has) devWith++; }
    else if (wk.phase.id === "spec" || wk.phase.id === "peak") { specPeakTotal++; if (has) specPeakWith++; }
    else if (wk.phase.id === "taper") { taperTotal++; if (has) taperWith++; }
  }
  return { devWith, devTotal, specPeakWith, specPeakTotal, taperWith, taperTotal };
}

const competition = compte({ ...base, intent: "competition" });
const finir = compte({ ...base, intent: "finir" });

const okDomaine =
  finir.specPeakWith === 0 && finir.devWith === 0 && finir.taperWith === 0 && // jamais hors "competition"
  competition.devWith === 0 && competition.taperWith === 0 &&                // jamais en dev/taper même en competition
  competition.specPeakWith > 0;                                              // mais présent en spec/peak

console.log("intent=competition:", JSON.stringify(competition));
console.log("intent=finir:      ", JSON.stringify(finir));
console.log(okDomaine ? "RN1 DOMAINE VERT" : "RN1 DOMAINE ROUGE");

// --- couplage readiness : la dose est réduite/remplacée comme toute autre séance dure ---
const { plan, reasoned } = generatePlan({ ...base, intent: "competition" });
let doseDay = null, doseWeek = null;
outer: for (const wk of plan.weeks) {
  if (wk.isRecup || (wk.phase.id !== "spec" && wk.phase.id !== "peak")) continue;
  for (const d of wk.days) {
    if (d.sessions.some((s) => s.d === "rn" && s.name === "Seuil course (entretien)")) { doseDay = d; doseWeek = wk; break outer; }
  }
}
let okReadiness = false, avant = null, apres = null;
if (doseDay) {
  avant = doseDay.sessions.find((s) => s.name === "Seuil course (entretien)").min;
  const snapshotOrange = { date: doseDay.date, sleepQuality: "moyen", energy: 55, hrvStatus: "normale", completed: [] };
  const adj = adjustDay(reasoned, plan, doseDay.date, snapshotOrange);
  apres = doseDay.sessions.reduce((t, s) => t + (s.min || 0), 0);
  okReadiness = adj.action !== "keep" && apres < avant;
}
console.log("séance avant:", avant, "min · verdict readiness moyen appliqué, minutes après:", apres);
console.log(okReadiness ? "RN1 COUPLAGE READINESS VERT" : "RN1 COUPLAGE READINESS ROUGE (aucun jour candidat trouvé ou pas de réduction)");

process.exit(okDomaine && okReadiness ? 0 : 1);
