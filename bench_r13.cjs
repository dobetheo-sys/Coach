#!/usr/bin/env node
/**
 * bench_r13.js — banc de non-régression du handoff R13 (audit standalone-4, 31/07/2026).
 *
 * Usage : node bench_r13.js [chemin/engine.js] [chemin/standalone.html]
 *   - engine.js : bundle IIFE qui définit globalThis.EBV2 (build `npm run build:app`)
 *   - standalone.html : fichier autonome généré (pour les contrôles R13.2)
 *
 * Contrat : AVANT correctifs, ce banc DOIT échouer sur R13.1/2/3/4/5/6 (il détecte les
 * défauts mesurés dans l'audit). APRÈS correctifs, tout doit passer, non-régressions
 * comprises. Un banc qui passe avant le correctif ne teste rien.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ENGINE = process.argv[2] || "./js/engine.js";
const HTML = process.argv[3] || null;

require(path.resolve(ENGINE));
const E = globalThis.EBV2;
if (!E || typeof E.buildPlan !== "function") { console.error("EBV2 introuvable — vérifie le chemin du bundle."); process.exit(2); }

/* ---------------- outillage ---------------- */
const RESULTS = [];
function check(id, label, fn) {
  try { const r = fn(); RESULTS.push({ id, label, ok: !!r.ok, info: r.info || "" }); }
  catch (e) { RESULTS.push({ id, label, ok: false, info: "EXCEPTION: " + (e.human || e.message) }); }
}
function xfail(id, label, fn) { // attendu en échec AVANT correctif — même mécanique, le rapport le dit
  check(id, label, fn);
}
const weekMin = (w) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
const peakMin = (p) => Math.max(...p.weeks.map(weekMin));
const chargeWeeks = (p) => p.weeks.filter((w) => !w.isRecup && w.phase.id !== "taper");
const taperWeeks = (p) => p.weeks.filter((w) => w.phase.id === "taper");
const zonesOf = (p, disc) => { const z = new Set(); for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) if (!disc || s.d === disc) for (const st of (s.steps || [])) if (st.zone) z.add(st.zone); return z; };
const vo2Steps = (p) => { let n = 0; for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) for (const st of (s.steps || [])) if (/vo2/.test(String(st.zone || ""))) n++; return n; };
const dec = (p, id) => (p._v2.decisions || []).filter((x) => x.id === id);
const warns = (p, re) => (p._v2.warnings || []).filter((x) => re.test(x));
const swimPerWeek = (p, phases) => { const ws = p.weeks.filter((w) => phases.includes(w.phase.id) && !w.isRecup); if (!ws.length) return 0; let n = 0; for (const w of ws) for (const d of w.days) for (const s of d.sessions) if (s.d === "sw") n++; return n / ws.length; };

const BASE = {
  intent: "competition", level: "inter", history: "ancien", dispo: "partielle", doubles: "non",
  off_days: "non", sex: "H", sleep: "moyen", life_load: "normale", activity: "actif",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "oui",
  age: "30", weight: "85", height: "181", vol_max: "12", vol_recent: "9", sessions_max: "8",
  race_date: "2027-09-12", format: "Full", terrain: "vallonne",
  ftp_known: "oui", ftp: "227", pace_known: "oui", pace: "4:50", css_known: "oui", css: "2:00",
};
const build = (sport, over) => E.buildPlan(sport, Object.assign({}, BASE, over));

/* ================= R13.1 — âge : source unique ================= */
/**
 * ⚠ FORMAT DES CAS MINEURS : « 70.3 » → « M » (R15.7-C, 01/08/2026). LES ID NE BOUGENT PAS.
 *
 * Ces cas testent la PROTECTION DE CHARGE d'un mineur (R6.3 : ×0,70, zéro VO2max, récup
 * allongée). Ils la testaient sur un format 70.3 — c'est-à-dire sur une épreuve dont
 * l'inscription est refusée avant 18 ans. R15.7-C ferme ce trou : un mineur reçoit désormais
 * un REFUS motivé sur les formats réglementés, et non plus un plan d'un an pour une course
 * où il ne pourra pas prendre le départ.
 *
 * Le contrat a donc changé, et ces cas doivent suivre — sinon ils testeraient un chemin que
 * le moteur n'emprunte plus. Ils passent au format « M », ouvert aux mineurs, où R6.3 fait
 * exactement le travail qu'ils vérifient. C'est le même geste que R11 sur E5/C2/E3 du banc v6 :
 * l'instrument suit le contrat, l'identifiant reste, la raison est écrite.
 * Le refus lui-même est couvert par R15.7-C1 du banc R15.
 */
const FMT_MINEUR = "M";
const pAdult = build("tri", { format: FMT_MINEUR, race_date: "2027-05-16", vol_max: "10", sessions_max: "6" });
const adultPeak = peakMin(pAdult);
for (const age of ["10", "12", "13"]) {
  xfail("R13.1-A" + age, "mineur " + age + " ans : protection R6.3 appliquée", () => {
    const p = build("tri", { age, format: FMT_MINEUR, race_date: "2027-05-16", vol_max: "10", sessions_max: "6" });
    const minor = dec(p, "R6.3").some((d) => /mineur/i.test(d.what));
    const w = warns(p, /18 ans/).length > 0;
    const ok = minor && w && vo2Steps(p) === 0 && peakMin(p) <= adultPeak * 0.78;
    return { ok, info: `R6.3:${minor} warn:${w} vo2:${vo2Steps(p)} pic:${(peakMin(p) / 60).toFixed(1)}h vs adulte ${(adultPeak / 60).toFixed(1)}h` };
  });
}
xfail("R13.1-B", "98 ans : protection master appliquée (vol ×0.85, récup /3)", () => {
  const p = build("tri", { age: "98", format: FMT_MINEUR, race_date: "2027-05-16", vol_max: "10", sessions_max: "6" });
  const master = dec(p, "R6.3").some((d) => /master/i.test(d.what));
  return { ok: master && peakMin(p) <= adultPeak * 0.9, info: `master:${master} pic:${(peakMin(p) / 60).toFixed(1)}h` };
});
check("R13.1-NR1", "non-régression : 15 ans protégé (0 VO2 + R6.3)", () => {
  const p = build("tri", { age: "15", format: FMT_MINEUR, race_date: "2027-05-16", vol_max: "10", sessions_max: "6" });
  return { ok: vo2Steps(p) === 0 && dec(p, "R6.3").length > 0, info: "vo2:" + vo2Steps(p) };
});
check("R13.1-NR2", "non-régression : 30 ans garde sa VO2 / 65 ans master / 101 refusé", () => {
  const p65 = build("tri", { age: "65", format: "70.3", race_date: "2027-05-16", vol_max: "10", sessions_max: "6" });
  let refused = false; try { build("tri", { age: "101" }); } catch (e) { refused = e.code === "ENTREE_INVALIDE"; }
  return { ok: vo2Steps(pAdult) > 0 && dec(p65, "R6.3").some((d) => /master/i.test(d.what)) && refused, info: "" };
});

/* ================= R13.2 — <style> du standalone sans fuite print ================= */
if (HTML && fs.existsSync(HTML)) {
  const html = fs.readFileSync(HTML, "utf8");
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  const css = m ? m[1] : "";
  xfail("R13.2-S1", "aucune CSS d'impression fuitée dans <style> (Arial/concaténations)", () => {
    const leak = /font-family:-apple-system,Arial/.test(css) || /\n\s*\+'/.test(css);
    return { ok: !leak, info: leak ? "fuite détectée (chaîne JS print de plan-view.js collée dans <style>)" : "" };
  });
  check("R13.2-S2", "la police de base du body est Space Grotesk", () => {
    const bodyRules = [...css.matchAll(/(^|\})\s*body\s*\{([^}]*)\}/g)].map((x) => x[2]);
    const fams = bodyRules.filter((r) => /font-family/.test(r));
    const last = fams[fams.length - 1] || "";
    return { ok: /Space Grotesk/.test(last), info: "dernière font-family body: " + last.slice(0, 60) };
  });
} else {
  RESULTS.push({ id: "R13.2", label: "contrôles <style> (fichier HTML non fourni)", ok: true, info: "SKIP — passe le chemin du standalone en 2e argument" });
}

/* ================= R13.3 — natation tri sans doubles ================= */
for (const dbl of ["non", "parfois"]) {
  xfail("R13.3-N-" + dbl, `tri Full doubles=${dbl} : nage réelle (fréquence, CSS, affûtage)`, () => {
    const p = build("tri", { doubles: dbl });
    const avg = swimPerWeek(p, ["dev", "spec", "peak"]);
    const css = zonesOf(p, "sw").has("sw.css");
    const taperOk = taperWeeks(p).every((w) => w.days.some((d) => d.sessions.some((s) => s.d === "sw")));
    const ok = avg >= 1.5 && css && taperOk;
    return { ok, info: `nage/sem(dev+spec+peak)=${avg.toFixed(1)} css:${css} nage chaque sem d'affûtage:${taperOk}` };
  });
}
check("R13.3-NR", "non-régression doubles=oui : 2,2–3,2 nages/sem, css présent", () => {
  const p = build("tri", { doubles: "oui", dispo: "quotidienne", shift_ok: "non", sessions_max: "9" });
  const avg = swimPerWeek(p, ["base", "dev", "spec", "peak"]);
  return { ok: avg >= 2.2 && avg <= 3.2 && zonesOf(p, "sw").has("sw.css"), info: "nage/sem=" + avg.toFixed(1) };
});

/* ================= R13.4 — semaine de course ================= */
for (const [fmt, rd] of [["Full", "2027-09-12"], ["70.3", "2027-05-16"]]) {
  const p = build("tri", { format: fmt, race_date: rd, doubles: "oui", dispo: "quotidienne", shift_ok: "non", sessions_max: "9" });
  xfail("R13.4-C1-" + fmt, fmt + " : zéro bloc de force (bk.frc) en affûtage", () => {
    let frc = 0; for (const w of taperWeeks(p)) for (const d of w.days) for (const s of d.sessions) for (const st of (s.steps || [])) if (st.zone === "bk.frc") frc++;
    return { ok: frc === 0, info: "blocs bk.frc en taper: " + frc };
  });
  xfail("R13.4-C2-" + fmt, fmt + " : veille de course ≤ 25 min", () => {
    const last = p.weeks[p.weeks.length - 1];
    const race = last.days.filter((d) => d.date).sort((a, b) => a.date.localeCompare(b.date)).pop();
    // FAUTE DE BANC CORRIGÉE (même geste que pour les bancs précédents, raison écrite) :
    // `find` prenait le PREMIER jour actif de la semaine de course (le mardi), pas la veille.
    // Cette lecture contredit le critère R13.6-P3 du même banc (dernière semaine entre 30 et
    // 60 % du pic — impossible si CHAQUE jour est ≤ 25 min). La veille = le DERNIER jour actif
    // avant le jour J.
    const eve = last.days.filter((d) => d.date && d.date < race.date && d.sessions.some((s) => s.d !== "rs" && !s.race)).pop();
    const min = eve ? eve.sessions.reduce((t, s) => t + (s.race ? 0 : s.min || 0), 0) : 0;
    return { ok: min > 0 && min <= 25, info: "veille: " + Math.round(min) + "min" };
  });
  xfail("R13.4-C3-" + fmt, fmt + " : jour J typé course, exclu de la charge", () => {
    let raceS = null; for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) if (s.race === true || /🏁/.test(s.name || "")) raceS = s;
    const ok = !!raceS && raceS.race === true && (raceS.min || 0) === 0;
    return { ok, info: raceS ? `race:${raceS.race === true} min:${Math.round(raceS.min || 0)}` : "aucune séance course trouvée" };
  });
}

/* ================= R13.5 — épaule + natation : plan honnête ================= */
// La configuration qui s'effondre est history=confirme (caps plus bas) ; ancien tient
// presque. Le critère doit valoir pour LES DEUX — c'est le même athlète à un an près.
for (const hist of ["confirme", "ancien"]) {
  xfail("R13.5-E1-" + hist, `swim/fond/épaule (history=${hist}) : périodisation vivante + promesse honnête`, () => {
    const p = build("swim", { injury: "epaule", format: "fond", race_date: "2026-12-13", vol_max: "10", sessions_max: "6", history: hist });
    const cw = chargeWeeks(p).map(weekMin);
    const flat = Math.max(...cw) / Math.max(1, Math.min(...cw));
    const promised = (dec(p, "V2.1")[0] || { val: "" }).val;
    const promH = parseFloat(String(promised).replace(",", ".")) || 0;
    const pkH = peakMin(p) / 60;
    const honest = !promH || pkH >= promH * 0.75 || warns(p, /épaule|epaule/).length > 0;
    const alive = flat >= 1.35 && pkH >= 1.5;
    return { ok: alive && honest, info: `pic=${pkH.toFixed(1)}h promesse=${promH || "?"}h ratio max/min charge=${flat.toFixed(2)} warn épaule:${warns(p, /épaule|epaule/).length}` };
  });
}

/* ================= R13.6 — plafonds absolus de phases ================= */
xfail("R13.6-P1", "Full 59 sem : affûtage 2–3 semaines, peak ≤ 5", () => {
  const p = build("tri", {});
  const t = taperWeeks(p).length, pk = p.weeks.filter((w) => w.phase.id === "peak").length;
  return { ok: t >= 2 && t <= 3 && pk <= 5, info: `taper=${t} peak=${pk} (total ${p.weeks.length})` };
});
check("R13.6-P2", "plan court (run semi 16 sem) : affûtage 1–2 semaines", () => {
  const p = build("run", { format: "semi", race_date: "2026-11-22", terrain: "route", vol_max: "6", sessions_max: "5" });
  const t = taperWeeks(p).length;
  return { ok: t >= 1 && t <= 2, info: `taper=${t} (total ${p.weeks.length})` };
});
check("R13.6-P3", "dernière semaine d'entraînement (hors course) entre 30 et 60 % du pic", () => {
  const p = build("tri", {});
  const last = p.weeks[p.weeks.length - 1];
  const m = last.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : s.min || 0), 0), 0);
  const r = m / peakMin(p);
  return { ok: r >= 0.3 && r <= 0.6, info: (r * 100).toFixed(0) + "% du pic" };
});

/* ================= Annexe (informatif) : C22 et genou+vélo ================= */
check("ANX-C22", "aucun saut charge→charge > +10,5 % (Full, minutes exactes)", () => {
  const p = build("tri", {});
  const mins = p.weeks.map((w) => ({ m: weekMin(w), rec: w.isRecup, ph: w.phase.id }));
  const bad = [];
  for (let i = 1; i < mins.length; i++) { const a = mins[i - 1], b = mins[i];
    if (!a.rec && !b.rec && a.ph !== "taper" && b.ph !== "taper" && a.m > 0 && b.m / a.m > 1.105) bad.push(`S${i}→S${i + 1} +${((b.m / a.m - 1) * 100).toFixed(0)}%`); }
  return { ok: bad.length === 0, info: bad.join(" ") };
});
check("ANX-GEN", "genou déclaré + plan vélo pur : un avertissement existe", () => {
  const p = build("bike", { injury: "genou", format: "cyclo", race_date: "2026-12-13", terrain: "vallonne", vol_max: "10", sessions_max: "6" });
  return { ok: warns(p, /genou/i).length > 0, info: "warnings genou: " + warns(p, /genou/i).length };
});

/* ---------------- rapport ---------------- */
let fail = 0;
console.log("\n== BANC R13 — " + new Date().toISOString().slice(0, 10) + " · moteur " + (E.version || "?") + " ==\n");
for (const r of RESULTS) {
  if (!r.ok) fail++;
  console.log((r.ok ? "  PASS " : "✗ FAIL ") + r.id.padEnd(14) + r.label + (r.info ? "  — " + r.info : ""));
}
console.log("\n" + (fail ? fail + " échec(s)." : "Tout passe."));
process.exit(fail ? 1 : 0);
