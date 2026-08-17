#!/usr/bin/env node
/**
 * D3-b — LE PLAN PROMET-IL UNE PROGRESSION QU'IL NE CONTIENT PAS ?
 *
 *   node scripts/sondeD3couv.mjs
 *
 * Le message de D3 dit « ton plan garde ton format et CONSTRUIT cette continuité… NE PRENDS PAS
 * LE DÉPART avant d'avoir fait cette nage continue ». C'est une PROMESSE. Le véhicule de la
 * progression est le créneau `facile2` de la phase spécifique — et rien ne garantit qu'il existe :
 * mesuré sur un `tri/S` de 8 semaines, les deux semaines de `spec` n'en portent AUCUN.
 *
 * On balaie donc l'espace tri et on compte les plans où la décision annonce une construction que
 * le plan ne livre pas. Le placement est GELÉ par le §4 de l'arbitrage : on mesure pour NOMMER,
 * pas pour élargir le mécanisme sans mandat.
 */
import "../src/app/bridge.ts";
import { MIN_WEEKS } from "../src/engine/constraintMatrix.ts";

const BASE = {
  sport: "tri", dispo: "quotidienne", doubles: "non", sessions_max: "6", age: "35", sex: "H",
  weight: "75", vol_max: "12", vol_recent: "6", injury: "aucune", med_pain: "non",
  med_dizzy: "non", med_treat: "non", pace_known: "oui", pace: "5:00", ftp_known: "oui",
  ftp: "220", css_known: "oui", css: "1:50", terrain: "route", milieu: "bassin",
};
const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const dans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };
const CONT = /^Nage continue/;

let promis = 0, tenus = 0;
const trous = [];
for (const format of ["S", "M", "70.3", "Full"]) {
  const mw = MIN_WEEKS.tri?.[format] ?? 20;
  for (const h of [mw, mw + 4, mw + 10, mw + 20]) {
    for (const level of ["debutant", "inter", "avance"]) {
      for (const intent of ["competition", "finir", "plaisir"]) {
        for (const [dec, rep] of [["100m", { longest_swim_known: "oui", longest_swim_m: "100" }],
                                  ["600m", { longest_swim_known: "oui", longest_swim_m: "600" }],
                                  ["inconnue", { longest_swim_known: "non" }]]) {
          let p;
          try { p = globalThis.EBV2.buildPlan("tri", { ...BASE, format, level, intent, history: "confirme", race_date: dans(h), ...rep }); }
          catch { continue; }
          const d = (p._v2?.decisions ?? []).find((x) => x.id === "B17-continuite");
          // « promis » = le moteur annonce une construction (pas un rabattement)
          if (!d || /rabattu/i.test(String(d.what ?? ""))) continue;
          promis++;
          let n = 0;
          for (const w of p.weeks ?? []) for (const dd of w.days ?? []) for (const s of dd.sessions ?? [])
            if (s.d === "sw" && CONT.test(String(s.name ?? ""))) n++;
          if (n > 0) tenus++;
          else trous.push(`${format}/${h}sem/${level}/${intent}/${dec}`);
        }
      }
    }
  }
}

console.log("D3-b — « ton plan CONSTRUIT cette continuité » : promesse contre livraison\n");
console.log(`  plans où le moteur ANNONCE une construction : ${promis}`);
console.log(`  plans qui livrent au moins une nage continue : ${tenus} (${(100 * tenus / (promis || 1)).toFixed(1)} %)`);
console.log(`  PROMESSES NON TENUES : ${trous.length}`);
if (trous.length) {
  const par = (f) => { const m = {}; for (const t of trous) { const k = t.split("/")[f]; m[k] = (m[k] || 0) + 1; } return JSON.stringify(m); };
  console.log(`     par format   : ${par(0)}`);
  console.log(`     par niveau   : ${par(2)}`);
  console.log(`     par intention: ${par(3)}`);
  console.log(`     exemples : ${trous.slice(0, 6).join(" · ")}`);
}
console.log(`\n  → ${trous.length === 0
  ? "AUCUNE PROMESSE NON TENUE."
  : `${trous.length} PLANS ANNONCENT UNE PROGRESSION QU'ILS NE CONTIENNENT PAS. Le véhicule\n    (\`facile2\` en phase spécifique) n'existe pas dans ces plans — le placement étant GELÉ par\n    le §4, le fait est NOMMÉ et chiffré, pas corrigé sans mandat.`}`);
