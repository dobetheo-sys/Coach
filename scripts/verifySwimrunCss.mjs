// Bloc `verify` de S15-css (BUGS_OUVERTS.md) — en spec/peak, le créneau `dur1` du swimrun
// ALTERNE seuil css / nage continue longue une semaine sur deux, y compris sur les plans courts
// (≤ 14 semaines), là où la clause `|| kit.r.weeks <= 14` éliminait le css entièrement.
import { generatePlan } from "../src/generator/planGenerator.ts";

const base = {
  sport: "swimrun", history: "confirme", level: "inter", intent: "competition",
  vol_max: "10", sessions_max: "6", dispo: "semaine", age: "35", sex: "H", weight: "75",
  css_known: "oui", css: "1:55", pace_known: "oui", pace: "4:30", off_days: "non",
  swim_total_m: "7850", run_total_km: "33", race_dplus_m: "900", segments_n: "20",
  longest_swim_m: "1400", water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
  swim_continuous: "oui", run_continuous: "oui",
};

function compte(format) {
  const { plan } = generatePlan({ ...base, format });
  let css = 0, longue = 0, weeks = 0;
  for (const wk of plan.weeks) {
    if (wk.isRecup || (wk.phase.id !== "spec" && wk.phase.id !== "peak")) continue;
    weeks++;
    for (const d of wk.days) for (const s of d.sessions) {
      if (s.d !== "sw" || s.long || s.race) continue;
      const zones = (s.steps || []).filter((st) => st.role === "body").map((st) => st.zone);
      if (zones.includes("sw.css")) css++;
      if (/Nage continue longue/.test(s.name)) longue++;
    }
  }
  return { total: plan.weeks.length, specPeak: weeks, css, longue };
}

const sprint = compte("sprint");          // plan court (≤ 14 sem.) — le cas qui perdait tout son css
const champ = compte("championship");     // plan long (30 sem.) — déjà correct avant, ne doit pas bouger
console.log("sprint      :", JSON.stringify(sprint));
console.log("championship:", JSON.stringify(champ));

// Court : le css EXISTE en spec/peak et l'alternance est proche de 50/50 (écart ≤ 1 semaine).
const okCourt = sprint.total <= 14 && sprint.css > 0 && Math.abs(sprint.css - sprint.longue) <= 1;
// Long : les deux branches restent présentes, alternance ≈ 50/50.
const okLong = champ.css > 0 && champ.longue > 0 && Math.abs(champ.css - champ.longue) <= 1;
const ok = okCourt && okLong;
console.log(ok ? "S15-CSS VERT" : "S15-CSS ROUGE");
process.exit(ok ? 0 : 1);
