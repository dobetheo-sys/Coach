#!/usr/bin/env node
/**
 * LOT 1 — QUI LE PLAFOND DE DOSE ATTEINT-IL MAINTENANT QU'IL SAIT LIRE LES MÈTRES ?
 *
 *   node scripts/mesureLot1.mjs
 *
 * Le brief pose l'acceptation à « golden 969 à 0 écart », et ajoute : *« un écart n'est pas une
 * régression — c'est une population que la mesure préalable n'a pas vue, et elle vaut plus que le
 * lot. Ne pas corriger, mesurer qui et pourquoi, et remonter. »*
 *
 * Il y a eu 87 écarts. Cette sonde dit QUI, et elle est écrite pour répondre DANS LES DEUX ÉTATS
 * du moteur, sans témoin sur disque :
 *
 *   - moteur d'AVANT (plafond muet sur les mètres) : elle compte les blocs qui DÉPASSENT, et leur
 *     dépassement est la mesure du défaut ;
 *   - moteur d'APRÈS : les mêmes blocs sont livrés À la borne, et le compte des dépassements
 *     tombe à zéro.
 *
 * Elle ne lit donc jamais « le plan livré dépasse-t-il ? » sur le seul état corrigé — ce serait
 * saturé par construction (dépistage de la règle 15). Elle rejoue la RÈGLE sur les blocs livrés.
 *
 * L'écart est donné en MINUTES d'abord (corollaire de la règle 14 : un pourcentage sur une dose
 * dont la borne est absolue est ininterprétable — 40 min est un plafond en minutes).
 */
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { DOSE_CAP_MIN, parsePaceSec } from "../src/engine/constraintMatrix.ts";
import { stepWorkMin } from "../src/generator/renderer.ts";

const capDe = (z) => /\.vo2$/.test(z) || z === "tr.vam" ? DOSE_CAP_MIN.vo2
  : /\.thr$|\.css$/.test(z) || z === "tr.asc" || z === "tr.flatthr" ? DOSE_CAP_MIN.thr : null;

const parSport = {}, parZone = {}, parNiveau = {}, profils = new Set();
let blocs = 0, enMetres = 0, auPlafond = 0, dep = 0, depMin = 0, depMax = 0;
const exemples = [];
// §1 de l'arbitrage — les deux vérifications jointes à la recapture, plus la mesure de répartition.
const bordFormat = {}, bordSeance = {}, bordProfils = new Set();
const epingles = [];   // un bloc ÉPINGLÉ dans une zone plafonnée : la distance EST le stimulus
for (const { key, sport, a } of goldenProfiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  // ⚠ DEUX FAUTES D'INSTRUMENT SUCCESSIVES ICI, ET LA SECONDE EST LA PLUS INSTRUCTIVE.
  //   1. je passais les DÉFAUTS `{ css: 130, thrPace: 330 }` à `stepWorkMin` : sur un profil à
  //      4:30/km la durée sortait 22 % trop grande, et la sonde annonçait « 45,1 min pour un
  //      plafond de 40 » APRÈS un correctif censé les ramener à 40 ;
  //   2. corrigé en `parsePaceSec(a.css)`, elle rendait encore 45,0 — parce que `parsePaceSec`
  //      prend une DISCIPLINE en second argument et qu'un CSS de nage (« 1:55 » pour 100 m) est
  //      hors des bornes d'une allure au KM : sans le `"swim"`, elle rend **0**, en silence, et
  //      le `|| 130` du repli achève de masquer. Le moteur, lui, écrit `parsePaceSec(cssRaw,
  //      "swim")` depuis toujours. Mesurer avec la référence d'une autre discipline est la même
  //      faute d'unité que ce lot corrige, commise dans l'outil qui la mesure.
  const refs = { css: parsePaceSec(String(a.css ?? ""), "swim") || 130, thrPace: parsePaceSec(String(a.pace ?? "")) || 330 };
  for (const w of p.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
    for (const st of s.steps ?? []) {
      if (st.role !== "body") continue;
      const cap = capDe(String(st.zone || ""));
      if (cap == null) continue;
      blocs++;
      // VÉRIFICATION A (§1) — UN BLOC ÉPINGLÉ NE DOIT JAMAIS ÊTRE ÉCRÊTÉ PAR LE PLAFOND DE DOSE.
      // `pinned` dit « la distance EST le stimulus » (leçon I14, appliquée aux nages continues de
      // B-17 : réduire une continuité ne la rend pas plus facile, elle lui retire son objet). Le
      // plafond de dose ne teste PAS `pinned` — s'il croisait un bloc épinglé dans une zone
      // plafonnée, il le raboterait en silence. On mesure si le croisement existe.
      if (st.bnd?.pinned) epingles.push(`${key} · ${s.name.slice(0, 34)} · ${st.zone}`);
      if (st.distanceM == null) continue;      // prescrit en TEMPS : l'ancienne garde le voyait
      enMetres++;
      const travail = stepWorkMin(st, st.d || s.d, refs);
      if (travail > cap + 0.6) {               // DÉPASSE : l'ancienne garde le laissait passer
        dep++; depMin += travail - cap; depMax = Math.max(depMax, travail - cap);
        profils.add(key);
        parSport[sport] = (parSport[sport] || 0) + 1;
        parZone[String(st.zone)] = (parZone[String(st.zone)] || 0) + 1;
        parNiveau[String(a.level)] = (parNiveau[String(a.level)] || 0) + 1;
        if (exemples.length < 8) exemples.push(`${key} · ${s.name.slice(0, 28)} · ${st.zone} · ${(st.reps || 1)}×${st.distanceM} m = ${travail.toFixed(1)} min (plafond ${cap}, +${(travail - cap).toFixed(1)})`);
      } else if (travail >= cap - 0.6) {             // livré À la borne : la garde a mordu
        auPlafond++;
        bordProfils.add(key);
        bordFormat[`${sport}/${a.format}`] = (bordFormat[`${sport}/${a.format}`] || 0) + 1;
        bordSeance[s.name.replace(/\s*\(.*$/, "").slice(0, 32)] = (bordSeance[s.name.replace(/\s*\(.*$/, "").slice(0, 32)] || 0) + 1;
      }
    }
  }
}

console.log("LOT 1 — LE PLAFOND DE DOSE SUR LES BLOCS PRESCRITS EN MÈTRES\n");
console.log(`  blocs de qualité plafonnables : ${blocs}`);
console.log(`  …dont prescrits en MÈTRES     : ${enMetres} (${(100 * enMetres / (blocs || 1)).toFixed(1)} %) — invisibles pour l'ancienne garde`);
console.log(`  …dont livrés À la borne       : ${auPlafond}`);
console.log(`  …dont qui DÉPASSENT encore    : ${dep}${dep ? `  (total +${depMin.toFixed(0)} min · pire +${depMax.toFixed(1)} min)` : ""}`);
if (dep) {
  console.log(`\n  profils touchés : ${profils.size}`);
  console.log(`  par sport  : ${JSON.stringify(parSport)}`);
  console.log(`  par zone   : ${JSON.stringify(parZone)}`);
  console.log(`  par niveau : ${JSON.stringify(parNiveau)}`);
  for (const e of exemples) console.log(`     ${e}`);
}
// ── §1 de l'arbitrage — les deux vérifications et la mesure de répartition ────────────────
console.log(`\n  ── §1 · VÉRIFICATION A : aucun bloc ÉPINGLÉ n'entre dans une zone plafonnée`);
console.log(`     blocs épinglés rencontrés dans une zone à plafond de dose : ${epingles.length}${epingles.length ? " ✖" : " ✓"}`);
for (const e of epingles.slice(0, 5)) console.log(`        ${e}`);
if (!epingles.length) console.log(`     (les nages continues de B-17 sont en \`sw.aero\`, hors liste — le croisement n'existe`);
if (!epingles.length) console.log(`      pas AUJOURD'HUI, et le plafond ne teste pas \`pinned\` : c'est une garde LATENTE, pas posée.)`);

console.log(`\n  ── §1 · RÉPARTITION des ${auPlafond} blocs livrés à la borne — concentrés ou étalés ?`);
console.log(`     profils concernés : ${bordProfils.size}`);
const trie = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]);
for (const [k, n] of trie(bordFormat)) console.log(`        ${k.padEnd(14)} ${String(n).padStart(4)}  (${(100 * n / (auPlafond || 1)).toFixed(1)} %)`);
console.log(`     par séance :`);
for (const [k, n] of trie(bordSeance).slice(0, 6)) console.log(`        ${k.padEnd(34)} ${String(n).padStart(4)}`);

console.log(`\n  → ${enMetres === 0
  ? "AUCUN bloc de qualité en mètres — la sonde ne mesure rien, vérifier l'instrument."
  : dep > 0
  ? `${dep} bloc(s) en mètres DÉPASSENT leur plafond sur ${profils.size} profils : c'est la population\n    que l'ancienne garde laissait passer, et elle n'était visible d'aucune mesure préalable.`
  : auPlafond === 0
  ? "Ni dépassement ni bloc à la borne : la garde est lisible mais sans objet sur ce corpus."
  : `0 dépassement et ${auPlafond} bloc(s) livrés À la borne : la garde mord, et la population\n    ci-dessus est passée sous le plafond au lieu de le franchir.`}`);
