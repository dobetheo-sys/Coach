#!/usr/bin/env node
/**
 * O-42 — CE QUE COÛTE LA CONVERSION UNIQUE, ET OÙ LE CHOIX DE BANDE PÈSE.
 *
 *   node scripts/mesureO42.mjs
 *
 * §2 a établi qu'il existe TROIS conversions mètres ↔ durée pour une seule grandeur :
 *   · `stepMin`       — ratio 1,00 partout (un bloc facile compté comme nagé au seuil) ;
 *   · `weekDistances` — sa propre table, divergente de ZDEF sur 8 zones sur 9 ;
 *   · `ZDEF`          — les allures que l'athlète LIT.
 *
 * §3 tranche : l'autorité est la définition de zone, les deux tables disparaissent. Reste UN
 * choix que la lecture ne donne pas — en NAGE `ZDEF` porte `lo === hi`, la vitesse implicite est
 * donc exacte ; en COURSE les bandes ont une largeur, et une durée dérivée d'une distance doit
 * choisir un point dans la bande.
 *
 * RÈGLE 7 — mesurer avant d'écrire la règle. Ce script ne corrige RIEN : il compte la population
 * de chaque conversion et chiffre ce que le choix de bande déplace. Si la population où le choix
 * pèse est marginale, le choix se tranche sur un principe ; si elle est large, c'est un arbitrage.
 *
 * RÈGLE 15 — on observe la SORTIE LIVRÉE : les steps des plans émis, pas une énumération des
 * gabarits. `_min` est relu sur le bloc tel que le moteur l'a posé.
 */
import "../src/app/bridge.ts";
import { ZDEF } from "../src/generator/renderer.ts";

const SP = {
  swim: ["sprint", "demifond", "fond", "ow"],
  tri: ["S", "M", "70.3", "Full"],
  swimrun: ["experience", "sprint", "series", "championship"],
  run: ["5k", "10k", "semi", "marathon"],
  trail: ["court", "long", "ultra"],
  duathlon: ["S", "M", "L"],
};
const H = ["reprise", "confirme", "ancien"];
const L = ["debutant", "inter", "avance"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", pace: "5:00", terrain: "route",
  sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220",
  css: "1:50", css_known: "oui", ftp_known: "oui",
  swim_total_m: "7850", run_total_km: "33", segments_n: "20", longest_swim_m: "1400",
  water_temp_c: "20", team_mode: "binome", openwater_access: "saisonnier",
  intent: "competition",
};
const CSS_SEC = 110;   // s/100 m — la valeur DÉCLARÉE, et `css_known: "oui"` la rend effective
const THR_SEC = 300;   // s/km

// Les tables que le correctif fera disparaître, relues à leur source pour la comparaison.
const RUN_SPEED_RATIO = { "rn.easy": 0.78, "rn.rec": 0.70, "rn.mara": 0.92, "rn.thr": 1.0, "rn.vo2": 1.05 };
const SWIM_SPEED_RATIO = { "sw.easy": 0.80, "sw.aero": 0.88, "sw.css": 1.0, "sw.speed": 1.02 };

const ancre = (z) => (ZDEF[z]?.ref === "css" ? CSS_SEC : ZDEF[z]?.ref === "thrPace" ? THR_SEC : null);
/** Durée d'un bloc prescrit en mètres, sous une hypothèse de bande (`lo` | `mid` | `hi`). */
function dureeZDEF(zone, metres, bord) {
  const d = ZDEF[zone];
  if (!d) return null;
  const a = ancre(zone);
  if (a == null) return null;
  const mult = bord === "lo" ? d.lo : bord === "hi" ? d.hi : (d.lo + d.hi) / 2;
  const unite = d.ref === "css" ? 100 : 1000; // l'allure est /100 m en nage, /km en course
  return (metres / unite) * ((a * mult) / 60);
}
/** Ce que `stepMin` calcule aujourd'hui : l'ancre BRUTE, ratio 1,00, quelle que soit la zone. */
const dureeActuelle = (zone, metres) => {
  const a = ancre(zone);
  if (a == null) return null;
  return (metres / (ZDEF[zone].ref === "css" ? 100 : 1000)) * (a / 60);
};

const parZone = {};   // zone → { blocs, minActuel, minLo, minMid, minHi }
const tempsParZone = {}; // zone → { blocs, min } (prescription en TEMPS : weekDistances)
let plans = 0, blocsMetres = 0, blocsTemps = 0, sansZone = 0;

for (const [sport, fmts] of Object.entries(SP))
  for (const format of fmts) for (const history of H) for (const level of L) {
    let plan;
    try { plan = globalThis.EBV2.buildPlan(sport, { ...BASE, sport, format, history, level }); } catch { continue; }
    plans++;
    for (const w of plan.weeks ?? []) for (const day of w.days ?? []) for (const s of day.sessions ?? [])
      for (const st of s.steps ?? []) {
        if (st.role !== "body") continue;
        const zone = String(st.zone || "");
        const reps = st.reps || 1;
        if (st.distanceM != null) {
          blocsMetres++;
          if (!ZDEF[zone] || ancre(zone) == null) { sansZone++; continue; }
          const m = reps * st.distanceM;
          const e = (parZone[zone] ||= { blocs: 0, act: 0, lo: 0, mid: 0, hi: 0 });
          e.blocs++;
          e.act += dureeActuelle(zone, m);
          e.lo += dureeZDEF(zone, m, "lo");
          e.mid += dureeZDEF(zone, m, "mid");
          e.hi += dureeZDEF(zone, m, "hi");
        } else if (st.durationMin) {
          const disc = st.d || (zone.split(".")[0]) || s.d;
          if (disc !== "rn" && disc !== "sw") continue;
          blocsTemps++;
          const e = (tempsParZone[zone] ||= { blocs: 0, min: 0 });
          e.blocs++; e.min += reps * st.durationMin;
        }
      }
  }

const pct = (a, b) => (b === 0 ? "—" : ((a / b - 1) * 100).toFixed(1).padStart(6) + " %");
console.log(`O-42 — LA CONVERSION UNIQUE : POPULATION ET AMPLEUR\n`);
console.log(`  plans balayés : ${plans} · blocs de corps en MÈTRES : ${blocsMetres} · en TEMPS (rn/sw) : ${blocsTemps}`);
if (sansZone) console.log(`  ⚠ blocs en mètres sans zone résoluble dans ZDEF : ${sansZone}`);

console.log(`\n§1 — MÈTRES → DURÉE (le domaine de \`stepMin\`)`);
console.log(`     zone         blocs      min actuels   → ZDEF mid        écart      largeur de bande (lo→hi)`);
let tAct = 0, tLo = 0, tMid = 0, tHi = 0;
for (const [z, e] of Object.entries(parZone).sort((a, b) => b[1].blocs - a[1].blocs)) {
  tAct += e.act; tLo += e.lo; tMid += e.mid; tHi += e.hi;
  const largeur = e.lo === e.hi ? "     0,0 % (lo === hi)" : ((e.hi / e.lo - 1) * 100).toFixed(1).padStart(8) + " %";
  console.log(`     ${z.padEnd(12)} ${String(e.blocs).padStart(5)}   ${e.act.toFixed(0).padStart(10)}   ${e.mid.toFixed(0).padStart(10)}   ${pct(e.mid, e.act)}   ${largeur}`);
}
console.log(`     ${"TOTAL".padEnd(12)} ${String(Object.values(parZone).reduce((a, e) => a + e.blocs, 0)).padStart(5)}   ${tAct.toFixed(0).padStart(10)}   ${tMid.toFixed(0).padStart(10)}   ${pct(tMid, tAct)}`);
console.log(`\n     Le choix de bande, en minutes sur tout le balayage :`);
console.log(`       borne RAPIDE (lo)  : ${tLo.toFixed(0)} min  (${pct(tLo, tAct)} vs actuel)`);
console.log(`       CENTRE     (mid)   : ${tMid.toFixed(0)} min  (${pct(tMid, tAct)} vs actuel)`);
console.log(`       borne LENTE (hi)   : ${tHi.toFixed(0)} min  (${pct(tHi, tAct)} vs actuel)`);
console.log(`       → l'écart lo↔hi vaut ${((tHi / tLo - 1) * 100).toFixed(1)} % du total, contre ${((tMid / tAct - 1) * 100).toFixed(1)} % pour la correction elle-même.`);

console.log(`\n§2 — LA TABLE DE \`weekDistances\` CONTRE ZDEF, PONDÉRÉE PAR LA POPULATION RÉELLE`);
console.log(`     zone         blocs (temps)   ratio table   ratio ZDEF (mid)   écart`);
for (const [z, e] of Object.entries(tempsParZone).sort((a, b) => b[1].blocs - a[1].blocs)) {
  const t = RUN_SPEED_RATIO[z] ?? SWIM_SPEED_RATIO[z];
  const d = ZDEF[z];
  if (t == null || !d) continue;
  const zr = 1 / ((d.lo + d.hi) / 2);
  console.log(`     ${z.padEnd(12)} ${String(e.blocs).padStart(7)}        ${t.toFixed(3)}         ${zr.toFixed(3)}        ${((zr / t - 1) * 100).toFixed(1).padStart(6)} %`);
}

console.log(`\n§3 — LE CHOIX DE BANDE NE PÈSE QUE LÀ OÙ \`lo !== hi\``);
const bandes = Object.entries(parZone).filter(([z]) => ZDEF[z].lo !== ZDEF[z].hi);
const blocsBande = bandes.reduce((a, [, e]) => a + e.blocs, 0);
const blocsTot = Object.values(parZone).reduce((a, e) => a + e.blocs, 0);
console.log(`     blocs en mètres dont la zone porte une BANDE : ${blocsBande} / ${blocsTot} (${(100 * blocsBande / (blocsTot || 1)).toFixed(1)} %)`);
console.log(`     ${blocsBande === 0
  ? "→ AUCUN. Le choix lo/mid/hi n'a pas d'objet sur la conversion mètres → durée :\n       toutes les zones prescrites en mètres portent `lo === hi`. Il n'y a pas d'arbitrage\n       à rendre ici, seulement une conversion à écrire."
  : "→ le choix pèse sur cette population : à trancher explicitement avant d'écrire."}`);
