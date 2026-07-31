#!/usr/bin/env node
/**
 * `npm run trace -- <sport> <enveloppe> <niveau>` — la trace des mutations d'UN plan.
 *
 * Vérifie à chaque exécution que la trace n'a AUCUN effet sur la sortie : le plan est généré
 * deux fois, trace éteinte puis allumée, et les deux sont comparés au caractère près. Un
 * observateur qui modifie ce qu'il observe ne sert à rien.
 */
import { buildPlanV2 } from "../src/app/bridge.ts";
import { traceOn, traceDump } from "../src/engine/trace.ts";

const [sport = "swim", envLbl = "moyenne", level = "inter"] = process.argv.slice(2);
const ENV = { petite: { sessions_max: "3", vol_max: "4", vol_recent: "1" }, moyenne: { sessions_max: "7", vol_max: "10", vol_recent: "5" }, grosse: { sessions_max: "12", vol_max: "16", vol_recent: "10" } };
const SPORTS = {
  run: { format: "marathon", terrain: "route", treadmill: "non", pace_known: "oui", pace: "4:50" },
  bike: { format: "cyclo", terrain: "plat", ftp_known: "oui", ftp: "227" },
  swim: { format: "fond", milieu: "bassin", swim_limit: "technique", css_known: "non" },
  tri: { format: "70.3", ftp_known: "oui", ftp: "227", pace_known: "oui", pace: "4:50", css_known: "non" },
  duathlon: { format: "M", terrain: "plat", ftp_known: "oui", ftp: "227", pace_known: "oui", pace: "4:50" },
  trail: { race_distance_km: "45", race_dplus_m: "2200", race_technicity: "mixte", race_night: "non", train_dplus_access: "collines", poles: "oui", vam_known: "non", pace_known: "oui", pace: "4:50" },
};
const a = { intent: "competition", history: "confirme", injury: "aucune", dispo: "partielle", doubles: "parfois",
  off_days: "non", sleep: "moyen", life_load: "normale", age: "38", weight: "79", sex: "H",
  race_date: "2027-06-13", weight_lever: "non", level, ...SPORTS[sport], ...ENV[envLbl] };

traceOn(null);
const sansTrace = JSON.stringify(buildPlanV2(sport, a));
traceOn(`${sport}/${envLbl}/${level}`);
const avecTrace = JSON.stringify(buildPlanV2(sport, a));
const { label, entries } = traceDump();
traceOn(null);

if (sansTrace !== avecTrace) {
  console.error("✖ LA TRACE MODIFIE LA SORTIE — inexploitable tant que ce n'est pas corrigé.");
  process.exit(2);
}
console.log(`trace de ${label} — ${entries.length} mutation(s), dans l'ordre d'exécution`);
console.log("(plan identique au caractère près avec et sans trace : l'observateur ne participe pas)\n");
const w = (x, n) => String(x ?? "").slice(0, n).padEnd(n);
console.log(w("#", 4) + w("passe", 20) + w("sem", 5) + w("séance", 34) + w("champ", 13) + w("avant→après", 16) + "raison");
for (const e of entries)
  console.log(w(e.seq, 4) + w(e.pass, 20) + w(e.weekNum, 5) + w(e.sessionName, 34) + w(e.field, 13)
    + w((e.before ?? "") + (e.after != null ? "→" + e.after : ""), 16) + e.reason + (e.envelope ? "  [" + e.envelope + "]" : ""));
const byPass = {};
for (const e of entries) byPass[e.pass] = (byPass[e.pass] || 0) + 1;
console.log("\npar passe :", Object.entries(byPass).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}=${v}`).join(" · ") || "aucune");
