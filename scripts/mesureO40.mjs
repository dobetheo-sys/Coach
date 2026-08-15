#!/usr/bin/env node
/**
 * O-40 — LES DEUX GARDES QUI ABANDONNENT QUAND L'UNITÉ NE LEUR CONVIENT PAS.
 *
 *   node scripts/mesureO40.mjs
 *
 * | garde                  | condition d'abandon              | population muette          |
 * |------------------------|----------------------------------|----------------------------|
 * | C24/C24b (plancher)    | `if (tot <= 0) continue`         | blocs prescrits en TEMPS   |
 * | `DOSE_CAP_MIN` (plafond)| `if (b.durationMin != null)`    | blocs prescrits en MÈTRES  |
 *
 * Les deux unités perdent une garde, en sens OPPOSÉS : ce n'est donc pas un problème de choix
 * d'unité, c'est que chaque garde RENONCE au lieu de dériver la grandeur qui lui manque — alors
 * que le moteur connaît les vitesses (CSS, allure seuil) et sait convertir dans les deux sens.
 *
 * MESURE AVANT D'ÉCRIRE : combien de blocs le plafond de dose mordrait-il une fois rendu
 * indifférent à l'unité ? S'il mord largement, c'est un changement de PLAN qui demande son
 * propre diff ; s'il ne mord pas, la garde est déclarative et il faut l'écrire.
 *
 * La conversion utilisée ici est celle du moteur, lue à sa source (`SWIM_SPEED_RATIO` et le CSS
 * de l'athlète) — pas une seconde arithmétique inventée pour la mesure (règle 15 : observer ce
 * qui s'exécute).
 */
import "../src/app/bridge.ts";
import { DOSE_CAP_MIN } from "../src/engine/constraintMatrix.ts";

const SP = {
  swim: ["sprint", "demifond", "fond", "ow"], tri: ["S", "M", "70.3", "Full"],
  swimrun: ["experience", "sprint", "series", "championship"],
};
const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"], I = ["finir", "plaisir", "competition"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", pace: "5:00", terrain: "route",
  sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220", css: "1:50",
  swim_total_m: "7850", run_total_km: "33", segments_n: "20", longest_swim_m: "1400",
  water_temp_c: "16", team_mode: "binome", openwater_access: "saisonnier",
};

// Le plafond que le CODE résout pour cette zone (règle 15 : la résolution, pas la table).
const capDe = (z) => /\.vo2$/.test(z) || z === "tr.vam" ? DOSE_CAP_MIN.vo2
  : /\.thr$|\.css$/.test(z) || z === "tr.asc" || z === "tr.flatthr" ? DOSE_CAP_MIN.thr
    : null;

let blocsDist = 0, avecCap = 0, mordrait = 0, profilsTouches = 0;
const exces = [];
const parFormat = {};

for (const [sport, fmts] of Object.entries(SP))
  for (const format of fmts) for (const history of H) for (const level of L) for (const intent of I) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan(sport, { ...BASE, sport, format, history, level, intent }); } catch { continue; }
    let touche = false;
    for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      for (const st of s.steps ?? []) {
        if (st.role !== "body" || st.distanceM == null) continue;
        blocsDist++;
        const cap = capDe(String(st.zone || ""));
        if (cap == null) continue;
        avecCap++;
        // La DURÉE que ce bloc représente : le moteur la calcule déjà et la publie dans `_min`
        // (récup inter-blocs comprise, R5.6a). Le plafond porte sur le TRAVAIL : on retire la
        // récup, exactement comme le fait la branche `reps × durationMin` en course.
        const reps = st.reps || 1;
        const travail = (st._min ?? 0) - (st.recoveryMin ?? 0) * Math.max(0, reps - 1);
        if (travail > cap) {
          mordrait++; touche = true;
          parFormat[`${sport}/${format}`] = (parFormat[`${sport}/${format}`] || 0) + 1;
          if (exces.length < 6) exces.push(`${sport}/${format}/${history}/${level} « ${s.name} » ${st.zone} : ${travail.toFixed(0)} min de travail pour un plafond de ${cap}`);
        }
      }
    if (touche) profilsTouches++;
  }

console.log("O-40 — LE PLAFOND DE DOSE, UNE FOIS RENDU INDIFFÉRENT À L'UNITÉ\n");
console.log(`  blocs de corps prescrits en MÈTRES        : ${blocsDist}`);
console.log(`  … dont portant une zone À PLAFOND         : ${avecCap}`);
console.log(`  … dont le plafond MORDRAIT                : ${mordrait}`);
console.log(`  profils touchés                           : ${profilsTouches}`);
if (Object.keys(parFormat).length) {
  console.log(`\n  par format :`);
  for (const [k, v] of Object.entries(parFormat).sort((a, b) => b[1] - a[1])) console.log(`     ${k.padEnd(22)} ${v}`);
}
for (const e of exces) console.log(`     ${e}`);
console.log(`\n  → ${mordrait === 0
  ? "LE PLAFOND EST DÉCLARATIF : le rendre indifférent à l'unité ne change AUCUN plan. La garde\n    se pose sans diff, et elle protège l'avenir plutôt que de corriger le présent."
  : "LE PLAFOND MORD : c'est un changement de PLAN, qui demande son propre diff ventilé avant\n    d'être écrit — ne pas le poser dans le même geste que la garde."}`);
