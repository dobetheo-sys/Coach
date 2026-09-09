// Bloc `verify` de FV1 (BUGS_OUVERTS.md) — la force vélo réapparaît en spécifique/pic sur les
// profils à dénivelé significatif, en dose d'entretien (jamais la fréquence base/dev), et reste
// à 0 % sur les profils plats (aucune mesure ne justifie l'étendre là — règle 7).
import { generatePlan } from "../src/generator/planGenerator.ts";

const base = { history: "confirme", level: "inter", intent: "competition", vol_max: "10", vol_recent: "6",
  sessions_max: "10", dispo: "quotidienne", doubles: "non", weight: "72", height: "178", sex: "H",
  age: "35", off_days: "non" };

function compte(profile) {
  const { plan } = generatePlan(profile);
  let n = 0;
  for (const wk of plan.weeks) for (const d of wk.days) for (const s of d.sessions)
    if (s.name === "Force en côte (entretien)") n++;
  return n;
}

const montagne = compte({ ...base, sport: "tri", format: "70.3", terrain: "montagne" });
const plat = compte({ ...base, sport: "tri", format: "70.3", terrain: "plat" });
const ok = montagne > 0 && plat === 0;
console.log(JSON.stringify({ montagne, plat }));
console.log(ok ? "FV1 VERT" : "FV1 ROUGE");
process.exit(ok ? 0 : 1);
