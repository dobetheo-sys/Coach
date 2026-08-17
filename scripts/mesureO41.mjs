#!/usr/bin/env node
/**
 * O-41 (a) — LE REPLI `baseRefs.css || 130` TIRE-T-IL EN PRODUCTION ?
 *
 *   node scripts/mesureO41.mjs
 *
 * `stepMin` retombe sur 130 s/100 m quand `baseRefs.css` n'est pas peuplé. Ce n'est pas un
 * contrôle sauté — c'est une DONNÉE FABRIQUÉE : le plan est calculé pour un nageur qui n'est pas
 * l'athlète, et rien à l'écran ne le distingue d'un plan juste.
 *
 * On ne lit pas `baseRefs` (règle 15 : observer ce qui s'exécute) — on INVERSE `stepMin` sur les
 * blocs de nage prescrits en mètres, ce qui rend la vitesse RÉELLEMENT employée par le moteur.
 */
import "../src/app/bridge.ts";

const REPLI = 130;
const SP = { swim: ["sprint", "demifond", "fond", "ow"], tri: ["S", "M", "70.3", "Full"], swimrun: ["experience", "sprint", "series", "championship"] };
const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"], I = ["finir", "plaisir", "competition"];
const SOCLE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", terrain: "route", sex: "H", age: "35",
  vol_max: "8", vol_recent: "3", weight: "75",
  swim_total_m: "7850", run_total_km: "33", segments_n: "20", longest_swim_m: "1400",
  water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
};

/** La vitesse que le moteur a employée, inversée depuis `stepMin` sur un bloc de nage en mètres. */
function cssEmploye(plan) {
  for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
    for (const st of s.steps ?? []) {
      if (st.role !== "body" || st.distanceM == null || String(st.d || s.d) !== "sw") continue;
      const reps = st.reps || 1;
      const travail = (st._min ?? 0) - (st.recoveryMin ?? 0) * Math.max(0, reps - 1);
      const m = reps * st.distanceM;
      if (m > 0 && travail > 0) return (travail / (m / 100)) * 60;
    }
  return null;
}

for (const [titre, decl] of [
  ["CSS DÉCLARÉE (css + css_known)", { css: "1:50", css_known: "oui" }],
  ["CSS saisie SANS css_known", { css: "1:50" }],
  ["AUCUNE CSS déclarée", {}],
]) {
  let n = 0, repli = 0, reel = 0;
  const vus = new Set();
  for (const [sport, fmts] of Object.entries(SP))
    for (const format of fmts) for (const history of H) for (const level of L) for (const intent of I) {
      let plan;
      try { plan = globalThis.EBV2.buildPlan(sport, { ...SOCLE, ...decl, sport, format, history, level, intent }); } catch { continue; }
      const c = cssEmploye(plan);
      if (c == null) continue;
      n++; vus.add(Math.round(c));
      if (Math.abs(c - REPLI) < 0.5) repli++; else reel++;
    }
  const pct = n ? Math.round(100 * repli / n) : 0;
  console.log(`${titre.padEnd(34)} profils ${String(n).padStart(4)} · repli ${String(repli).padStart(4)} (${String(pct).padStart(3)} %) · réel ${String(reel).padStart(4)} · css vues : ${[...vus].sort((a,b)=>a-b).join(", ")}`);
}
console.log(`\n  RAPPEL — un taux SATURÉ (0 % ou 100 %) est suspect d'erreur d'instrument jusqu'à`);
console.log(`  preuve du contraire. Ici les trois lignes doivent DIFFÉRER : si elles ne diffèrent`);
console.log(`  pas, c'est la sonde qui ne discrimine pas, pas le moteur qui serait indifférent.`);
