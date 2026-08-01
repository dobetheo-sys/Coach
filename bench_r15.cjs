#!/usr/bin/env node
/**
 * bench_r15.js — banc des chapitres MOTEUR du handoff R15.
 *
 * Usage : node bench_r15.js [chemin/engine.js]
 *
 * Ne couvre PAS les chapitres d'infrastructure (R15.1 budgets, R15.3 fréquence du repli,
 * R15.5 xfail, R15.6 swimrun, R15.9 registre exécutable) : ceux-là portent leur propre
 * commande de vérification dans le handoff, parce qu'ils vivent dans la CI, pas dans le moteur.
 *
 * Rouge par construction contre un build antérieur à R15.
 */
"use strict";
const path = require("path");
require(path.resolve(process.argv[2] || "./js/engine.js"));
const E = globalThis.EBV2;
if (!E || typeof E.buildPlan !== "function") { console.error("EBV2 introuvable."); process.exit(2); }

const R = [];
const check = (id, label, fn) => { try { const r = fn(); R.push({ id, label, ok: !!r.ok, info: r.info || "" }); } catch (e) { R.push({ id, label, ok: false, info: "EXCEPTION: " + (e.human || e.message) }); } };
const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
/** Course calée un DIMANCHE (cas réel de la quasi-totalité des épreuves) : la position de la
 *  course dans la semaine change la mise en page de la dernière semaine — dimension que la
 *  première version de ce banc ne faisait pas varier, et qui masquait 90 % du défaut. */
const sunday = (w) => { const d = new Date(Date.now() + w * 7 * 864e5); d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7)); return d.toISOString().slice(0, 10); };
const HORIZONS = [20, 24, 28, 32, 36, 40, 44, 48, 52];

const BASE = {
  intent: "competition", level: "inter", history: "ancien", dispo: "partielle", doubles: "non",
  off_days: "non", shift_ok: "non", sex: "H", sleep: "moyen", life_load: "normale", activity: "actif",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non",
  age: "30", weight: "85", height: "181", vol_max: "10", vol_recent: "8", sessions_max: "7",
  race_date: sunday(43), format: "70.3", terrain: "vallonne",
  ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:50", css_known: "oui", css: "2:00",
};
const ans = (o) => Object.assign({}, BASE, o);
const build = (a, sport) => E.buildPlan(sport || "tri", a);
const wmin = (w) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : (s.min || 0)), 0), 0);
const peak = (p) => Math.max(...p.weeks.map(wmin));
const bikeBand = (a) => { const p = build(a); const it = E.predict("tri", a, p).items.find((i) => /Vélo|velo/i.test(i.leg)); const m = String(it && it.value).match(/(\d+)\D+(\d+)\s*W/); return m ? { lo: +m[1], hi: +m[2], why: String(it.why || "") } : null; };

/* ================= R15.2 — relief vélo (O-2) ================= */
check("R15.2-A", "la bande de puissance descend avec le relief du parcours vélo", () => {
  const plat = bikeBand(ans({ terrain: "plat" })), mont = bikeBand(ans({ terrain: "montagne" }));
  if (!plat || !mont) return { ok: false, info: "bande vélo illisible" };
  const delta = plat.lo - mont.lo;
  return { ok: delta >= 4, info: `plat ${plat.lo}–${plat.hi} W · montagne ${mont.lo}–${mont.hi} W (écart ${delta} W, attendu ≥ 4 = 0,02 × FTP)` };
});
check("R15.2-B", "vallonné se situe strictement entre plat et montagne", () => {
  const p = bikeBand(ans({ terrain: "plat" })), v = bikeBand(ans({ terrain: "vallonne" })), m = bikeBand(ans({ terrain: "montagne" }));
  if (!p || !v || !m) return { ok: false, info: "bande illisible" };
  return { ok: p.lo > v.lo && v.lo > m.lo, info: `${p.lo} > ${v.lo} > ${m.lo} W` };
});
check("R15.2-C", "le conseil de pacing mentionne la variabilité sur parcours accidenté", () => {
  const m = bikeBand(ans({ terrain: "montagne" }));
  if (!m) return { ok: false, info: "bande illisible" };
  return { ok: /variabilit|\bIV\b/i.test(m.why), info: m.why.slice(0, 90) };
});
check("R15.2-D", "clé unique : `terrain` suffit, aucun champ de relief parallèle requis", () => {
  const sans = bikeBand(ans({ terrain: "montagne" }));
  const avec = bikeBand(ans({ terrain: "montagne", course_profile: "montagneux" }));
  if (!sans || !avec) return { ok: false, info: "bande illisible" };
  return { ok: sans.lo === avec.lo && sans.hi === avec.hi, info: `sans course_profile ${sans.lo}–${sans.hi} · avec ${avec.lo}–${avec.hi}` };
});

/* ================= R15.7-A — plancher de la semaine de course ================= */
check("R15.7-A", "semaine de course ≥ 30 % du pic — 9 horizons × 72 profils, course le dimanche", () => {
  const bad = []; let n = 0;
  for (const H of HORIZONS) for (const lvl of ["debutant", "inter"]) for (const hist of ["reprise", "confirme", "ancien"])
    for (const vm of ["6", "8", "10", "12"]) for (const sm of ["5", "6", "7"]) {
      let p; const a = ans({ level: lvl, history: hist, vol_max: vm, vol_recent: String(+vm - 2), sessions_max: sm, race_date: sunday(H), intent: lvl === "debutant" ? "finir" : "competition" });
      try { p = build(a); } catch (e) { continue; }
      n++;
      const r = wmin(p.weeks[p.weeks.length - 1]) / peak(p);
      if (r < 0.295) bad.push(`H${H}/${lvl}/${hist}/${vm}h/${sm}s=${Math.round(r * 100)}%`);
    }
  return { ok: bad.length === 0, info: bad.length ? `${bad.length}/${n} configs sous le plancher — ex. ${bad.slice(0, 3).join(" · ")}` : `0/${n}` };
});

/* ================= R15.7-B — pas de trou avant le départ ================= */
check("R15.7-B", "séance à J-1 ou J-2, jamais un trou de 3 jours — mêmes 9 horizons", () => {
  const bad = []; let n = 0;
  for (const H of HORIZONS) for (const lvl of ["debutant", "inter"]) for (const hist of ["reprise", "confirme", "ancien"])
    for (const vm of ["6", "8", "10", "12"]) for (const sm of ["5", "6", "7"]) {
      let p; const a = ans({ level: lvl, history: hist, vol_max: vm, vol_recent: String(+vm - 2), sessions_max: sm, race_date: sunday(H), intent: lvl === "debutant" ? "finir" : "competition" });
      try { p = build(a); } catch (e) { continue; }
      n++;
      const L = p.weeks[p.weeks.length - 1];
      const race = L.days.filter((d) => d.date).sort((x, y) => x.date.localeCompare(y.date)).pop();
      const eve = L.days.filter((d) => d.date && d.date < race.date && d.sessions.some((s) => s.d !== "rs" && !s.race)).sort((x, y) => x.date.localeCompare(y.date)).pop();
      const gap = eve ? Math.round((new Date(race.date) - new Date(eve.date)) / 864e5) : 99;
      if (gap >= 3) bad.push(`H${H}/${lvl}/${hist}/${vm}h/${sm}s (J-${gap})`);
    }
  return { ok: bad.length === 0, info: bad.length ? `${bad.length}/${n} configs sans déverrouillage — ex. ${bad.slice(0, 3).join(" · ")}` : `0/${n}` };
});

/* ================= R15.7-C — éligibilité âge × format ================= */
const REGLEMENTES = [["tri", "Full", 60], ["tri", "70.3", 43], ["run", "marathon", 30]];
check("R15.7-C1", "mineur + format à minimum d'âge réglementaire → refus motivé", () => {
  const out = [];
  for (const [sp, fmt, wk] of REGLEMENTES) {
    const a = ans({ age: "15", format: fmt, race_date: iso(wk * 7), terrain: sp === "run" ? "route" : "vallonne" });
    try { build(a, sp); out.push(`${sp}/${fmt} ACCEPTÉ`); }
    catch (e) { if (!/18 ans|éligib|inscription|mineur/i.test(e.human || "")) out.push(`${sp}/${fmt} refus non motivé`); }
  }
  return { ok: out.length === 0, info: out.join(" · ") };
});
check("R15.7-C2", "non-régression : mineur + format court reste autorisé et protégé", () => {
  const a = ans({ age: "15", format: "S", race_date: iso(16 * 7) });
  let p; try { p = build(a); } catch (e) { return { ok: false, info: "refus indu : " + (e.human || "").slice(0, 70) }; }
  let vo2 = 0; for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) for (const st of (s.steps || [])) if (/vo2/.test(String(st.zone || ""))) vo2++;
  const r63 = (p._v2.decisions || []).some((d) => d.id === "R6.3");
  return { ok: vo2 === 0 && r63, info: `blocs VO2max=${vo2} · R6.3=${r63}` };
});
check("R15.7-C3", "non-régression : adulte + format long reste autorisé", () => {
  const a = ans({ age: "30", format: "Full", race_date: iso(60 * 7) });
  try { const p = build(a); return { ok: p.weeks.length > 30, info: p.weeks.length + " semaines" }; }
  catch (e) { return { ok: false, info: "refus indu" }; }
});

/* ================= Non-régressions transverses ================= */
check("R15-NR", "R13/R14 tiennent : affûtage sans force, jour J à 0 min, bande vélo plat inchangée", () => {
  const p = build(ans({ terrain: "plat" }));
  let frc = 0, race = null;
  for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) {
    if (s.race) race = s;
    if (w.phase.id === "taper") for (const st of (s.steps || [])) if (/\.frc$/.test(st.zone || "")) frc++;
  }
  const b = bikeBand(ans({ terrain: "plat" }));
  return { ok: frc === 0 && race && (race.min || 0) === 0 && b && b.lo === 175 && b.hi === 191, info: `frc taper=${frc} · jourJ=${race ? Math.round(race.min || 0) : "?"}min · plat=${b ? b.lo + "–" + b.hi : "?"}W` };
});

let fail = 0;
console.log("\n== BANC R15 — chapitres moteur · moteur " + (E.version || "?") + " ==\n");
for (const r of R) { if (!r.ok) fail++; console.log((r.ok ? "  PASS " : "✗ FAIL ") + r.id.padEnd(12) + r.label + (r.info ? "  — " + r.info : "")); }
console.log("\n" + (fail ? fail + " échec(s)." : "Tout passe."));
process.exit(fail ? 1 : 0);
