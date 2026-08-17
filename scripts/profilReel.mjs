#!/usr/bin/env node
/**
 * UN PROFIL RÉEL TRAVERSE LA CHAÎNE COMPLÈTE — la liste du fondateur, cochée MÉCANIQUEMENT.
 *
 *   npm run profil:reel -- chemin/vers/profil.json
 *
 * Six lots ont été livrés depuis la dernière traversée par un profil réel (O-42, lot 1, O-54,
 * O-56, O-57, B-17 complet). Ce que ces lots ne disent pas et que ce run dit : **est-ce que la
 * machinerie produit un plan sensé pour quelqu'un de réel.**
 *
 * ── CE HARNAIS NE FABRIQUE AUCUNE DONNÉE ──────────────────────────────────────────────────
 *
 * Il LIT un fichier de profil et REFUSE de tourner sans. C'est délibéré, et c'est la leçon U14 :
 * le harnais E2E remplissait tout champ libre non déclaré par le MILIEU de ses bornes, et
 * fabriquait ainsi un athlète de 138 kg dont le vélo sortait à 1 h 57 au lieu de 1 h 14 — le
 * modèle avait raison sur une entrée absurde que rien ne signalait. Un run « sur un profil réel »
 * dont la moitié des réponses seraient inventées répondrait à côté de la question qu'il pose.
 *
 * Il DÉCLARE aussi les clés du schéma que le profil ne renseigne pas : une réponse absente n'est
 * pas neutre, elle prend un défaut, et U14 a montré que ce défaut allait vers le PERMISSIF.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import "../src/app/bridge.ts";
import { ANSWER_SCHEMA } from "../src/engine/answerSchema.ts";
import { DOSE_CAP_MIN, parsePaceSec } from "../src/engine/constraintMatrix.ts";
import { stepWorkMin } from "../src/generator/renderer.ts";

const arg = process.argv.slice(2).find((x) => !x.startsWith("-"));
if (!arg) {
  console.error("usage : npm run profil:reel -- chemin/vers/profil.json");
  console.error("\nLe fichier est un objet JSON de réponses (les clés d'ANSWER_SCHEMA).");
  console.error("Ce harnais ne fabrique AUCUNE valeur : sans fichier, il ne tourne pas (leçon U14).");
  process.exit(2);
}
const chemin = resolve(arg);
if (!existsSync(chemin)) { console.error(`✖ introuvable : ${chemin}`); process.exit(2); }
const a = JSON.parse(readFileSync(chemin, "utf8"));
const sport = String(a.sport || "tri");

const L = [];
const ok = (c, t, d) => L.push({ c, t, d });

console.log(`PROFIL RÉEL — ${chemin}\n`);

// ---- 0. Ce que le profil ne dit pas ------------------------------------------------------
const attendues = Object.entries(ANSWER_SCHEMA)
  .filter(([, v]) => !v.sports || v.sports.includes(sport)).map(([k]) => k);
const absentes = attendues.filter((k) => a[k] === undefined || a[k] === "");
console.log(`  clés du schéma pour « ${sport} » : ${attendues.length} · non renseignées : ${absentes.length}`);
if (absentes.length) console.log(`     ${absentes.join(" ")}`);
console.log("     (une réponse absente prend un DÉFAUT — U14 a montré qu'il allait vers le permissif)\n");

let p;
try { p = globalThis.EBV2.buildPlan(sport, a); }
catch (e) { console.error(`✖ REFUS D'ENTRÉE : ${e && e.message ? e.message : e}`); process.exit(1); }

const dec = (p._v2 || {}).decisions || [];
const warn = (p._v2 || {}).warnings || [];
const D = (id) => dec.find((d) => d.id === id);
const refs = { css: parsePaceSec(String(a.css ?? ""), "swim") || 130, thrPace: parsePaceSec(String(a.pace ?? "")) || 330 };

// ---- LA NAGE -----------------------------------------------------------------------------
console.log("── LA NAGE — tout ce qui a changé ─────────────────────────────────────────\n");

const gate = D("B17-continuite");
const test = [];
let paliers = [], eauLibre = 0, titresFaux = 0, blocsCss = [], nageMin = 0, totMin = 0, nSw = 0;
for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) {
  if (s.d === "rs") continue;
  totMin += s.min || 0;
  if (s.d === "sw") { nageMin += s.min || 0; nSw++; }
  if (/Test de continuité/.test(s.name || "")) test.push(`S${w.num}`);
  const cont = (s.steps || []).find((st) => st.role === "body" && st.bnd && st.bnd.pinned && st.distanceM != null);
  if (cont) {
    const livre = (cont.reps || 1) * cont.distanceM;
    paliers.push({ sem: w.num, m: livre, phase: w.phase.id, ow: /eau libre/.test(s.name || "") });
    if (/eau libre/.test(s.name || "")) eauLibre++;
    const m = /— (\d+) m d'affilée/.exec(String(s.name || ""));
    if (m && +m[1] !== livre) titresFaux++;
  }
  for (const st of s.steps || []) {
    if (st.role !== "body" || !/\.css$/.test(String(st.zone || ""))) continue;
    blocsCss.push(stepWorkMin(st, st.d || s.d, refs));
  }
}
paliers.sort((x, y) => x.sem - y.sem);

ok(!!(a.longest_swim_m || a.longest_swim_known === "non") , "le gate B-17 a une réponse à lire",
  a.longest_swim_known === "non" ? "« je ne sais pas » déclaré" : `longest_swim_m = ${a.longest_swim_m || "∅"}`);
ok(test.length > 0 || a.longest_swim_known !== "non", "test de continuité en 1ʳᵉ séance SI la continuité est inconnue",
  test.length ? `test prescrit ${test.join(", ")}` : "pas de test — la continuité est déclarée, c'est le comportement attendu");
ok(paliers.length >= 1, "paliers de nage continue prescrits",
  paliers.length ? paliers.map((x) => `S${x.sem}:${x.m}m/${x.phase}`).join(" · ") : "AUCUN");
ok(eauLibre >= 1, "au moins une continue en EAU LIBRE",
  eauLibre ? `${eauLibre}, la première en S${(paliers.find((x) => x.ow) || {}).sem}` : "aucune");
if (paliers.length && eauLibre) {
  const iOw = paliers.findIndex((x) => x.ow);
  ok(iOw <= 1, "…placée TÔT dans la progression", `rang ${iOw + 1} sur ${paliers.length}`);
}
ok(titresFaux === 0, "aucun titre n'annonce une distance absente de la séance (O-54)",
  titresFaux ? `${titresFaux} titre(s) mentent` : `${paliers.length} titres vérifiés`);
ok(String(a.leg_swim_env || "") !== "", "leg_swim_env renseigné (le message eau libre en dépend)", `leg_swim_env = ${a.leg_swim_env || "∅"}`);
ok(String(a.milieu || "") !== "", "milieu renseigné", `milieu = ${a.milieu || "∅"}`);

const hors = blocsCss.filter((x) => x > DOSE_CAP_MIN.thr + 0.6);
ok(hors.length === 0, `nage seuil plafonnée à ${DOSE_CAP_MIN.thr} min de travail (lot 1)`,
  `${blocsCss.length} blocs sw.css · max ${Math.max(0, ...blocsCss).toFixed(1)} min · ${hors.length} au-dessus`);

// ---- LE PLAN DANS SON ENSEMBLE -----------------------------------------------------------
console.log("");
const r202 = p._r202;
if (r202) {
  let picLivre = 0;
  for (const w of p.weeks) {
    const m = w.days.flatMap((d) => d.sessions).filter((s) => s.d !== "rs").reduce((t, s) => t + (s.min || 0), 0);
    picLivre = Math.max(picLivre, m);
  }
  ok(Math.abs(r202.volPeak - picLivre / 60) <= 0.15, "le pic ANNONCÉ égale le pic LIVRÉ (O-35)",
    `annoncé ${r202.volPeak} h · livré ${(picLivre / 60).toFixed(2)} h`);
  const arg = (r202.plafonds || []).find((x) => x.id === r202.argmin);
  ok(!!arg, "« pourquoi ce plan » nomme la contrainte qui borne RÉELLEMENT (R20.2)",
    arg ? `${r202.argmin} — ${arg.quoi} (retire ${(+arg.retire).toFixed(2)} h)` : "argmin introuvable");
}
const rabat = dec.find((d) => d.id === "B17-continuite" && /au lieu de/.test(String(d.val)));
ok(!rabat, "le format n'est pas rabattu", rabat ? `RABATTU : ${rabat.val} — ${rabat.why}` : `format ${a.format} conservé`);

// ---- LA NAGE EST-ELLE LE FACTEUR LIMITANT ? ----------------------------------------------
console.log("");
console.log("── la nage est-elle traitée comme le facteur limitant ? ────────────────────\n");
const partNage = totMin ? (100 * nageMin) / totMin : 0;
let joursNage = 0, semainesCharge = 0;
for (const w of p.weeks) {
  if (w.isRecup || w.phase.id === "taper") continue;
  semainesCharge++;
  joursNage += w.days.filter((d) => d.sessions.some((s) => s.d === "sw" && (s.min || 0) > 0)).length;
}
const edu = p.weeks.flatMap((w) => w.days).flatMap((d) => d.sessions).filter((s) => /éducatif/i.test(s.name + " " + (s.note || ""))).length;
console.log(`  part de la nage dans le volume : ${partNage.toFixed(1)} %`);
console.log(`  fréquence en semaine de charge : ${(joursNage / (semainesCharge || 1)).toFixed(2)} jours/semaine`);
console.log(`  séances portant des éducatifs  : ${edu}`);
console.log("  ⚠ `swim_limit` N'EST PAS POSÉE EN TRIATHLON : elle est déclarée `sports: [\"swim\"]`.");
console.log("    Ce n'est donc pas « quelque chose ne la lit pas » — elle n'est jamais demandée.");
console.log(`    Ces trois chiffres sont à JUGER, pas à cocher : aucune garde du dépôt ne dit ce`);
console.log(`    qu'ils devraient valoir, parce que c'est un jugement d'entraînement.\n`);

// ---- LA DISPONIBILITÉ --------------------------------------------------------------------
console.log("── la disponibilité ───────────────────────────────────────────────────────\n");
const parJour = {};
for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) if (s.d !== "rs")
  parJour[d.jour] = (parJour[d.jour] || 0) + 1;
console.log(`  dispo déclarée : ${a.dispo || "∅"} · off_days ${a.off_days || "∅"} ${a.off_which || ""}`);
console.log(`  séances par jour de semaine : ${JSON.stringify(parJour)}`);
console.log(`  (le moteur place des JOURS, pas des HEURES : une contrainte « 17h-22h » n'a aucune`);
console.log(`   clé pour être exprimée — à observer, pas à cocher.)\n`);

// ---- VERDICT -----------------------------------------------------------------------------
console.log("── la liste ───────────────────────────────────────────────────────────────\n");
for (const x of L) console.log(`  ${x.c ? "[x]" : "[ ]"} ${x.t}\n         ${x.d}`);
const ko = L.filter((x) => !x.c).length;
console.log(`\n  ${L.length - ko}/${L.length} cases cochées${ko ? ` · ${ko} NON cochée(s) — chacune est un ticket` : " — le profil traverse la chaîne intact"}`);
if (warn.length) { console.log(`\n  avertissements du moteur (${warn.length}) :`); for (const w of warn.slice(0, 6)) console.log(`     · ${String(w).slice(0, 150)}`); }
process.exit(0);
