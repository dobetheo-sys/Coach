// Bloc `verify` de BQ1 (BUGS_OUVERTS.md) — BQ1 est RETIRÉ : aucune constante exportée, et le
// créneau de nage doublé du matin (le seul mécanisme que BQ1 aurait touché) reste en `sw.css`,
// jamais rétrogradé en `sw.aero`.
import * as constraintMatrix from "../src/engine/constraintMatrix.ts";
import { generatePlan } from "../src/generator/planGenerator.ts";

const constanteAbsente = !("BQ1_CAP_TRI" in constraintMatrix);

const base = { history: "confirme", level: "inter", intent: "competition", vol_max: "14", vol_recent: "6",
  sessions_max: "12", dispo: "quotidienne", doubles: "oui", weight: "72", height: "178", sex: "H",
  age: "35", off_days: "non", sport: "tri", format: "70.3" };

const { plan } = generatePlan(base);
let matinTrouve = false, matinIntact = true;
for (const wk of plan.weeks) {
  if (wk.isRecup) continue;
  for (const d of wk.days) {
    for (const s of d.sessions) {
      if (s.d === "sw" && / \(matin\)$/.test(s.name)) {
        matinTrouve = true;
        const corps = (s.steps || []).find((st) => st.role === "body");
        if (corps && corps.zone !== "sw.css") matinIntact = false;
      }
    }
  }
}

const ok = constanteAbsente && matinTrouve && matinIntact;
console.log(JSON.stringify({ constanteAbsente, matinTrouve, matinIntact }));
console.log(ok ? "BQ1 RETRAIT CONFIRMÉ" : "BQ1 ANOMALIE");
process.exit(ok ? 0 : 1);
