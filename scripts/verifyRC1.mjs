// Bloc `verify` de RC1 (BUGS_OUVERTS.md) — chaque semaine de charge d'un plan multisport
// (tri/duathlon) OU bike garantit désormais au moins un jour de repos total, jamais seulement
// de la récup active. bike (12,1 % de vrai OFF mesuré, prémisse « déjà correct » réfutée le
// 09/09/2026) est étendu par disjonction explicite le 10/09/2026, voir constraintMatrix.ts.
// run/swim/trail restent hors scope (mesurés corrects) et ne sont pas couverts par ce bloc.
import { generatePlan } from "../src/generator/planGenerator.ts";

const base = { history: "confirme", level: "inter", intent: "competition", vol_max: "10", vol_recent: "6",
  sessions_max: "10", dispo: "quotidienne", doubles: "non", weight: "72", height: "178", sex: "H",
  age: "35", off_days: "non" };

function tauxOff(profile) {
  const { plan } = generatePlan(profile);
  let charge = 0, off = 0;
  for (const wk of plan.weeks) {
    if (wk.isRecup) continue;
    charge++;
    if (wk.days.some((d) => d.sessions.some((s) => s.d === "rs" && /^off\b|repos total/i.test(s.name + " " + (s.det || "")))))
      off++;
  }
  return { charge, off };
}

const tri = tauxOff({ ...base, sport: "tri", format: "70.3" });
const bike = tauxOff({ ...base, sport: "bike", format: "route", sessions_max: "6" });
const ok = tri.off === tri.charge && bike.off === bike.charge;
console.log(JSON.stringify({ tri, bike }));
console.log(ok ? "RC1 VERT" : "RC1 ROUGE");
process.exit(ok ? 0 : 1);
