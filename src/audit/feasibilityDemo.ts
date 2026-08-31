/**
 * Spec exécutable du raisonnement inverse — npm run demo:faisabilite.
 *
 * LA GARDE QUI PORTE TOUT LE RESTE : `RV-INVARIANT`. Le chrono visé n'entre que dans un
 * VERDICT ; il ne doit modifier AUCUNE minute du plan. Tout R14/R14.1 existe pour que la
 * performance soit une sortie estimée et jamais une cible qui construit (P6 : « le temps se
 * projette, l'intensité s'ancre »). Laisser un objectif de temps lever un plafond, ce serait la
 * priorité n°5 du manifeste qui écrase les quatre premières.
 *
 * Les autres critères vérifient que le verdict DISCRIMINE — un module qui répondrait toujours
 * la même chose ne vaudrait rien — et qu'il ne prétend jamais plus que ce que ses sources
 * mesurent.
 */
import { assessFeasibility, requiredThresholdPace, timeFromThresholdPace, RUN_DIST_KM } from "../engine/feasibility.ts";
import { riegelExponent } from "../engine/predictor.ts";

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

const P = (s: string): number => { const [m, x] = s.split(":").map(Number); return m * 60 + (x || 0); };
const base = { thrPaceSecPerKm: P("5:00"), runHoursPerWeek: 5, prescribedMeanH: 6, weightKg: 72, sex: "H", age: 38, history: "confirme" };

// — 1. L'inversion de Riegel est EXACTE (aller-retour), pas approchée.
for (const [fmt, dist] of Object.entries(RUN_DIST_KM)) {
  const expo = riegelExponent(5);
  const t = timeFromThresholdPace(P("5:00"), dist, expo);
  const back = requiredThresholdPace(t, dist, expo);
  check("Riegel inversé sur " + fmt + " : aller-retour exact", back != null && Math.abs(back - P("5:00")) < 0.01,
    back == null ? "null" : "écart " + (back - P("5:00")).toFixed(4) + " s/km");
}

// — 2. Le verdict DISCRIMINE : les cinq états existent sur des profils réalistes.
const vus = new Set<string>();
const cas: [string, Parameters<typeof assessFeasibility>[0]][] = [
  ["déjà tenu", { ...base, format: "marathon", targetSec: 4 * 3600 + 30 * 60, horizonWeeks: 16 }],
  ["atteignable", { ...base, format: "semi", targetSec: 2 * 3600, thrPaceSecPerKm: P("5:30"), horizonWeeks: 20, sex: "F", age: 45, weightKg: 60, runHoursPerWeek: 4, prescribedMeanH: 5 }],
  ["juste", { ...base, format: "marathon", targetSec: 3 * 3600 + 45 * 60, horizonWeeks: 16 }],
  ["hors-horizon", { ...base, format: "10k", targetSec: 43 * 60, thrPaceSecPerKm: P("4:45"), horizonWeeks: 12, runHoursPerWeek: 4, prescribedMeanH: 5, weightKg: 70, age: 30 }],
  ["hors-modele", { ...base, format: "marathon", targetSec: 3 * 3600 + 30 * 60, horizonWeeks: 16 }],
];
for (const [attendu, input] of cas) {
  const r = assessFeasibility(input);
  vus.add(r.verdict);
  const ok = attendu === "déjà tenu" ? r.verdict === "atteignable" && r.weeksNeeded === 0 : r.verdict === attendu;
  check("Verdict « " + attendu + " » : obtenu « " + r.verdict + " »", ok);
  check("  … et il est MOTIVÉ (décisions RV tracées)", r.decisions.length >= 3 && r.decisions.every((d) => d.id.startsWith("RV") && d.why.length > 20));
}
check("Le verdict discrimine : au moins 4 états distincts sur 5 profils", vus.size >= 4, [...vus].join(", "));

// — 3. « hors-modele » ne dit JAMAIS « impossible ».
// Ma première écriture lisait G_PLAFOND (gain d'UN cycle, Barnes & Kilding 2015) comme un
// plafond de CARRIÈRE, et sortait « quelle que soit la durée de préparation » sur un marathon
// 4h01 → 3h30 en 16 semaines — un objectif que des milliers de coureurs atteignent. Un verdict
// faux dans ce sens décourage quelqu'un dont l'objectif tient debout.
{
  const r = assessFeasibility({ ...base, format: "marathon", targetSec: 3 * 3600 + 30 * 60, horizonWeeks: 16 });
  const h = r.human.toLowerCase();
  check("« hors-modele » ne prétend jamais à l'impossibilité", !/impossible|hors d'atteinte quelle|quelle que soit la durée/.test(h) && /plusieurs saisons/.test(h), r.human.slice(0, 90));
  check("« hors-modele » propose quand même un chrono défendable", r.reachableSec != null && r.reachableSec > 0);
}

// — 4. Monotonie : plus d'horizon ne rend jamais un objectif MOINS accessible.
{
  let pire = false, prev = -1;
  for (const w of [4, 8, 12, 16, 24, 32, 52]) {
    const r = assessFeasibility({ ...base, format: "marathon", targetSec: 3 * 3600 + 40 * 60, horizonWeeks: w });
    if (r.gainAvailable != null) { if (r.gainAvailable < prev - 1e-9) pire = true; prev = r.gainAvailable; }
  }
  check("Monotonie : allonger l'horizon n'abaisse jamais le gain disponible", !pire);
}

// — 5. Refus honnête plutôt qu'estimation inventée.
check("Sans allure mesurée → aucun verdict (on n'invente pas)", assessFeasibility({ ...base, format: "10k", targetSec: 2400, thrPaceSecPerKm: 0, horizonWeeks: 12 }).verdict === "indeterminable");
check("Format inconnu → aucun verdict", assessFeasibility({ ...base, format: "ultra", targetSec: 2400, horizonWeeks: 12 }).verdict === "indeterminable");

// — 6. RV-INVARIANT — LE CHRONO VISÉ NE TOUCHE PAS LE PLAN.
// C'est la propriété qui autorise ce module à exister. Elle se vérifie sur le générateur
// lui-même : deux plans, l'un avec objectif de temps et l'autre sans, doivent être identiques
// au bit près. Si un jour quelqu'un câble le chrono dans la construction, ce critère tombe.
{
  const { generatePlan } = await import("../generator/planGenerator.ts");
  const profil = {
    sport: "run", format: "marathon", level: "inter", history: "confirme", intent: "competition",
    vol_max: "8", vol_recent: "5", sessions_max: "5", dispo: "partielle", age: "38", sex: "H",
    weight: "72", height: "178", injury: "aucune", off_days: "non", doubles: "non",
    sleep: "moyen", life_load: "normale", activity: "actif", med_pain: "non", med_dizzy: "non",
    med_treat: "non", terrain: "plat", pace: "5:00", pace_known: "oui",
  } as unknown as Parameters<typeof generatePlan>[0];
  const sans = JSON.stringify(generatePlan(profil).plan);
  const avec = JSON.stringify(generatePlan({ ...profil, target_time: "3:30:00", target_time_sec: 12600 } as never).plan);
  check("RV-INVARIANT : le plan est IDENTIQUE avec et sans chrono visé", sans === avec,
    sans === avec ? "" : "le chrono visé a modifié le plan — la frontière est franchie");
}

if (failures) {
  console.error("\nDémo faisabilité : " + failures + " garantie(s) en échec.");
  process.exit(1);
}
console.log("\nDémo faisabilité : le verdict discrimine, il ne prétend jamais plus que ses sources, et le chrono visé ne touche pas le plan.");
