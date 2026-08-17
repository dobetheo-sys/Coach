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
 * Cette sonde ne lit PAS le plan livré : le plafond y a déjà mordu, donc plus rien ne dépasse et
 * la mesure serait saturée par construction (dépistage de la règle 15). Elle rejoue la RÈGLE sur
 * les blocs livrés pour dire lesquels DÉPASSERAIENT si elle ne les lisait pas — c'est-à-dire
 * exactement la population que l'ancienne garde laissait passer.
 */
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";
import { DOSE_CAP_MIN } from "../src/engine/constraintMatrix.ts";
import { stepWorkMin } from "../src/generator/renderer.ts";
import { parsePaceSec } from "../src/engine/constraintMatrix.ts";

const capDe = (z) => /\.vo2$/.test(z) || z === "tr.vam" ? DOSE_CAP_MIN.vo2
  : /\.thr$|\.css$/.test(z) || z === "tr.asc" || z === "tr.flatthr" ? DOSE_CAP_MIN.thr : null;

const parSport = {}, parZone = {};
let blocs = 0, enMetres = 0, auPlafond = 0;
const exemples = [];
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
      if (st.distanceM == null) continue;      // prescrit en TEMPS : l'ancienne garde le voyait
      enMetres++;
      const travail = stepWorkMin(st, st.d || s.d, refs);
      // « au plafond » : le bloc livré est À la borne — signe que la garde a mordu.
      if (travail >= cap - 0.6) {
        auPlafond++;
        parSport[sport] = (parSport[sport] || 0) + 1;
        parZone[String(st.zone)] = (parZone[String(st.zone)] || 0) + 1;
        if (exemples.length < 6) exemples.push(`${key} · ${s.name.slice(0, 30)} · ${st.zone} · ${(st.reps || 1)}×${st.distanceM} m = ${travail.toFixed(1)} min (plafond ${cap})`);
      }
    }
  }
}

console.log("LOT 1 — LE PLAFOND DE DOSE SUR LES BLOCS PRESCRITS EN MÈTRES\n");
console.log(`  blocs de qualité plafonnables : ${blocs}`);
console.log(`  …dont prescrits en MÈTRES     : ${enMetres} (${(100 * enMetres / (blocs || 1)).toFixed(1)} %) — invisibles pour l'ancienne garde`);
console.log(`  …dont livrés À la borne       : ${auPlafond}`);
console.log(`\n  par sport : ${JSON.stringify(parSport)}`);
console.log(`  par zone  : ${JSON.stringify(parZone)}`);
for (const e of exemples) console.log(`     ${e}`);
console.log(`\n  → ${enMetres === 0
  ? "AUCUN bloc de qualité en mètres — la sonde ne mesure rien, vérifier l'instrument."
  : auPlafond === 0
  ? "Le plafond ne mord sur AUCUN bloc en mètres : la garde est désormais lisible mais sans objet\n    sur ce corpus — l'écart au golden vient d'ailleurs, à expliquer avant de recapturer."
  : `${auPlafond} bloc(s) en mètres sont livrés À la borne : c'est la population que l'ancienne\n    garde laissait passer, et elle n'était visible d'aucune mesure préalable.`}`);
