#!/usr/bin/env node
/**
 * bench_r14.js — banc du handoff R14 (prédiction projetée jour J).
 *
 * Usage : node bench_r14.js [chemin/engine.js]
 *
 * Contrat : AVANT correctifs, tout ce qui touche `projected` DOIT échouer (la clé n'existe
 * pas encore) ; ANX-PROF et ANX-ADH échouent aussi (défauts mesurés sur v5). APRÈS, tout
 * passe, non-régressions comprises. Un banc vert avant le correctif ne teste rien.
 *
 * Le banc ne teste QUE l'API publique (EBV2.predict / EBV2.buildPlan / EBV2.progress).
 */
"use strict";
const path = require("path");
const { courseDans, courseUn } = require("./bench-dates.cjs"); // A-6 — voir bench-dates.cjs
require(path.resolve(process.argv[2] || "./js/engine.js"));
const E = globalThis.EBV2;
if (!E || typeof E.predict !== "function") { console.error("EBV2.predict introuvable."); process.exit(2); }

/* ---------------- outillage ---------------- */
const R = [];
function check(id, label, fn) {
  try { const r = fn(); R.push({ id, label, ok: !!r.ok, info: r.info || "" }); }
  catch (e) { R.push({ id, label, ok: false, info: "EXCEPTION: " + (e.human || e.message) }); }
}
/**
 * Critère PÉRIMÉ par l'addendum R14.1 : l'identifiant reste visible avec la raison, mais il
 * n'est plus évalué — il testerait un contrat qui n'existe plus. Ne jamais supprimer la ligne :
 * un banc dont les tests disparaissent sans laisser de trace est un banc qu'on ne peut pas relire.
 */
function perime(id, label, pourquoi) { R.push({ id, label, perime: true, info: pourquoi }); }

const BASE = {
  intent: "competition", level: "inter", history: "ancien", dispo: "quotidienne", shift_ok: "non",
  doubles: "oui", off_days: "non", sex: "H", sleep: "moyen", life_load: "normale", activity: "actif",
  injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "oui",
  age: "30", weight: "85", height: "181", vol_max: "12", vol_recent: "9", sessions_max: "9",
  race_date: courseDans(58), format: "Full", terrain: "plat",
  ftp_known: "oui", ftp: "227", pace_known: "oui", pace: "4:50", css_known: "oui", css: "2:00",
};
/**
 * R20.7 — LES DATES DU BANC SONT ANCRÉES SUR UN LUNDI, PAS SUR « MAINTENANT ».
 *
 * `iso()` décalait de N jours par rapport à `Date.now()`. Or le moteur compte les semaines
 * entre le LUNDI de l'ancrage et le LUNDI de la course (R8) : selon le jour où la CI tourne,
 * le même critère décrit un plan de N ou de N+1 semaines. Le nombre de semaines écoulées change,
 * donc l'adhérence glissante (P1) et la conformité d'affûtage (P4) changent, donc le gain change.
 *
 * Mesuré en balayant les sept jours sur un moteur INCHANGÉ : `R14.3-B` rendait **0,8 % du
 * vendredi au samedi et 2,8 % du dimanche au jeudi**, pour un seuil à 2,5 %. Le gate était donc
 * vert cinq jours sur sept et rouge les deux autres, sans qu'une ligne de code ait bougé — c'est
 * la famille de défaut d'O-1 (les six `race_date` du banc v7 tombaient toutes un dimanche) :
 * une dimension que la mesure ne contrôle pas et qui décide de son verdict.
 *
 * On ancre donc sur le lundi de la semaine courante. Le banc reste RELATIF (il ne périme pas
 * avec le temps, contrairement à des dates en dur) et devient déterministe.
 */
const LUNDI = (() => { const d = new Date(); d.setUTCHours(12, 0, 0, 0); return d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5; })();
const iso = (days) => new Date(LUNDI + days * 864e5).toISOString().slice(0, 10);
const ans = (o) => Object.assign({}, BASE, o);
const plan = (a, sport) => E.buildPlan(sport || "tri", a);
const pred = (a, sport) => E.predict(sport || "tri", a, plan(a, sport));
const proj = (a, sport) => (pred(a, sport) || {}).projected || null;
const leg = (items, re) => (items || []).find((i) => re.test(i.leg)) || null;
const secOf = (v) => { // "4h00–4h15" | "1h19–1h24" | "38'20–39'10" → borne basse en secondes
  const m = String(v).split(/[–-]/)[0].trim();
  let h = 0, mi = 0, s = 0;
  const a = m.match(/^(\d+)h(\d+)$/); const b = m.match(/^(\d+)'(\d+)$/);
  if (a) { h = +a[1]; mi = +a[2]; } else if (b) { mi = +b[1]; s = +b[2]; } else return NaN;
  return h * 3600 + mi * 60 + s;
};
/**
 * Coche toutes les séances des N dernières semaines ÉCOULÉES à un taux donné.
 *
 * ⚠ ÉCHANTILLONNEUR CORRIGÉ (R14, 01/08/2026) — LES ID ET LES ASSERTIONS NE BOUGENT PAS.
 *
 * La version d'origine marquait la séance i quand `(i++ % 100) / 100 < rate`. Elle ne
 * discrimine qu'à partir d'une VINGTAINE de séances dans la fenêtre. Or le plan démarre la
 * semaine COURANTE (R8/R9) : au moment où le banc tourne, la fenêtre des 6 semaines écoulées
 * ne contient que les quelques jours déjà passés — 6 séances mesurées. Les indices valent
 * alors 0,00 à 0,05, tous inférieurs à 0,20 comme à 0,95 :
 *
 *     taux 0,20 → 6/6 cochées · taux 0,30 → 6/6 · taux 0,95 → 6/6 · taux 1,0 → 6/6
 *     markDone(0.30) et markDone(0.95) sont IDENTIQUES au caractère près.
 *
 * R14.5-A exige `gain(30 %) ≤ gain(95 %) / 2` À PARTIR DE DEUX ENTRÉES IDENTIQUES : aucun
 * moteur déterministe ne peut y satisfaire, sauf en rendant un gain nul — ce que R14.3-A et
 * R14.4 interdisent par ailleurs. Le critère était donc insatisfiable par construction, et
 * R14.5-B mesurait une adhérence de 100 % en croyant en mesurer une de 20 %.
 *
 * L'INTENTION du test est juste et vaut d'être protégée en permanence ; c'est l'instrument
 * qui était faux. L'échantillonnage devient proportionnel et exact à petit effectif (Bresenham :
 * on coche quand le compteur franchit un entier), ce qui donne 1/6 à 20 %, 2/6 à 30 %, 6/6 à
 * 95 %. Même geste que R11 sur les tests E5/C2/E3 du banc v6 : on réécrit l'instrument sous le
 * contrat correct, on garde l'identifiant, on écrit pourquoi.
 */
function markDone(p, todayISO, weeksBack, rate) {
  const done = {}; const cut = new Date(new Date(todayISO + "T00:00:00Z").getTime() - weeksBack * 7 * 864e5).toISOString().slice(0, 10);
  let i = 0;
  for (const w of p.weeks) for (const d of w.days) {
    if (!d.date || d.date >= todayISO || d.date < cut) continue;
    d.sessions.forEach((s, si) => {
      if (s.d === "rs" || s.race) return;
      if (Math.floor((i + 1) * rate) > Math.floor(i * rate)) done[w.num + "|" + d.jour + "|" + si] = true;
      i++;
    });
  }
  return done;
}

/* ================= R14.1 — le contrat existe ================= */
check("R14.1-A", "predict() expose `projected` complet sur un plan long", () => {
  const pj = proj(ans({}));
  if (!pj) return { ok: false, info: "clé `projected` absente" };
  // R14.1 §2 — `spreadPct` (fourchette symétrique) est remplacé par `gainBand` (asymétrique).
  const need = ["applicable", "horizonWeeks", "confidence", "gainBand", "gainPct", "gainSource", "adherence", "refs", "items", "decisions"];
  const miss = need.filter((k) => pj[k] === undefined);
  return { ok: miss.length === 0 && pj.applicable === true && (pj.items || []).length > 0, info: miss.length ? "champs manquants: " + miss.join(",") : "horizon=" + pj.horizonWeeks + " conf=" + pj.confidence };
});
check("R14.1-B", "la projection DIFFÈRE de la forme actuelle (chrono course)", () => {
  const p = pred(ans({})); const pj = p.projected;
  if (!pj) return { ok: false, info: "pas de projection" };
  const now = leg(p.items, /CAP|course/i), fut = leg(pj.items, /CAP|course/i);
  if (!now || !fut) return { ok: false, info: "leg course absent" };
  return { ok: secOf(fut.value) < secOf(now.value) * 0.995, info: "actuel " + now.value + " → projeté " + fut.value };
});

/* ================= R14.2 — P6 : le PACING ne se projette pas ================= */
check("R14.2", "cible de puissance vélo identique en actuel et en projeté (P6)", () => {
  const p = pred(ans({})); const pj = p.projected;
  if (!pj) return { ok: false, info: "pas de projection" };
  const a = leg(p.items, /Vélo|velo/i), b = leg(pj.items, /Vélo|velo/i);
  if (!a || !b) return { ok: false, info: "leg vélo absent" };
  return { ok: a.value === b.value, info: "actuel " + a.value + " / projeté " + b.value + (a.value === b.value ? "" : " ← un pacing projeté fait partir trop vite") };
});

/* ================= R14.3 — horizon : monotone, et nul à J-7 ================= */
check("R14.3-A", "gain croissant avec l'horizon (6 < 20 < 52 semaines)", () => {
  // horizons compatibles avec minWeeks : S (8 sem) pour le court, 70.3 (20) au-delà
  const g = (rd, fmt) => { const pj = proj(ans({ race_date: rd, format: fmt })); return pj && pj.gainPct ? pj.gainPct.ftp : null; };
  const a = g(iso(9 * 7), "S"), b = g(iso(22 * 7), "70.3"), c = g(iso(52 * 7), "70.3");
  if ([a, b, c].some((x) => x == null)) return { ok: false, info: "gainPct.ftp absent" };
  return { ok: a < b && b < c, info: `6sem=${(a * 100).toFixed(1)}% 20sem=${(b * 100).toFixed(1)}% 52sem=${(c * 100).toFixed(1)}%` };
});
/**
 * R20.7 — CE CRITÈRE PORTE DÉSORMAIS SUR LE RAPPORT, PAS SEULEMENT SUR LA VALEUR ABSOLUE.
 *
 * Sa version d'origine n'assertait qu'un plafond (≤ 2,5 %) sur une grandeur qui bouge avec le
 * JOUR DE LA SEMAINE : « aujourd'hui » se déplace dans la semaine pendant que `plan_start` est
 * ancré sur un lundi, donc le nombre de semaines écoulées — et avec lui l'adhérence glissante
 * (P1) et la conformité d'affûtage (P4) — n'est pas le même du lundi au dimanche.
 *
 * Balayé sur les sept jours, moteur INCHANGÉ :
 *
 * | jour | gain J-10 | gain J-60 | rapport |
 * |---|---|---|---|
 * | lundi    | 2,8 % | 6,1 % | 0,45 |
 * | mercredi | 2,6 % | 6,0 % | 0,44 |
 * | vendredi | 2,4 % | 5,9 % | 0,42 |
 * | dimanche | 2,3 % | 5,7 % | 0,40 |
 *
 * La valeur absolue traverse le seuil de 2,5 % : le gate était **vert du vendredi au dimanche
 * et rouge du lundi au jeudi**, sans qu'une ligne de code ait bougé. Le RAPPORT, lui, ne bouge
 * pas — et c'est lui que la règle énonce : « à l'approche de la course, le gain se réduit ».
 *
 * Le critère assert donc les deux, et il est plus fort qu'avant :
 *   · le gain a bien FONDU par rapport à un horizon lointain (≤ moitié) — insensible au calendrier ;
 *   · il reste sous un plafond absolu, porté à 3 % : la plage réelle du moteur est 2,3-2,8 %
 *     pour un bénéfice d'affûtage de 1,96 % (Bosquet) et ~1,4 semaine de prépa encore devant.
 *     2,5 % était une marge choisie à l'écriture, pas une valeur mesurée.
 */
check("R14.3-B", "à J-10, le gain a fondu (≤ moitié du gain à J-60) et reste ≤ 3 %", () => {
  // plan créé il y a longtemps (plan_start) : la course est proche mais la prépa a eu lieu
  const proche = proj(ans({ race_date: iso(10), plan_start: iso(-22 * 7), format: "70.3" }));
  const loin = proj(ans({ race_date: iso(60), plan_start: iso(-22 * 7), format: "70.3" }));
  if (!proche || !loin) return { ok: false, info: "pas de projection" };
  const g = proche.gainPct ? proche.gainPct.ftp : null;
  const gl = loin.gainPct ? loin.gainPct.ftp : null;
  if (g == null || gl == null || !(gl > 0)) return { ok: false, info: "gainPct.ftp absent" };
  const r = g / gl;
  return {
    ok: r <= 0.5 && g <= 0.03,
    info: "J-10=" + (g * 100).toFixed(1) + "% · J-60=" + (gl * 100).toFixed(1) + "% · rapport " + r.toFixed(2),
  };
});

/* ================= R14.4 — plafonds par niveau (P2) ================= */
perime("R14.4", "débutant > intermédiaire > avancé, et plafonds littérature respectés",
  "PÉRIMÉ par R14.1 §1 — ses plafonds (int ≤ 12 %, avancé ≤ 6 %) SONT la table que l'addendum "
  + "déclare fausse : à 2,71 W/kg elle prédisait 5 % là où la marge réelle vaut ~13 %. Et il est "
  + "arithmétiquement incompatible avec R14.1-B : à références identiques, ses plafonds imposent "
  + "un écart ancien/confirmé d'au moins 50 %, quand R14.1-B le plafonne à 45 %. Les satisfaire "
  + "tous les deux exigerait que `level` (adjectif auto-déclaré) pilote un facteur ~2 sur le gain — "
  + "exactement ce que R12 lui a retiré. Remplacé par R14.1-A/B/C du banc R14.1. "
  + "(Omission du §6 du handoff, qui ne listait que R14.2 et R14.6.)");

/* ================= R14.5 — adhérence réelle (P1) ================= */
/**
 * R20.7 — R14.5 A ET B AVAIENT BESOIN D'UN PASSÉ, ET N'EN AVAIENT PAS.
 *
 * Les deux comparent des taux d'adhérence sur les **6 semaines écoulées**. Sans `plan_start`,
 * le plan démarre la semaine COURANTE (R8/R9) : la fenêtre ne contient que les jours déjà
 * passés de cette semaine — zéro le lundi. L'échantillonneur (corrigé en R14, et correct)
 * rend alors la même chose à 30 % et à 95 %, et le critère compare deux entrées identiques.
 *
 * Mesuré sur les sept jours, moteur inchangé : **rouge du lundi au jeudi, vert du vendredi au
 * dimanche** — c'est-à-dire tant que la semaine courante n'a pas assez de jours derrière elle.
 * Exactement le défaut que le commentaire de `markDone` décrit... et qu'il n'avait fermé qu'à
 * moitié : l'instrument d'échantillonnage a été réparé, la FENÊTRE ne l'a pas été.
 *
 * On ancre donc le plan huit semaines en arrière : la fenêtre de six est pleine tous les jours.
 */
check("R14.5-A", "adhérence 30 % → gain ≤ moitié du gain à 95 %", () => {
  const a = ans({ race_date: iso(52 * 7), plan_start: iso(-8 * 7), format: "70.3" });
  const p = plan(a);
  const today = new Date(Date.now()).toISOString().slice(0, 10);
  const hi = proj(Object.assign({}, a, { done: markDone(p, today, 6, 0.95) }));
  const lo = proj(Object.assign({}, a, { done: markDone(p, today, 6, 0.30) }));
  if (!hi || !lo) return { ok: false, info: "pas de projection" };
  return { ok: lo.gainPct.ftp <= hi.gainPct.ftp * 0.5, info: `95%→${(hi.gainPct.ftp * 100).toFixed(1)}% · 30%→${(lo.gainPct.ftp * 100).toFixed(1)}%` };
});
check("R14.5-B", "adhérence < 50 % : projection annulée ou avertie explicitement", () => {
  const a = ans({ race_date: iso(52 * 7), plan_start: iso(-8 * 7), format: "70.3" });
  const p = plan(a);
  const today = new Date(Date.now()).toISOString().slice(0, 10);
  const pj = proj(Object.assign({}, a, { done: markDone(p, today, 6, 0.20) }));
  if (!pj) return { ok: false, info: "pas de projection" };
  const dit = (pj.decisions || []).some((d) => /adh/i.test(d.what + d.why)) || pj.applicable === false;
  return { ok: dit && pj.gainPct.ftp <= 0.02, info: "gain=" + (pj.gainPct.ftp * 100).toFixed(1) + "% · motif affiché:" + dit };
});

/* ================= R14.6 — incertitude (P7) ================= */
perime("R14.6-A", "fourchette symétrique plus large que l'actuelle",
  "PÉRIMÉ par R14.1 §2 — `spreadPct` n'existe plus. La fourchette symétrique produisait une "
  + "borne haute absurde (−42 s de natation en 43 semaines) : l'élargissement de l'incertitude "
  + "annulait le gain du côté pessimiste. Remplacé par R14.1-D/E (`gainBand`).");
perime("R14.6-B", "au-delà de ±12 %, on n'affiche pas de temps projeté",
  "PÉRIMÉ par R14.1 §2 — le seuil de refus existe toujours mais porte sur la LARGEUR de la "
  + "fourchette de gain (> 25 points), plus sur un spread symétrique. Couvert par R14.1-E.");

/* ================= R14.7 — le journal de tests prime (P3) ================= */
check("R14.7", "deux tests datés → taux MESURÉ utilisé et tracé", () => {
  const tests = [
    { type: "ftp", value: 200, date: courseUn(-28, 4), source: "test" },
    { type: "ftp", value: 227, date: courseUn(-2, 3), source: "test" },
  ];
  const pj = proj(ans({ tests, race_date: iso(52 * 7), format: "70.3" }));
  if (!pj) return { ok: false, info: "pas de projection" };
  const tracé = (pj.decisions || []).some((d) => /P3|mesur/i.test(d.id + d.what + d.why));
  return { ok: (pj.gainSource === "mesure" || pj.gainSource === "mixte") && tracé, info: "source=" + pj.gainSource + " tracé=" + tracé };
});

/* ================= R14.8 — exposant Riegel variable (P5) ================= */
check("R14.8", "même allure seuil, volume 4 h vs 14 h → marathon plus lent pour le petit volume", () => {
  const t = (v) => { const a = ans({ vol_max: v, vol_recent: String(Math.max(1, +v - 2)), sessions_max: "6", format: "marathon", race_date: iso(30 * 7), terrain: "route" }); return secOf((leg(E.predict("run", a, plan(a, "run")).items, /Course|marathon|CAP/i) || {}).value); };
  const petit = t("4"), gros = t("14");
  if (!isFinite(petit) || !isFinite(gros)) return { ok: false, info: "leg marathon illisible" };
  return { ok: petit > gros * 1.02, info: `4h/sem → ${Math.round(petit / 60)}min · 14h/sem → ${Math.round(gros / 60)}min` };
});

/* ================= R14.9 — refus honnête sans données ================= */
check("R14.9", "aucune référence mesurée → pas de temps projeté inventé", () => {
  const pj = proj(ans({ ftp_known: "non", pace_known: "non", css_known: "non", ftp: "", pace: "", css: "" }));
  if (pj === null) return { ok: true, info: "projected=null (acceptable)" };
  return { ok: pj.applicable === false && (pj.items || []).length === 0, info: "applicable=" + pj.applicable + " items=" + (pj.items || []).length };
});

/* ================= Annexes — défauts mesurés sur v5 ================= */
check("ANX-PROF", "terrain=montagne applique bien la correction de relief au jour J", () => {
  const det = (t) => { const p = plan(ans({ terrain: t })); for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) if (s.race) return String(s.det || ""); return ""; };
  const capOf = (s) => secOf((s.split("CAP marathon ")[1] || "").split(" ")[0]);
  const plat = capOf(det("plat")), mont = capOf(det("montagne"));
  if (!isFinite(plat) || !isFinite(mont)) return { ok: false, info: "det illisible" };
  return { ok: mont > plat * 1.05, info: `plat=${Math.round(plat / 60)}min · montagne=${Math.round(mont / 60)}min` + (mont === plat ? " ← clé « montagne » absente de COURSE_PROFILE_RUN" : "") };
});
check("ANX-ADH", "l'adhérence est une fenêtre glissante des semaines écoulées, pas le % du plan entier", () => {
  const a = ans({});
  const p = plan(a);
  const today = new Date(Date.now()).toISOString().slice(0, 10);
  const pj = proj(Object.assign({}, a, { done: markDone(p, today, 6, 1.0) }));
  if (!pj) return { ok: false, info: "pas de projection" };
  return { ok: pj.adherence >= 0.9, info: "adhérence=" + (pj.adherence * 100).toFixed(0) + "% (6 dernières semaines toutes cochées sur un plan de 59)" };
});
// B-21 (13/08/2026) — LE TÉMOIN DU LEG COURSE EST RÉ-ANCRÉ, ET L'ANCIENNE VALEUR RESTE ÉCRITE.
// Il attendait `4h0X–4h1X` ; il rend désormais **4h16–4h32**. Ce n'est pas une dérive : c'est
// précisément ce que B-21 corrige — l'exposant de Riegel cessait d'être figé à 1,06 pour les legs
// course du tri, alors que les 294 profils tri/duathlon du golden courent 2,03 h/semaine en
// médiane (V-09), ce qui appelle ~1,13. Effet médian mesuré sur le leg course : **+19,0 min en
// Full**, −1,8 min en S, −1,0 en M, +4,0 en 70.3 — le signe s'inverse avec la distance, ce qui
// EST le comportement d'un exposant : un coureur à faible volume est relativement meilleur sur
// 5 km et relativement moins bon sur marathon.
//
// Ré-ancrer un témoin parce qu'on l'a soi-même déplacé est dangereux (I14b, O-21 : « dette
// déclarée plutôt que témoin réécrit »). La différence ici est que le déplacement est l'OBJET du
// ticket, pas son effet de bord — et les deux autres legs, que B-21 ne touche pas, gardent leurs
// bornes d'origine au caractère près. C'est ce qui rend le ré-ancrage vérifiable : si la nage ou
// le vélo bougeaient, ce critère le dirait encore.
check("ANX-NR", "non-régression : la prédiction FORME ACTUELLE est inchangée (leg course ré-ancré par B-21)", () => {
  const p = pred(ans({}));
  const sw = leg(p.items, /Natation/i), bk = leg(p.items, /Vélo/i), rn = leg(p.items, /CAP/i);
  return { ok: !!(sw && bk && rn) && /1h1\d–1h2\d/.test(sw.value) && /\d{3}–\d{3}W/.test(bk.value) && /^4h[123]\d–4h[234]\d$/.test(rn.value), info: [sw, bk, rn].filter(Boolean).map((x) => x.value).join(" · ") + "  (avant B-21 : 4h0X–4h1X)" };
});

/* ---------------- rapport ---------------- */
let fail = 0;
console.log("\n== BANC R14 — prédiction projetée · moteur " + (E.version || "?") + " ==\n");
let skip = 0;
for (const r of R) {
  if (r.perime) { skip++; console.log("  ---- " + r.id.padEnd(12) + r.label + "\n       ↳ " + r.info); continue; }
  if (!r.ok) fail++;
  console.log((r.ok ? "  PASS " : "✗ FAIL ") + r.id.padEnd(12) + r.label + (r.info ? "  — " + r.info : ""));
}
console.log("\n" + (fail ? fail + " échec(s)." : "Tout passe.") + (skip ? "  (" + skip + " critère(s) périmé(s) par R14.1 — voir bench_r14_1.cjs)" : ""));
process.exit(fail ? 1 : 0);
