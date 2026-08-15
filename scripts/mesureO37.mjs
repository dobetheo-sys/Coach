#!/usr/bin/env node
/**
 * §5 — O-37 : « I14 ROUVERT » DÉCRIT UN ÉTAT DU CODE. QU'EST-CE QUE ÇA COÛTE À L'ATHLÈTE ?
 *
 *   node scripts/mesureO37.mjs
 *
 * 441 semaines sur 949 profils, c'est gros en FRÉQUENCE. Mais R20.6 a appris à trier avant de
 * bloquer ; le fondateur étend la règle : **trier aussi avant de PRIORISER**. Une violation
 * d'invariant qui ne change rien au plan livré est de la dette ; une qui déplace des minutes
 * est un ticket. On ne le saura pas en relisant le code.
 *
 * Ce que la mesure regarde, sur les semaines en violation :
 *   · de COMBIEN la séance concurrente dépasse la sortie longue (l'ampleur, pas le compte) ;
 *   · si le dépassement est visible pour un athlète (une minute ? un quart d'heure ?) ;
 *   · quelle DISCIPLINE et quelle PHASE portent le défaut — une inversion en semaine de pic
 *     n'a pas le même sens qu'en semaine de base ;
 *   · si la séance qui dépasse est une séance de QUALITÉ (auquel cas le plan prescrit plus long
 *     ET plus dur que sa sortie longue, ce qui est le cas qui compte vraiment).
 */
import "../src/app/bridge.ts";

const SP = {
  run: ["5k", "10k", "semi", "marathon"], tri: ["S", "M", "70.3", "Full"],
  bike: ["crit", "route", "clm", "cyclo", "gravel"], swim: ["sprint", "demifond", "fond", "ow"],
  duathlon: ["S", "M", "L", "PM"], trail: ["trail"], swimrun: ["experience", "sprint", "series", "championship"],
};
const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"], I = ["finir", "plaisir", "competition"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", pace: "5:00", terrain: "route",
  sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220", css: "1:50",
  race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique", race_night: "partielle",
  train_dplus_access: "collines", treadmill: "non", poles: "a_decider", vam_known: "oui", vam: "850",
  swim_total_m: "7850", run_total_km: "33", segments_n: "20", longest_swim_m: "1400",
  water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
};

const QUALITE = /\.(thr|vo2|css|rp|mara|sprint|force|anaero)/;
const ecarts = [], parPhase = {}, parDisc = {};
let profils = 0, semaines = 0, avecQualite = 0;

for (const [sport, fmts] of Object.entries(SP))
  for (const format of fmts) for (const history of H) for (const level of L) for (const intent of I) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan(sport, { ...BASE, sport, format, history, level, intent }); } catch { continue; }
    profils++;
    for (const w of plan.weeks ?? []) {
      const ss = (w.days ?? []).flatMap((d) => d.sessions ?? []).filter((s) => s.d !== "rs" && s.steps && s.steps.length);
      let touchee = false;
      for (const lg of ss) {
        if (!lg.long || lg.race) continue;
        for (const s of ss) {
          if (s === lg || s.race || s.brick || s.long || s.d !== lg.d) continue;
          const d = (s.min || 0) - (lg.min || 0);
          if (d <= 0.5) continue;
          touchee = true;
          const qual = (s.steps || []).some((st) => st.role === "body" && QUALITE.test(String(st.zone || "")));
          if (qual) avecQualite++;
          ecarts.push({ d, pct: 100 * d / Math.max(1, lg.min || 1), qual, ou: `${sport}/${format}/${history}/${level}/${intent} S${w.num}`, quoi: `${s.name} ${Math.round(s.min)} > ${lg.name} ${Math.round(lg.min)}` });
          parPhase[w.phase?.id ?? "?"] = (parPhase[w.phase?.id ?? "?"] || 0) + 1;
          parDisc[lg.d] = (parDisc[lg.d] || 0) + 1;
        }
      }
      if (touchee) semaines++;
    }
  }

ecarts.sort((a, b) => b.d - a.d);
// Le tableau est trié DÉCROISSANT : le quantile p se lit donc à l'index (1 − p). Ma première
// écriture indexait à `p` et rendait « médiane 2,0 · p90 1,0 » — un p90 SOUS la médiane, ce qui
// n'a aucun sens et que j'ai failli publier. Onzième occurrence de la famille « une mesure qui
// nomme une grandeur et en rend une voisine », cette fois dans le sens du tri.
const q = (p) => ecarts.length ? ecarts[Math.min(ecarts.length - 1, Math.floor((1 - p) * ecarts.length))].d : 0;

/**
 * §6 — UN QUANTILE ASSERTE SES PROPRES INVARIANTS. Trois lignes, et cette classe ne revient pas.
 * `min ≤ p50 ≤ p90 ≤ max` est vrai de toute distribution : un p90 sous la médiane est une valeur
 * IMPOSSIBLE, pas une valeur surprenante. La garde coûte le prix d'un `if` et aurait attrapé mon
 * erreur d'index avant que je la publie.
 */
function assertQuantiles(qf, min, max) {
  const [p10, p50, p90] = [qf(0.1), qf(0.5), qf(0.9)];
  if (!(min <= p10 && p10 <= p50 && p50 <= p90 && p90 <= max))
    throw new Error(`quantiles incohérents — min ${min} · p10 ${p10} · p50 ${p50} · p90 ${p90} · max ${max}`);
}
const seuil = (n) => ecarts.filter((e) => e.d >= n).length;

if (ecarts.length) assertQuantiles(q, ecarts[ecarts.length - 1].d, ecarts[0].d);
console.log(`§5 — O-37 : LE DOMMAGE RÉEL, sur ${profils} profils\n`);
console.log(`  semaines en violation : ${semaines} · dépassements comptés : ${ecarts.length}`);
console.log(`  ampleur du dépassement (minutes au-dessus de la sortie longue) :`);
console.log(`    médiane ${q(0.5).toFixed(1)} · p90 ${q(0.9).toFixed(1)} · max ${ecarts.length ? ecarts[0].d.toFixed(1) : 0}`);
console.log(`    ≥ 1 min : ${seuil(1)} · ≥ 5 min : ${seuil(5)} · ≥ 15 min : ${seuil(15)} · ≥ 30 min : ${seuil(30)}`);
console.log(`  dont la séance qui dépasse est une séance de QUALITÉ : ${avecQualite} (${ecarts.length ? Math.round(100 * avecQualite / ecarts.length) : 0} %)`);
console.log(`  par phase : ` + Object.entries(parPhase).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
console.log(`  par discipline de la longue : ` + Object.entries(parDisc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
console.log(`\n  les 6 pires :`);
for (const e of ecarts.slice(0, 6)) console.log(`    +${e.d.toFixed(0)} min (${e.pct.toFixed(0)} %)${e.qual ? " QUALITÉ" : ""} — ${e.ou} : ${e.quoi}`);
console.log(`\n  LECTURE : un dépassement de quelques minutes est de la DETTE (l'athlète ne le voit pas`);
console.log(`  et le plan reste cohérent) ; un dépassement visible sur une séance de QUALITÉ est un`);
console.log(`  TICKET — le plan prescrit alors plus long ET plus dur que ce qu'il appelle sa sortie longue.`);
