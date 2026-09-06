#!/usr/bin/env node
/**
 * BACKLOG DE MESURES — SUITE DE `52-analyse-priorites-moteur-conseiller-externe.md`.
 *
 *   npm run mesure:backlog-priorites [section]
 *
 * Aucune règle n'est écrite ici — ce script MESURE, conformément à la règle 7 (« mesurer avant
 * d'écrire »), les questions du backlog transmis par le conseiller externe
 * (`53-backlog-mesures-avant-regles.md` côté synthèses). Chaque section répond à UNE ligne du
 * backlog. `src/` n'est pas modifié.
 *
 * Sections : `qualite` (budget séances qualitatives), `force-velo` (fréquence bk.frc par phase),
 * `repos` (semaines de charge sans jour off), `rebond` (rebond post-récup vs C22),
 * `pic-taper` (composition du dernier jour de la dernière semaine de peak), `cap-seuil`
 * (part de qualité en spec/peak). Sans argument : toutes les sections.
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
import { intensitySplit } from "../src/engine/loadModel.ts";
import { C22_MAX_WEEKLY_GROWTH } from "../src/engine/constraintMatrix.ts";

const section = process.argv[2];
const run = (name) => !section || section === name;

// ---- Collecte commune : génère chaque profil UNE fois, réutilisé par toutes les sections ----
const plans = [];
for (const { key, sport, a } of profiles()) {
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  if (!p || !Array.isArray(p.weeks)) continue;
  plans.push({ key, sport, a, p });
}
console.log(`(${plans.length} profils générés avec succès)\n`);

const isCharge = (w) => !w.isRecup && w.phase?.id !== "taper";
// `prescribedMin` n'existe que sur le résultat de `auditPlan()` (WeekAudit), pas sur les
// semaines brutes rendues par `buildPlan()` — recalculé ici directement depuis les séances.
const chargeMinOf = (w) => (w.days || []).reduce((t, d) => t + (d.sessions || []).reduce((t2, s) => t2 + (s.d === "rs" ? 0 : (s.min || 0)), 0), 0);

// ================================================================================
if (run("qualite")) {
  console.log("═══ BUDGET DE SÉANCES QUALITATIVES — combien de créneaux dur/modéré par semaine, indépendamment des minutes ═══\n");
  const parSport = {};
  let semainesGe3 = 0, semainesTot = 0;
  for (const { sport, p } of plans) {
    for (const w of p.weeks) {
      if (!isCharge(w)) continue;
      let nQual = 0;
      for (const d of w.days || []) for (const s of d.sessions || []) {
        if (s.d === "rs") continue;
        let sp; try { sp = intensitySplit(s); } catch { continue; }
        if ((sp.modMin || 0) + (sp.hardMin || 0) > 0) nQual++;
      }
      semainesTot++;
      if (nQual >= 3) semainesGe3++;
      (parSport[sport] ||= { tot: 0, ge3: 0, dist: {} }).tot++;
      if (nQual >= 3) parSport[sport].ge3++;
      parSport[sport].dist[nQual] = (parSport[sport].dist[nQual] || 0) + 1;
    }
  }
  console.log(`  Global : ${semainesGe3}/${semainesTot} semaines de charge (${(semainesGe3 / semainesTot * 100).toFixed(1)} %) portent ≥3 créneaux qualitatifs (dur ou modéré), quel que soit leur plafond en minutes.\n`);
  console.log("  Par sport (part de semaines à ≥3 créneaux qualitatifs) :");
  for (const [sport, r] of Object.entries(parSport)) {
    const dist = Object.entries(r.dist).sort((a, b) => +a[0] - +b[0]).map(([n, c]) => `${n}:${c}`).join(" ");
    console.log(`    ${sport.padEnd(10)} ${(r.ge3 / r.tot * 100).toFixed(1).padStart(5)} %  (n=${r.tot})   distribution [${dist}]`);
  }
  console.log("");
}

// ================================================================================
if (run("force-velo")) {
  console.log("═══ FRÉQUENCE DE `bk.frc` (Force en côte / Force basse cadence) PAR PHASE ═══\n");
  const sportsAvecVelo = new Set(["bike", "tri", "duathlon"]);
  const parPhase = {};
  for (const { sport, p } of plans) {
    if (!sportsAvecVelo.has(sport)) continue;
    for (const w of p.weeks) {
      if (w.isRecup) continue;
      const ph = w.phase?.id || "?";
      const rec = (parPhase[ph] ||= { semaines: 0, avecForce: 0 });
      rec.semaines++;
      let trouve = false;
      for (const d of w.days || []) for (const s of d.sessions || []) {
        if (s.d === "bk" && /^Force /.test(s.name || "")) trouve = true;
      }
      if (trouve) rec.avecForce++;
    }
  }
  console.log("  Part des semaines (hors récup) qui portent au moins une séance de force vélo, par phase :");
  for (const ph of ["base", "dev", "spec", "peak", "taper"]) {
    const r = parPhase[ph]; if (!r) continue;
    console.log(`    ${ph.padEnd(6)} ${(r.avecForce / r.semaines * 100).toFixed(1).padStart(5)} %  (${r.avecForce}/${r.semaines})`);
  }
  console.log("\n  (proxy : match sur le NOM de séance `/^Force /` — fragile à un renommage, suffisant pour une mesure ponctuelle)\n");
}

// ================================================================================
if (run("repos")) {
  console.log("═══ SEMAINES DE CHARGE SANS AUCUN JOUR `off` EXPLICITE ═══\n");
  const parSport = {};
  let sansOff = 0, sansOffNiRecup = 0, tot = 0;
  for (const { sport, p } of plans) {
    for (const w of p.weeks) {
      if (!isCharge(w)) continue;
      const aOff = (w.days || []).some((d) => d.charge === "off");
      const aOffOuRecup = (w.days || []).some((d) => d.charge === "off" || d.charge === "recup");
      tot++;
      const r = (parSport[sport] ||= { tot: 0, sansOff: 0, sansOffNiRecup: 0 });
      r.tot++;
      if (!aOff) { sansOff++; r.sansOff++; }
      if (!aOffOuRecup) { sansOffNiRecup++; r.sansOffNiRecup++; }
    }
  }
  console.log(`  Global : ${sansOff}/${tot} semaines de charge (${(sansOff / tot * 100).toFixed(1)} %) n'ont AUCUN jour "off" (repos total) dans le schéma déclaré.`);
  console.log(`  Global : ${sansOffNiRecup}/${tot} semaines (${(sansOffNiRecup / tot * 100).toFixed(1)} %) n'ont NI "off" NI "recup" (récupération active) — aucun jour de décharge d'aucune sorte.\n`);
  console.log("  Par sport (colonnes : % sans off · % sans off NI recup) :");
  for (const [sport, r] of Object.entries(parSport)) {
    console.log(`    ${sport.padEnd(10)} sans off ${(r.sansOff / r.tot * 100).toFixed(1).padStart(5)} %   sans off-ni-recup ${(r.sansOffNiRecup / r.tot * 100).toFixed(1).padStart(5)} %  (n=${r.tot})`);
  }
  console.log("\n  (rappel : `dailyAdjuster` peut encore transformer un jour PRÉVU en repos via readiness — ceci mesure uniquement le SCHÉMA DE BASE, avant toute adaptation quotidienne)\n");
}

// ================================================================================
if (run("rebond")) {
  console.log("═══ REBOND POST-RÉCUP : charge(N+1) > charge(N-1) × C22 ═══\n");
  let paires = 0, rebonds = 0;
  const casPires = [];
  for (const { key, p } of plans) {
    const ws = p.weeks;
    for (let i = 1; i < ws.length - 1; i++) {
      if (!ws[i].isRecup) continue;
      const avant = ws[i - 1], apres = ws[i + 1];
      if (avant.isRecup || apres.isRecup) continue;
      if (avant.phase?.id === "taper" || apres.phase?.id === "taper") continue;
      const cAvant = chargeMinOf(avant), cApres = chargeMinOf(apres);
      if (!cAvant || !cApres) continue;
      paires++;
      const ratio = cApres / cAvant;
      if (ratio > C22_MAX_WEEKLY_GROWTH) {
        rebonds++;
        casPires.push({ key, sAvant: avant.num, sApres: apres.num, cAvant, cApres, ratio });
      }
    }
  }
  console.log(`  ${rebonds}/${paires} paires (charge avant récup → charge après récup) dépassent le facteur C22 (${C22_MAX_WEEKLY_GROWTH}) appliqué à la charge D'AVANT la récup.\n`);
  if (casPires.length) {
    casPires.sort((a, b) => b.ratio - a.ratio);
    console.log("  Les 5 pires cas (ratio charge-après / charge-avant) :");
    for (const c of casPires.slice(0, 5)) {
      console.log(`    ${c.key} — S${c.sAvant}(${Math.round(c.cAvant)}min) → récup → S${c.sApres}(${Math.round(c.cApres)}min) = ×${c.ratio.toFixed(2)}`);
    }
  } else {
    console.log("  Aucun cas trouvé sur ce corpus : le rebond post-récup ne dépasse jamais la progression C22 normale appliquée à la charge pré-récup.");
  }
  console.log("");
}

// ================================================================================
if (run("pic-taper")) {
  console.log("═══ COMPOSITION DU DERNIER JOUR DE LA DERNIÈRE SEMAINE DE PEAK (avant le premier jour de taper) ═══\n");
  const dist = {};
  let total = 0;
  for (const { p } of plans) {
    const ws = p.weeks;
    for (let i = 0; i < ws.length - 1; i++) {
      if (ws[i].phase?.id === "peak" && ws[i + 1].phase?.id === "taper") {
        const jours = ws[i].days || [];
        if (!jours.length) continue;
        const dernier = jours[jours.length - 1];
        dist[dernier.charge] = (dist[dernier.charge] || 0) + 1;
        total++;
      }
    }
  }
  console.log(`  ${total} transitions peak→taper trouvées sur le corpus.\n`);
  console.log("  Charge du dernier jour de la dernière semaine de peak :");
  for (const [charge, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${charge.padEnd(8)} ${(n / total * 100).toFixed(1).padStart(5)} %  (${n})`);
  }
  console.log("");
}

// ================================================================================
if (run("cap-seuil")) {
  console.log("═══ PART DE QUALITÉ (MODÉRÉ+DUR) EN PHASES SPEC/PEAK, PAR SPORT ═══\n");
  const parSport = {};
  for (const { sport, p } of plans) {
    for (const w of p.weeks) {
      if (w.isRecup) continue;
      if (w.phase?.id !== "spec" && w.phase?.id !== "peak") continue;
      let easy = 0, mod = 0, hard = 0;
      for (const d of w.days || []) for (const s of d.sessions || []) {
        if (s.d === "rs") continue;
        let sp; try { sp = intensitySplit(s); } catch { continue; }
        easy += sp.easyMin || 0; mod += sp.modMin || 0; hard += sp.hardMin || 0;
      }
      const tot = easy + mod + hard;
      if (!tot) continue;
      const r = (parSport[sport] ||= { easy: 0, mod: 0, hard: 0, tot: 0, n: 0 });
      r.easy += easy; r.mod += mod; r.hard += hard; r.tot += tot; r.n++;
    }
  }
  console.log("  Moyenne (toutes semaines spec/peak confondues), par sport :");
  for (const [sport, r] of Object.entries(parSport)) {
    console.log(`    ${sport.padEnd(10)} facile ${(r.easy / r.tot * 100).toFixed(1).padStart(5)} %  modéré ${(r.mod / r.tot * 100).toFixed(1).padStart(5)} %  dur ${(r.hard / r.tot * 100).toFixed(1).padStart(5)} %   (n=${r.n} semaines)`);
  }
  console.log("\n  (intensitySplit() appelé SANS refs athlète réelles — zones absolues correctement classées, bandes course/allure par défaut : approximation suffisante pour une tendance de corpus, pas pour un profil individuel)\n");
}
