#!/usr/bin/env node
/**
 * LOT 1 — L'AMPLEUR RÉELLE DU MOUVEMENT, mesurée sur le PLAN et non sur le diff du golden.
 *
 *   node scripts/ampleurLot1.mjs --avant    # témoin, sur le moteur SANS le plafond en mètres
 *   node scripts/ampleurLot1.mjs            # après, et comparaison
 *
 * POURQUOI CETTE SONDE EXISTE — une faute d'instrument à moi, publiée.
 *
 * J'avais chiffré l'ampleur du lot en agrégeant les lignes affichées par `golden:verify`, et
 * conclu « médiane 3 min par semaine, max 5 ». C'est faux, et la cause est écrite dans le golden
 * lui-même : `firstDiff` rend **le PREMIER** écart de chaque profil — *« où compte plus que
 * combien pour corriger »*, ce qui est un bon choix pour LOCALISER et un mauvais chiffre pour
 * MESURER. J'ai donc agrégé 87 *premiers* écarts et je les ai publiés comme l'amplitude totale.
 * Le fondateur a rendu sa décision de recapture sur ce chiffre.
 *
 * Neuvième occurrence dans ce dépôt d'une mesure qui NOMME une grandeur et en MESURE une voisine
 * — et la première où la grandeur voisine est produite par un outil dont la documentation dit
 * explicitement qu'il ne mesure pas ça.
 *
 * Le témoin est LU SUR DISQUE, capturé une fois avec le moteur d'avant : sans quoi « avant » et
 * « après » seraient le même code (leçon mesureO44).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

const TEMOIN = "/tmp/lot1-ampleur.json";
const avant = process.argv.includes("--avant");

const mesure = () => {
  const par = [];
  for (const { key, sport, a } of goldenProfiles()) {
    let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
    const disc = {}; let tot = 0, nSess = 0, courbe = 0, dur = 0, facile = 0;
    for (const w of p.weeks ?? []) {
      courbe += (w.vol || 0) * 60;
      for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
        if (s.d === "rs") continue;
        tot += s.min || 0; nSess++;
        disc[s.d] = (disc[s.d] || 0) + (s.min || 0);
      }
    }
    const iw = p._v2?.intensity;
    if (iw) { dur = iw.hardPct ?? 0; facile = iw.easyPct ?? 0; }
    par.push({ key, sport, format: String(a.format), tot: Math.round(tot), nSess, courbe: Math.round(courbe), disc, dur, facile });
  }
  return par;
};

const now = mesure();
if (avant) { writeFileSync(TEMOIN, JSON.stringify(now)); console.log(`témoin écrit : ${TEMOIN} (${now.length} profils)`); process.exit(0); }
if (!existsSync(TEMOIN)) { console.error("Aucun témoin. Lancer `node scripts/ampleurLot1.mjs --avant` sur le moteur d'AVANT."); process.exit(2); }
const ref = new Map(JSON.parse(readFileSync(TEMOIN, "utf8")).map((x) => [x.key, x]));

const q = (l, p) => l.length ? l.slice().sort((x, y) => x - y)[Math.min(l.length - 1, Math.floor(l.length * p))] : 0;

const chg = [], dTot = [], dSw = [], dCourbe = [];
let nSessChg = 0, sommeTot = 0, sommeSw = 0, sommeCourbe = 0;
const parFormat = {};
for (const x of now) {
  const r = ref.get(x.key); if (!r) continue;
  const dt = x.tot - r.tot, ds = (x.disc.sw || 0) - (r.disc.sw || 0), dc = x.courbe - r.courbe;
  if (dt === 0 && ds === 0 && dc === 0 && x.nSess === r.nSess) continue;
  chg.push(x.key);
  dTot.push(dt); dSw.push(ds); dCourbe.push(dc);
  sommeTot += dt; sommeSw += ds; sommeCourbe += dc;
  if (x.nSess !== r.nSess) nSessChg++;
  const f = `${x.sport}/${x.format}`;
  parFormat[f] = parFormat[f] || { n: 0, tot: 0, sw: 0 };
  parFormat[f].n++; parFormat[f].tot += dt; parFormat[f].sw += ds;
}

console.log(`LOT 1 — AMPLEUR RÉELLE  (${now.length} profils générés, ${chg.length} qui bougent)\n`);
const bloc = (nom, l, somme, unite = "min") => {
  const abs = l.map(Math.abs);
  console.log(`  ${nom}`);
  console.log(`     somme    ${somme > 0 ? "+" : ""}${Math.round(somme)} ${unite}   ·   moyenne ${(somme / (l.length || 1)).toFixed(1)} ${unite}/profil`);
  console.log(`     |écart|  médiane ${q(abs, 0.5)} · p90 ${q(abs, 0.9)} · max ${Math.max(0, ...abs)} ${unite}`);
  console.log(`     sens     ${l.filter((x) => x < 0).length} en baisse · ${l.filter((x) => x > 0).length} en hausse · ${l.filter((x) => x === 0).length} nuls`);
};
bloc("VOLUME TOTAL du plan", dTot, sommeTot);
bloc("dont NAGE", dSw, sommeSw);
bloc("COURBE DÉCLARÉE (la cible, pas le livré)", dCourbe, sommeCourbe);
console.log(`\n  nombre de SÉANCES qui change : ${nSessChg} profil(s)${nSessChg ? " ✖ — une séance apparaît ou disparaît" : " ✓"}`);

console.log(`\n  par format :`);
for (const [f, v] of Object.entries(parFormat).sort((a, b) => a[1].tot - b[1].tot))
  console.log(`     ${f.padEnd(16)} ${String(v.n).padStart(3)} profils   total ${String(Math.round(v.tot)).padStart(6)} min   nage ${String(Math.round(v.sw)).padStart(6)} min`);

// LA QUESTION QUI DÉCIDE : le plan suit-il toujours sa courbe, ou s'en écarte-t-il ?
// Si le livré suit la courbe et que la COURBE baisse, ce n'est pas le plafond qui ampute :
// c'est la sonde de capacité qui relit un contenu généré (O-43, règle 12).
//
// ⚠ MA PREMIÈRE ÉCRITURE RENDAIT UN VERDICT UNIQUE — « une coupe n'est pas réallouée » — sur un
// écart mesuré en VALEUR ABSOLUE. Les trois cas qu'elle désignait sont l'exact contraire : le
// livré MONTE (+518 min) et la courbe monte DAVANTAGE (+942). Ce n'est pas une coupe, c'est la
// cible déclarée qui court devant le livré — famille T-25/O-35. Un écart absolu ne peut pas
// distinguer les deux, et nommer la mauvaise cause dans le sens alarmant est aussi coûteux que
// dans le sens rassurant.
let suitCourbe = 0, coupe = 0, cibleDevant = 0;
for (const x of now) {
  const r = ref.get(x.key); if (!r) continue;
  if (x.tot === r.tot && x.courbe === r.courbe) continue;
  const ecartApres = Math.abs(x.tot - x.courbe), ecartAvant = Math.abs(r.tot - r.courbe);
  if (ecartApres <= ecartAvant + 30) { suitCourbe++; continue; }
  if (x.tot < x.courbe) cibleDevant++;   // le livré est SOUS sa cible : la cible a pris de l'avance
  else coupe++;                          // le livré est AU-DESSUS : là seulement il y a un surplus
}
const secarte = coupe + cibleDevant;
console.log(`\n  le livré suit sa courbe aussi bien qu'avant : ${suitCourbe} profils · s'en écarte davantage : ${secarte}`);
console.log(`     dont livré SOUS sa cible (la cible a pris de l'avance, famille T-25/O-35) : ${cibleDevant}`);
console.log(`     dont livré AU-DESSUS de sa cible : ${coupe}`);
// LES CAS NOMMÉS — un chiffre agrégé ne se vérifie pas, un profil nommé si.
const nomme = (titre, l) => { if (!l.length) return; console.log(`\n  ${titre}`); for (const x of l.slice(0, 8)) console.log(`     ${x}`); };
const sessChg = [], drift = [], gros = [];
for (const x of now) {
  const r = ref.get(x.key); if (!r) continue;
  if (x.nSess !== r.nSess) sessChg.push(`${x.key} : ${r.nSess} → ${x.nSess} séances  (volume ${r.tot} → ${x.tot} min)`);
  if (!(x.tot === r.tot && x.courbe === r.courbe)) {
    const eA = Math.abs(x.tot - x.courbe), eB = Math.abs(r.tot - r.courbe);
    if (eA > eB + 30) drift.push(`${x.key} : écart au livré ${Math.round(eB)} → ${Math.round(eA)} min  (courbe ${r.courbe} → ${x.courbe})`);
  }
  if (Math.abs(x.tot - r.tot) >= 100) gros.push({ d: Math.abs(x.tot - r.tot), s: `${x.key} : ${r.tot} → ${x.tot} min (${x.tot - r.tot > 0 ? "+" : ""}${x.tot - r.tot}) · courbe ${r.courbe} → ${x.courbe} · nage ${r.disc.sw || 0} → ${x.disc.sw || 0}` });
}
nomme("SÉANCES qui apparaissent ou disparaissent :", sessChg);
nomme("PLANS qui s'écartent davantage de leur courbe :", drift);
nomme("PLUS GROS mouvements de volume (≥ 100 min) :", gros.sort((a, b) => b.d - a.d).map((x) => x.s));

console.log(`\n  → ${coupe === 0
  ? "AUCUN plan ne livre PLUS que sa cible : il n'y a pas de coupe non réallouée. Les mouvements de\n    volume viennent de la COURBE, que la sonde de capacité recalcule sur un contenu généré\n    (O-43, règle 12) — le plafond fait bouger la cible sans jamais amputer le livré."
  : `${coupe} plan(s) livrent AU-DESSUS de leur cible : une coupe n'est pas réallouée.`}`);
