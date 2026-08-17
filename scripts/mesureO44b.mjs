#!/usr/bin/env node
/**
 * O-44 §2 — LA MESURE QUI DÉCIDE EST PAR SEMAINE, PAS PAR SÉANCE.
 *
 *   node scripts/mesureO44b.mjs
 *
 * « Une semaine à cinq séances dont une de 15 minutes est normale — c'est une séance d'appoint.
 * Une semaine à six séances dont cinq de 15 minutes est un plan que personne n'aurait dessiné.
 * Les deux produisent des points identiques dans une distribution par séance. »
 *
 * On mesure donc la PART de séances courtes DANS la semaine, sur les semaines de CHARGE
 * uniquement (l'affûtage et la récupération veulent des séances courtes, c'est leur objet).
 *
 * Critère de choix, posé avant la mesure :
 *   part faible et étalée sur tous les profils  → issue 3, ne rien poser ;
 *   une SOUS-POPULATION porte des semaines majoritairement courtes → issue 1, et c'est elle
 *   qu'il faut décrire dans le ticket, pas la distribution globale.
 */
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

const SEUIL = 20; // minutes — « courte » au sens du ticket

const parProfil = [];
let semaines = 0, semainesMajoritaires = 0;
for (const { key, sport, a } of goldenProfiles()) {
  if (sport !== "swim") continue;
  let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
  const parts = [];
  let majo = 0;
  for (const w of p.weeks ?? []) {
    if (w.phase?.id === "taper" || w.isRecup) continue; // la brièveté y est voulue
    const durees = [];
    for (const d of w.days ?? []) for (const s of d.sessions ?? [])
      if (s.d === "sw" && (s.min || 0) > 0) durees.push(s.min);
    if (durees.length < 2) continue; // une semaine à une seule nage n'a pas de « part »
    semaines++;
    const court = durees.filter((x) => x < SEUIL).length;
    const part = court / durees.length;
    parts.push(part);
    if (part > 0.5) { majo++; semainesMajoritaires++; }
  }
  if (parts.length)
    parProfil.push({ key, lvl: a.level, hist: a.history, fmt: a.format,
      part: parts.reduce((t, x) => t + x, 0) / parts.length, majo, nSem: parts.length });
}

const q = (xs, pr) => { const t = [...xs].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(pr * t.length))]; };
const parts = parProfil.map((x) => x.part);

console.log(`O-44 §2 — PART DE SÉANCES DE NAGE SOUS ${SEUIL} MIN, PAR SEMAINE DE CHARGE\n`);
console.log(`  profils de natation : ${parProfil.length} · semaines de charge à ≥ 2 nages : ${semaines}`);
console.log(`  semaines dont la MAJORITÉ des nages sont sous ${SEUIL} min : ${semainesMajoritaires} (${(100 * semainesMajoritaires / (semaines || 1)).toFixed(1)} %)\n`);
console.log(`  part moyenne par profil : médiane ${(q(parts, 0.5) * 100).toFixed(0)} % · p90 ${(q(parts, 0.9) * 100).toFixed(0)} % · max ${(Math.max(...parts) * 100).toFixed(0)} %`);
for (const [lo, hi] of [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.001]]) {
  const n = parProfil.filter((x) => x.part >= lo && x.part < hi).length;
  console.log(`     part ${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)} % : ${String(n).padStart(4)} profils  (${(100 * n / parProfil.length).toFixed(1)} %)`);
}

// LA SOUS-POPULATION : est-elle étalée, ou concentrée sur un axe ?
const gros = parProfil.filter((x) => x.part > 0.5).sort((a, b) => b.part - a.part);
console.log(`\n  PROFILS dont plus de la MOITIÉ des nages sont courtes, en moyenne : ${gros.length} / ${parProfil.length}`);
if (gros.length) {
  const cpt = (k) => { const m = {}; for (const g of gros) m[g[k]] = (m[g[k]] || 0) + 1; return JSON.stringify(m); };
  const ref = (k) => { const m = {}; for (const g of parProfil) m[g[k]] = (m[g[k]] || 0) + 1; return JSON.stringify(m); };
  console.log(`     par niveau     : ${cpt("lvl")}   (population totale : ${ref("lvl")})`);
  console.log(`     par historique : ${cpt("hist")}   (population totale : ${ref("hist")})`);
  console.log(`     par format     : ${cpt("fmt")}`);
  console.log(`     les pires :`);
  for (const g of gros.slice(0, 8)) console.log(`       ${g.key.padEnd(44)} ${(g.part * 100).toFixed(0)} % de nages courtes · ${g.majo}/${g.nSem} semaines majoritairement courtes`);
}

const etale = gros.length === 0 || (Math.max(...parts) < 0.6);
console.log(`\n  → ${etale
  ? `ÉTALÉ ET FAIBLE : aucune sous-population ne porte des semaines majoritairement courtes.\n    Les séances courtes sont de la variété légitime → ISSUE 3, ne rien poser, O-44 se ferme\n    sur la mesure et O-45 reste seul.`
  : `UNE SOUS-POPULATION EXISTE : ${gros.length} profils portent en moyenne plus de la moitié de\n    leurs nages sous ${SEUIL} min → ISSUE 1, et c'est CETTE population qu'il faut décrire dans le\n    ticket, pas la distribution globale.`}`);
