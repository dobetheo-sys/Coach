#!/usr/bin/env node
/**
 * bench_r14_1.js — banc de l'addendum R14.1 (indexation sur la distance au potentiel).
 *
 * Usage : node bench_r14_1.js [chemin/engine.js]
 *
 * PÉRIME dans bench_r14.js : R14.2 (leg vélo identique) et R14.6-A/B (spread symétrique).
 * Le reste de bench_r14.js reste applicable et doit continuer de passer.
 *
 * Rouge par construction contre un build antérieur à R14.1.
 */
"use strict";
const path = require("path");
require(path.resolve(process.argv[2] || "./js/engine.js"));
const E = globalThis.EBV2;
if (!E || typeof E.predict !== "function") { console.error("EBV2.predict introuvable."); process.exit(2); }

/* ---------------- outillage ---------------- */
const R = [];
const check = (id, label, fn) => { try { const r = fn(); R.push({ id, label, ok: !!r.ok, info: r.info || "" }); } catch (e) { R.push({ id, label, ok: false, info: "EXCEPTION: " + (e.human || e.message) }); } };
const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

/** Profil réel de l'écran de production : FTP 230, CSS 2'15, seuil 4:41, 85 kg, 70.3 à 43 sem. */
const BASE = {
  intent: "competition", level: "inter", history: "ancien", dispo: "quotidienne", shift_ok: "non",
  doubles: "oui", off_days: "non", sex: "H", sleep: "moyen", life_load: "normale", activity: "actif",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non",
  age: "30", weight: "85", height: "181", vol_max: "11", vol_recent: "9", sessions_max: "8",
  race_date: iso(43 * 7), format: "70.3", terrain: "vallonne",
  ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:41", css_known: "oui", css: "2:15",
};
const ans = (o) => Object.assign({}, BASE, o);
const proj = (a, sport) => (E.predict(sport || "tri", a, E.buildPlan(sport || "tri", a)) || {}).projected || null;
const both = (a, sport) => { const p = E.predict(sport || "tri", a, E.buildPlan(sport || "tri", a)); return { now: p.items || [], pj: p.projected }; };
const leg = (items, re) => (items || []).find((i) => re.test(i.leg)) || null;
const sec = (v) => { const m = String(v).split(/[–-]/)[0].trim(); const a = m.match(/^(\d+)h(\d+)$/), b = m.match(/^(\d+)'(\d+)$/); return a ? +a[1] * 3600 + +a[2] * 60 : b ? +b[1] * 60 + +b[2] : NaN; };
const secHi = (v) => { const m = String(v).split(/[–-]/)[1]; return m ? sec(m.trim()) : NaN; };
const watts = (v) => { const m = String(v).match(/(\d+)\D+(\d+)\s*W/); return m ? [+m[1], +m[2]] : null; };

/* ========== R14.1-A — la marge pilote le gain, pas l'ancienneté ========== */
check("R14.1-A", "à profil identique, 2,7 W/kg gagne au moins 2× plus que 4,5 W/kg", () => {
  const bas = proj(ans({ ftp: "230" }));            // 2,71 W/kg
  const haut = proj(ans({ ftp: "383" }));           // 4,51 W/kg
  if (!bas || !haut || !bas.gainPct) return { ok: false, info: "gainPct absent" };
  const r = bas.gainPct.ftp / Math.max(1e-6, haut.gainPct.ftp);
  return { ok: r >= 2, info: `2,7 W/kg → ${(bas.gainPct.ftp * 100).toFixed(1)}% · 4,5 W/kg → ${(haut.gainPct.ftp * 100).toFixed(1)}% (×${r.toFixed(1)})` };
});
check("R14.1-B", "l'ancienneté n'est plus qu'un modificateur (écart ≤ 45 %)", () => {
  const anc = proj(ans({ history: "ancien" })), conf = proj(ans({ history: "confirme" }));
  if (!anc || !conf || !anc.gainPct) return { ok: false, info: "gainPct absent" };
  const ecart = Math.abs(anc.gainPct.ftp - conf.gainPct.ftp) / Math.max(anc.gainPct.ftp, conf.gainPct.ftp);
  return { ok: ecart <= 0.45, info: `ancien ${(anc.gainPct.ftp * 100).toFixed(1)}% vs confirmé ${(conf.gainPct.ftp * 100).toFixed(1)}% → écart ${(ecart * 100).toFixed(0)}%` };
});
check("R14.1-C", "cas réel : 2,7 W/kg sur 43 sem → gain FTP dans [8 %, 20 %], CSS ≥ 8 %", () => {
  const pj = proj(ans({}));
  if (!pj || !pj.gainPct) return { ok: false, info: "gainPct absent" };
  const f = pj.gainPct.ftp, c = pj.gainPct.css;
  return { ok: f >= 0.08 && f <= 0.20 && c >= 0.08, info: `FTP ${(f * 100).toFixed(1)}% · CSS ${(c * 100).toFixed(1)}% · seuil ${(pj.gainPct.thrPace * 100).toFixed(1)}%` };
});
check("R14.1-C2", "plafonds absolus : aucun gain > 30 % quelle que soit la marge", () => {
  const pj = proj(ans({ ftp: "90", css: "3:30", pace: "7:30", race_date: iso(150 * 7), level: "debutant", history: "reprise", intent: "finir" }));
  if (!pj || !pj.gainPct) return { ok: false, info: "gainPct absent" };
  const max = Math.max(pj.gainPct.ftp, pj.gainPct.css, pj.gainPct.thrPace);
  return { ok: max <= 0.30, info: "gain max = " + (max * 100).toFixed(1) + "%" };
});

/* ========== R14.1-D/E — fourchette asymétrique (périme R14.6) ========== */
check("R14.1-D", "la borne HAUTE projetée ≈ la forme d'aujourd'hui (jamais plus lente, jamais −0,5 %)", () => {
  const { now, pj } = both(ans({}));
  if (!pj) return { ok: false, info: "pas de projection" };
  const a = leg(now, /CAP|course/i), b = leg(pj.items, /CAP|course/i);
  if (!a || !b) return { ok: false, info: "leg course absent" };
  const mNow = (sec(a.value) + secHi(a.value)) / 2, hi = secHi(b.value);
  const r = hi / mNow;
  return { ok: r >= 0.95 && r <= 1.0, info: `borne haute projetée ${(r * 100).toFixed(1)} % du temps actuel (attendu 95–100 %)` };
});
check("R14.1-E", "`gainBand` remplace `spreadPct` et encadre bien `gainPct`", () => {
  const pj = proj(ans({}));
  if (!pj) return { ok: false, info: "pas de projection" };
  if (!pj.gainBand) return { ok: false, info: "gainBand absent" };
  const [lo, hi] = pj.gainBand.ftp || [];
  const ok = lo >= 0 && lo < pj.gainPct.ftp && pj.gainPct.ftp < hi && pj.spreadPct === undefined;
  return { ok, info: `FTP [${(lo * 100).toFixed(1)}% … ${(pj.gainPct.ftp * 100).toFixed(1)}% … ${(hi * 100).toFixed(1)}%]` + (pj.spreadPct !== undefined ? " · spreadPct encore présent" : "") };
});

/* ========== R14.1-F — vélo : deux lignes (périme R14.2) ========== */
check("R14.1-F", "vélo projeté = cible ANCRÉE (identique) + FTP projetée supérieure", () => {
  const { now, pj } = both(ans({}));
  if (!pj) return { ok: false, info: "pas de projection" };
  const cur = leg(now, /Vélo|velo/i);
  const cible = leg(pj.items, /cible/i);
  const ftpL = leg(pj.items, /FTP projet/i);
  if (!cur || !cible || !ftpL) return { ok: false, info: "legs vélo attendus : « cible jour J » + « FTP projetée » — trouvés : " + (pj.items || []).map((i) => i.leg).join(" / ") };
  const w = watts(ftpL.value);
  const ok = cible.value === cur.value && w && w[0] > 230;
  return { ok, info: `cible ${cible.value} (actuel ${cur.value}) · ${ftpL.value}` };
});

/* ========== R14.1-G — facteur volume ========== */
check("R14.1-G", "un plan qui monte le volume projette plus qu'un plan de maintien (≥ 15 %)", () => {
  const maint = proj(ans({ vol_max: "9", vol_recent: "9" }));
  const monte = proj(ans({ vol_max: "13", vol_recent: "9" }));
  if (!maint || !monte || !maint.gainPct) return { ok: false, info: "gainPct absent" };
  const r = monte.gainPct.ftp / Math.max(1e-6, maint.gainPct.ftp);
  return { ok: r >= 1.15, info: `maintien ${(maint.gainPct.ftp * 100).toFixed(1)}% → montée ${(monte.gainPct.ftp * 100).toFixed(1)}% (×${r.toFixed(2)})` };
});

/* ========== R14.1-H — confiance honnête au jour 0 ========== */
check("R14.1-H", "plan jamais commencé → confiance « faible »", () => {
  const pj = proj(ans({}));
  if (!pj) return { ok: false, info: "pas de projection" };
  return { ok: pj.confidence === "faible", info: "confidence=" + pj.confidence + " (adhérence=" + pj.adherence + ")" };
});

/* ========== R14.1-I — levier poids sous garde ========== */
check("R14.1-I1", "levier poids absent tant qu'il n'est pas demandé", () => {
  const pj = proj(ans({ weight_lever: "non" }));
  if (!pj) return { ok: false, info: "pas de projection" };
  const txt = JSON.stringify(pj);
  return { ok: (pj.weightLever ?? null) === null && !/kg\b/.test(txt), info: pj.weightLever ? "weightLever présent sans demande" : "" };
});
check("R14.1-I2", "levier demandé : sensibilité affichée, aucune injonction, aucun calendrier", () => {
  const pj = proj(ans({ weight_lever: "oui", weight_target: "79" }));
  if (!pj) return { ok: false, info: "pas de projection" };
  if (!pj.weightLever) return { ok: false, info: "weightLever absent malgré demande explicite" };
  const txt = JSON.stringify(pj.weightLever).toLowerCase();
  const injonction = /(perds|tu dois|il faut|objectif poids|régime|deficit|déficit|kcal|calorie|semaine pour perdre)/.test(txt);
  const wkg = /w\/kg/.test(txt);
  return { ok: !injonction && wkg, info: injonction ? "texte injonctif détecté" : "sensibilité W/kg présente" };
});
check("R14.1-I3", "gardes dures : IMC cible < 18,5, mineur, drapeau médical → levier neutralisé", () => {
  const bas = proj(ans({ weight_lever: "oui", weight_target: "58", height: "181" }));   // IMC 17,7
  const min = proj(ans({ weight_lever: "oui", weight_target: "79", age: "16" }));
  const med = proj(ans({ weight_lever: "oui", weight_target: "79", med_pain: "oui" }));
  const off = (x) => x === null || (x.weightLever ?? null) === null; // pas de projection = pas de levier
  return { ok: off(bas) && off(min) && off(med), info: `IMC17,7:${off(bas)} mineur:${off(min)} drapeau médical:${off(med)}` };
});

/* ========== Non-régressions ========== */
check("R14.1-NR1", "la prédiction FORME ACTUELLE est inchangée par R14.1", () => {
  const { now } = both(ans({}));
  const sw = leg(now, /Natation/i), bk = leg(now, /Vélo/i), rn = leg(now, /CAP|course/i);
  if (!sw || !bk || !rn) return { ok: false, info: "legs manquants" };
  const w = watts(bk.value);
  return { ok: w && w[0] === 175 && w[1] === 191 && /^4\d'\d\d/.test(sw.value), info: `${sw.value} · ${bk.value} · ${rn.value}` };
});
check("R14.1-NR2", "P8 tient toujours : sans référence mesurée, rien n'est projeté", () => {
  const pj = proj(ans({ ftp_known: "non", pace_known: "non", css_known: "non", ftp: "", pace: "", css: "" }));
  return { ok: pj === null || pj.applicable === false, info: pj ? "applicable=" + pj.applicable : "projected=null" };
});

/* ---------------- rapport ---------------- */
let fail = 0;
console.log("\n== BANC R14.1 — distance au potentiel · moteur " + (E.version || "?") + " ==");
console.log("   (périme R14.2 et R14.6-A/B de bench_r14.js)\n");
for (const r of R) { if (!r.ok) fail++; console.log((r.ok ? "  PASS " : "✗ FAIL ") + r.id.padEnd(13) + r.label + (r.info ? "  — " + r.info : "")); }
console.log("\n" + (fail ? fail + " échec(s)." : "Tout passe."));
process.exit(fail ? 1 : 0);
