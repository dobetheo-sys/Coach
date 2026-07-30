// audit_amont.cjs — audit de la SURFACE D'ENTRÉE du moteur EnduraBuild (banc externe R11).
// Question posée : que fait le moteur quand on lui ment ? Il doit ÉCHOUER, pas dégrader.
//
// ÉVOLUTION DU CLASSEMENT (R11.2, en corrigeant). Le banc d'origine ne connaissait que deux
// verdicts acceptables : « échec explicite » ou « sans effet ». Or la spec R11 elle-même en
// prévoit TROIS canaux : refus, avertissement porté par le plan, défaut journalisé. Un plan
// qui change ET qui DIT pourquoi est conforme — c'est même le but. Le banc lit donc désormais
// `_v2.warnings` et `_v2.decisions` :
//   · DÉRIVE ANNONCÉE      → le plan diffère et porte une explication NOUVELLE. Conforme.
//   · valeur valide         → la mutation remplace une valeur par une autre valeur VALIDE
//                             (« 12,5 » sur une distance de course) : un plan différent est la
//                             bonne réponse, pas un défaut.
//   · DÉRIVE SILENCIEUSE    → le plan change sans qu'aucun canal ne parle. C'est LE défaut.
// Critère de sortie : 0 dérive silencieuse, 0 crash non typé. `exit 1` sinon.
"use strict";
/* Chargement portable du moteur (même contrat que `audit_v7.cjs`) :
 *   ENGINE=/chemin/engine.js  ou  STANDALONE=/chemin/EnduraBuild-standalone.html
 * Par défaut : le bundle de la PWA de ce dépôt. */
const fs = require("fs"), path = require("path");
(function loadEngine() {
  globalThis.window = globalThis;
  const direct = process.env.ENGINE || path.join(__dirname, "endurabuild/js/engine.js");
  if (fs.existsSync(direct)) { require(direct); return; }
  const html = process.env.STANDALONE || path.join(__dirname, "EnduraBuild-standalone.html");
  if (!fs.existsSync(html)) throw new Error("moteur introuvable : renseigne ENGINE= ou STANDALONE=");
  const src = fs.readFileSync(html, "utf8");
  const m = /<script type="application\/json" id="ebModules">\s*([\s\S]*?)\s*<\/script>/.exec(src);
  if (!m) throw new Error("bloc #ebModules absent de " + html);
  const raw = JSON.parse(m[1]);
  const key = Object.keys(raw).find((k) => /engine\.js$/.test(k));
  const code = Buffer.from(raw[key], "base64").toString("utf8");
  const tmp = path.join(require("os").tmpdir(), "eb_engine_" + process.pid + ".js");
  fs.writeFileSync(tmp, code); require(tmp); fs.unlinkSync(tmp);
})();
const E = globalThis.EBV2;
if (!E) throw new Error("globalThis.EBV2 absent après chargement du moteur");


// ---------- domaines valides (extraits de ui/steps.js + js/config.js) ----------
const DOM = {
  intent: ["competition", "finir", "plaisir"],
  level: ["debutant", "inter", "avance"],
  history: ["reprise", "confirme", "ancien"],
  dispo: ["quotidienne", "semaine", "partielle", "weekend"],
  doubles: ["oui", "parfois", "non"],
  off_days: ["non", "oui"],
  shift_ok: ["non", "oui"],
  sex: ["F", "H", "np"],
  sleep: ["court", "moyen", "bon"],
  life_load: ["legere", "normale", "lourde"],
  ftp_known: ["oui", "non"], pace_known: ["oui", "non"], css_known: ["oui", "non"],
  vam_known: ["oui", "non"], gear_test: ["oui", "non"], treadmill: ["oui", "non"],
  poles: ["oui", "non", "a_decider"],
  race_night: ["non", "partielle", "majoritaire"],
  race_technicity: ["roulant", "mixte", "technique", "alpin"],
  train_dplus_access: ["plat", "collines", "montagne"],
  openwater_access: ["aucun", "saisonnier", "toute_annee"],
  team_mode: ["solo", "binome"],
  swim_limit: ["technique", "respiration", "endurance", "peur"],
  med_pain: ["oui", "non"], med_dizzy: ["oui", "non"], med_treat: ["oui", "non"],
  sessions_max: ["3", "5", "7", "9", "12"],
  vol_max: ["4", "7", "10", "13", "16", "20"],
  vol_recent: ["1", "3", "5", "7", "10", "13"],
};
const FORMATS = {
  tri: ["S", "M", "70.3", "Full"], run: ["5k", "10k", "semi", "marathon"],
  bike: ["crit", "route", "cyclo", "clm", "gravel"], duathlon: ["S", "M", "L", "PM"],
  swimrun: ["experience", "sprint", "series", "championship"], trail: [],
};

// ---------- profils de référence VALIDES ----------
const BASE = {
  intent: "competition", level: "inter", history: "confirme", injury: "aucune",
  sessions_max: "9", vol_max: "13", vol_recent: "7", dispo: "partielle",
  doubles: "parfois", off_days: "non", sleep: "moyen", life_load: "normale",
  age: "30", weight: "79", sex: "H", race_date: "2027-06-13", weight_lever: "non",
};
const REF = {
  tri: { ...BASE, format: "Full", ftp_known: "oui", ftp: "227", pace_known: "oui", pace: "4:50", css_known: "non", terrain: "vallonne" },
  run: { ...BASE, format: "marathon", pace_known: "oui", pace: "4:50", terrain: "route", treadmill: "non" },
  bike: { ...BASE, format: "cyclo", ftp_known: "oui", ftp: "227", terrain: "plat" },
  // Le profil de référence du banc portait `format: "1500"` — une valeur qui N'EXISTE PAS dans
  // le domaine du sport (« sprint / demifond / fond / ow »). Le moteur l'acceptait : c'est le
  // défaut B4, démontré par le banc sur son propre profil de référence. Corrigé en `fond`
  // (le 1500 m EST une épreuve de fond) pour que les 551 cas tournent.
  swim: { ...BASE, format: "fond", css_known: "non", milieu: "bassin", swim_limit: "technique" },
  duathlon: { ...BASE, format: "M", ftp_known: "oui", ftp: "227", pace_known: "oui", pace: "4:50", terrain: "plat" },
  ...(process.env.EB_SWIMRUN === "1" ? { swimrun: { ...BASE, format: "series", css_known: "non", pace_known: "oui", pace: "4:50", team_mode: "solo", openwater_access: "saisonnier", race_distance_km: "30" } } : {}),
  trail: { ...BASE, race_distance_km: "45", race_dplus_m: "2200", race_technicity: "mixte", race_night: "non", train_dplus_access: "collines", poles: "oui", vam_known: "non", pace_known: "oui", pace: "4:50" },
};

// ---------- signature d'un plan ----------
function sig(p) {
  let n = 0, easy = 0, hard = 0, longest = 0;
  const perWeek = [];
  for (const w of p.weeks) {
    let wm = 0;
    for (const d of w.days) for (const s of d.sessions) {
      if (s.d === "rs") continue;
      n++; wm += s.min || 0; if ((s.min || 0) > longest) longest = s.min;
    }
    perWeek.push(wm);
  }
  return { weeks: p.totalWeeks, base: p.volBase, peak: p.volPeak, n, longest: Math.round(longest), perWeek };
}
function build(sport, a) {
  try {
    const p = E.buildPlan(sport, a);
    const v2 = p._v2 || {};
    return { ok: true, s: sig(p), warn: (v2.warnings || []).join(" | "), dec: (v2.decisions || []).map((d) => d.id + "=" + d.val).join(" | ") };
  } catch (e) {
    return { ok: false, err: String(e.message || e).slice(0, 70), typed: (e && e.code) === "ENTREE_INVALIDE" };
  }
}
// Mutations qui remplacent une valeur par une AUTRE VALEUR VALIDE : le plan DOIT changer.
const VALID_MUT = new Set(["virgule FR", "casse fautive"]);
const dev = (x, r) => (r ? Math.abs(x - r) / r : x ? 1 : 0);

// ---------- exécution ----------
const rows = [];
function rec(cat, sport, key, mut, res, ref) {
  let verdict, delta = "";
  if (!res.ok) verdict = res.typed ? "ÉCHEC EXPLICITE" : "CRASH NON TYPÉ";
  else if (!ref.ok) verdict = "?";
  else {
    const dp = dev(res.s.peak, ref.s.peak), dw = dev(res.s.weeks, ref.s.weeks), dn = dev(res.s.n, ref.s.n);
    const d = Math.max(dp, dw, dn);
    delta = `pic ${ref.s.peak}→${res.s.peak}h · sem ${ref.s.weeks}→${res.s.weeks} · séances ${ref.s.n}→${res.s.n}`;
    // Une explication NOUVELLE (avertissement ou décision) rend la dérive conforme.
    const parle = res.warn !== ref.warn || res.dec !== ref.dec;
    verdict = d === 0 ? "sans effet"
      : VALID_MUT.has(mut) ? "valeur valide différente"
      : parle ? "DÉRIVE ANNONCÉE"
      : d > 0.15 ? "DÉRIVE SILENCIEUSE FORTE" : "dérive silencieuse";
  }
  rows.push({ cat, sport, key, mut, verdict, delta, err: res.err || "" });
}

const SPORTS = Object.keys(REF);
const refs = {};
for (const sp of SPORTS) refs[sp] = build(sp, REF[sp]);

// T0 — le référentiel valide doit passer
console.log("=== T0 · profils de référence valides ===");
for (const sp of SPORTS) {
  const r = refs[sp];
  console.log(sp.padEnd(9), r.ok ? `OK  sem ${String(r.s.weeks).padStart(3)} · base ${String(r.s.base).padStart(4)}h · pic ${String(r.s.peak).padStart(5)}h · ${String(r.s.n).padStart(4)} séances · plus longue ${r.s.longest}min` : "ÉCHEC " + r.err);
}

// T1 — énumérations : valeur inconnue / casse fautive / vide / absente
const MUTS = [["valeur inconnue", "__zzz__"], ["casse fautive", "CASE"], ["chaîne vide", ""], ["clé absente", undefined]];
for (const sp of SPORTS) {
  if (!refs[sp].ok) continue;
  const keys = Object.keys(DOM).filter((k) => k in REF[sp]);
  for (const k of keys) for (const [lbl, v] of MUTS) {
    const a = { ...REF[sp] };
    if (lbl === "casse fautive") a[k] = String(REF[sp][k]).toUpperCase() === REF[sp][k] ? String(REF[sp][k]).toLowerCase() : String(REF[sp][k]).toUpperCase();
    else if (v === undefined) delete a[k]; else a[k] = v;
    rec("T1 énum", sp, k, lbl, build(sp, a), refs[sp]);
  }
  // format : hors domaine du sport + format d'un AUTRE sport
  if (FORMATS[sp] && FORMATS[sp].length) {
    for (const [lbl, v] of [["valeur inconnue", "__zzz__"], ["casse fautive", String(REF[sp].format).toLowerCase() === REF[sp].format ? String(REF[sp].format).toUpperCase() : String(REF[sp].format).toLowerCase()], ["format d'un autre sport", "gravel"], ["clé absente", undefined]]) {
      const a = { ...REF[sp] }; if (v === undefined) delete a.format; else a.format = v;
      rec("T1 énum", sp, "format", lbl, build(sp, a), refs[sp]);
    }
  }
}

// T2 — numériques
const NUMKEYS = { tri: ["ftp", "pace", "age", "weight", "vol_max", "vol_recent", "sessions_max"], trail: ["race_distance_km", "race_dplus_m", "vam", "race_cutoff_h"], swimrun: ["race_distance_km"] };
const NUMMUTS = [["texte", "abc"], ["négatif", "-5"], ["zéro", "0"], ["absurde", "999999"], ["virgule FR", "12,5"], ["null", null]];
for (const sp of Object.keys(NUMKEYS)) {
  if (!refs[sp] || !refs[sp].ok) continue; // sport hors périmètre V1 (R12 §0)
  for (const k of NUMKEYS[sp]) for (const [lbl, v] of NUMMUTS) {
    const a = { ...REF[sp] }; a[k] = v;
    rec("T2 nombre", sp, k, lbl, build(sp, a), refs[sp]);
  }
}

// T3 — dates
const DMUTS = [["date passée", "2020-01-01"], ["malformée", "13/06/2027"], ["absente", undefined], ["dans 3 semaines", new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10)], ["dans 20 ans", "2046-06-13"]];
for (const sp of SPORTS) {
  if (!refs[sp].ok) continue;
  for (const [lbl, v] of DMUTS) {
    const a = { ...REF[sp] }; if (v === undefined) delete a.race_date; else a.race_date = v;
    rec("T3 date", sp, "race_date", lbl, build(sp, a), refs[sp]);
  }
}

// T4 — incohérences croisées (chaque valeur est valide isolément)
const CROSS = [
  ["vol_recent > vol_max", { vol_max: "4", vol_recent: "13" }],
  ["3 séances / 20 h", { sessions_max: "3", vol_max: "20" }],
  ["12 séances / 4 h", { sessions_max: "12", vol_max: "4" }],
  ["ftp_known=oui sans ftp", { ftp_known: "oui", ftp: undefined }],
  ["pace_known=oui sans pace", { pace_known: "oui", pace: undefined }],
  ["débutant + Ironman + 20 h", { level: "debutant", history: "reprise", vol_max: "20" }],
  ["douleur + compétition", { med_pain: "oui" }],
  ["off 7 jours sur 7", { off_days: "oui", off_which: "Lun,Mar,Mer,Jeu,Ven,Sam,Dim" }],
];
for (const [lbl, mut] of CROSS) {
  const a = { ...REF.tri };
  for (const [k, v] of Object.entries(mut)) { if (v === undefined) delete a[k]; else a[k] = v; }
  rec("T4 croisé", "tri", "—", lbl, build("tri", a), refs.tri);
}

// ---------- rapport ----------
const G = {};
for (const r of rows) (G[r.verdict] ||= []).push(r);
console.log("\n=== SYNTHÈSE (" + rows.length + " cas) ===");
for (const v of ["ÉCHEC EXPLICITE", "sans effet", "DÉRIVE ANNONCÉE", "valeur valide différente", "dérive silencieuse", "DÉRIVE SILENCIEUSE FORTE", "CRASH NON TYPÉ", "?"])
  if (G[v]) console.log(String(G[v].length).padStart(4), v);

for (const v of ["DÉRIVE SILENCIEUSE FORTE", "dérive silencieuse", "CRASH NON TYPÉ"]) {
  if (!G[v]) continue;
  console.log("\n=== " + v + " ===");
  for (const r of G[v]) console.log(`${r.cat} · ${r.sport.padEnd(8)} ${r.key.padEnd(20)} ${r.mut.padEnd(24)} ${r.delta}`);
}
if (G["ÉCHEC EXPLICITE"]) {
  console.log("\n=== ÉCHECS EXPLICITES (comportement souhaité) ===");
  for (const r of G["ÉCHEC EXPLICITE"]) console.log(`${r.cat} · ${r.sport.padEnd(8)} ${r.key.padEnd(20)} ${r.mut.padEnd(24)} ${r.err}`);
}
require("fs").writeFileSync(path.join(__dirname, "audit-results", "amont.json"), JSON.stringify(rows, null, 1));

// ---------- critère de sortie (R11.8) ----------
const silent = (G["DÉRIVE SILENCIEUSE FORTE"] || []).length + (G["dérive silencieuse"] || []).length;
const crashes = (G["CRASH NON TYPÉ"] || []).length + (G["?"] || []).length;
if (silent || crashes) {
  console.error("\n\u2716 contrat d'entrée rompu : " + silent + " dérive(s) silencieuse(s), " + crashes + " crash(s) non typé(s).");
  console.error("Un plan qui change doit le DIRE (refus, avertissement, ou défaut journalisé).");
  process.exit(1);
}
console.log("\n\u2713 contrat d'entrée tenu : aucune dérive silencieuse, aucun crash non typé.");
