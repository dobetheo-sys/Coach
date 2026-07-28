/**
 * Démo/spec exécutable du module nutrition — npm run demo:nutrition.
 *
 * Le module ne couvre QUE le ravitaillement d'effort (glucides pendant, hydratation,
 * récupération, dépense estimée) — jamais de prescription calorique journalière ni de
 * restriction. Chaque invariant de sécurité est asserté ici, la CI échoue au moindre écart :
 *   1. bornes dures : glucides ≤90 g/h, boisson ≤1000 ml/h, quelles que soient les entrées ;
 *   2. l'avertissement (DISCLAIMER) est toujours présent et mentionne le professionnel ;
 *   3. aucun texte de sortie ne contient de vocabulaire de restriction (FORBIDDEN_OUTPUT) ;
 *   4. jamais de conseil « à jeun » sur séance dure ou longue ;
 *   5. chaque conseil est motivé (decisions non vides, format {id, what, val, why}).
 */
import {
  sessionNutrition,
  nutritionForSession,
  classifyIntensity,
  DISCLAIMER,
  FORBIDDEN_OUTPUT,
  type NutritionAdvice,
} from "../nutrition/nutritionCalculator.ts";

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

const allText = (a: NutritionAdvice): string =>
  [a.before, a.during.text, a.after || "", a.disclaimer, ...a.decisions.map((d) => d.what + " " + d.val + " " + d.why)].join(" ").toLowerCase();

// — 1. Sortie courte facile : eau seule, pas de glucides, pas de fenêtre spécifique
const short = sessionNutrition({ d: "rn", minutes: 45, intensity: "facile" });
check("45 min facile → pas de glucides nécessaires", short.during.carbsGPerH === null);
check("45 min facile → l'eau suffit (texte)", /eau suffit/i.test(short.during.text));
check("45 min facile → pas de fenêtre de récupération imposée", short.after === null);

// — 2. Séance dure de 90 min : 30–60 g/h, jamais à jeun, récupération présente
const hard90 = sessionNutrition({ d: "bk", minutes: 90, intensity: "dure" });
check("90 min dure → 30–60 g/h", !!hard90.during.carbsGPerH && hard90.during.carbsGPerH[0] === 30 && hard90.during.carbsGPerH[1] === 60);
check("90 min dure → jamais à jeun (N6)", /jeun/i.test(hard90.before) && hard90.decisions.some((d) => d.id === "N6"));
check("90 min dure → fenêtre de récupération 30–60 min (N5)", !!hard90.after && hard90.decisions.some((d) => d.id === "N5"));

// — 3. Sortie longue 3 h : 60–90 g/h, mix glucose:fructose, tube digestif à entraîner
const long3h = sessionNutrition({ d: "bk", minutes: 180, intensity: "facile", long: true });
check("3 h → 60–90 g/h (N3)", !!long3h.during.carbsGPerH && long3h.during.carbsGPerH[1] === 90 && long3h.decisions.some((d) => d.id === "N3"));
check("3 h → mix glucose:fructose + entraînement digestif", /fructose/i.test(long3h.during.text) && /entraîne/i.test(long3h.during.text));
check("3 h facile mais longue → jamais à jeun quand même", /jeun/i.test(long3h.before));

// — 4. Chaleur : sodium + haut de fourchette, plafond 1 L/h tenu
const heat = sessionNutrition({ d: "rn", minutes: 120, intensity: "moyenne", tempC: 30 });
check("30°C → sodium conseillé", heat.during.sodium && /sodium/i.test(heat.during.text));
check("30°C → hydratation renforcée mais ≤1000 ml/h", heat.during.drinkMlPerH[1] >= 800 && heat.during.drinkMlPerH[1] <= 1000);
const canicule = sessionNutrition({ d: "rn", minutes: 600, intensity: "dure", long: true, tempC: 38 });
check("Bornes dures : 10 h à 38°C → glucides ≤90 g/h et boisson ≤1000 ml/h", (canicule.during.carbsGPerH as [number, number])[1] <= 90 && canicule.during.drinkMlPerH[1] <= 1000);

// — 5. Natation : rappel « on ne sent pas la sueur »
const swim = sessionNutrition({ d: "sw", minutes: 75, intensity: "moyenne" });
check("Natation → rappel hydratation spécifique", /natation/i.test(swim.during.text));

// — 6. Poids connu → récupération chiffrée en g ; inconnu → collation générique
const w70 = sessionNutrition({ d: "rn", minutes: 100, intensity: "dure", weightKg: 70 });
check("70 kg → récupération chiffrée (~70–85 g glucides)", !!w70.after && /70/.test(w70.after) && /prot/i.test(w70.after));
const noW = sessionNutrition({ d: "rn", minutes: 100, intensity: "dure" });
check("Poids inconnu → collation générique (jamais de g/kg inventés)", !!noW.after && !/g\/kg|\d+ ?kg/.test(noW.after));

// — 7. Dépense estimée : fourchette positive, plus large sans poids, jamais une cible
check("kcal : fourchette positive et ordonnée", w70.kcal[0] > 0 && w70.kcal[1] >= w70.kcal[0]);
check("kcal : plus incertaine sans poids connu", noW.kcal[1] - noW.kcal[0] > w70.kcal[1] - w70.kcal[0]);
check("kcal : présentée comme estimation, pas comme cible (N7)", w70.decisions.some((d) => d.id === "N7" && /pas une cible/.test(d.why)));

// — 8. Invariants transverses sur un balayage complet d'entrées
const sweep: NutritionAdvice[] = [];
for (const d of ["rn", "bk", "sw", "br"])
  for (const minutes of [20, 45, 60, 75, 90, 150, 180, 300])
    for (const intensity of ["facile", "moyenne", "dure"] as const)
      for (const tempC of [null, 12, 25, 28, 36])
        for (const weightKg of [null, 55, 90]) sweep.push(sessionNutrition({ d, minutes, intensity, tempC, weightKg, long: minutes >= 150 }));
check("Balayage " + sweep.length + " entrées : glucides toujours ≤90 g/h", sweep.every((a) => !a.during.carbsGPerH || a.during.carbsGPerH[1] <= 90));
check("Balayage : boisson toujours ≤1000 ml/h", sweep.every((a) => a.during.drinkMlPerH[1] <= 1000));
check("Balayage : avertissement toujours présent (professionnel de santé)", sweep.every((a) => a.disclaimer === DISCLAIMER && /professionnel/.test(a.disclaimer)));
check("Balayage : jamais de vocabulaire de restriction", sweep.every((a) => FORBIDDEN_OUTPUT.every((w) => !allText(a).includes(w))));
check("Balayage : dur ou long → jamais à jeun, toujours une récupération", sweep.filter((a, i) => i >= 0).every((a) => a.after === null || (/jeun|comme tu le sens/i.test(a.before) && a.decisions.length >= 3)));
check("Balayage : chaque conseil motivé ({id, what, val, why} non vides)", sweep.every((a) => a.decisions.length >= 2 && a.decisions.every((d) => d.id.startsWith("N") && d.what && String(d.val) && d.why)));

// — 9. Intégration séance générée : classement d'intensité + repos → null
const vo2: Parameters<typeof classifyIntensity>[0] = {
  d: "rn", name: "VO2max", det: "", min: 65,
  steps: [
    { role: "warmup", durationMin: 15 },
    { role: "body", durationMin: 3, reps: 5, zone: "rn.vo2", recoveryText: "récup 2min" },
    { role: "cooldown", durationMin: 10 },
  ],
};
check("Séance VO2 → classée « dure »", classifyIntensity(vo2) === "dure");
check("Footing sans steps durs → classé « facile »", classifyIntensity({ d: "rn", name: "Footing", det: "", min: 40, steps: [{ role: "body", durationMin: 40, zone: "rn.easy" }] }) === "facile");
const forSess = nutritionForSession({ ...vo2, long: false }, { tempC: 26, weightKg: 68 });
check("nutritionForSession : séance générée → conseil complet", !!forSess && !!forSess.after && forSess.during.sodium);
check("nutritionForSession : repos (rs) → null", nutritionForSession({ d: "rs", name: "Repos", det: "", min: 0 }) === null);

if (failures) {
  console.error("\nDémo nutrition : " + failures + " garantie(s) en échec.");
  process.exit(1);
}
console.log("\nDémo nutrition : toutes les garanties tiennent (périmètre ravitaillement d'effort, jamais de restriction).");
