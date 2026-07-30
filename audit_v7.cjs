/* audit_v7.js — Audit externe multi-sport (trail / swimrun / duathlon)
 * Indépendant de auditPlan() interne : on vérifie les PROMESSES (règles déclarées,
 * réponses de l'athlète) contre le plan RÉELLEMENT émis.
 * Usage : node audit_v7.js <sport> [nFuzz]
 */
"use strict";
/* Chargement du moteur — deux modes :
 *   1) ENGINE=/chemin/engine.js         (bundle déjà extrait)
 *   2) STANDALONE=/chemin/EnduraBuild-standalone.html  (extraction à la volée)
 * Par défaut : ./modules/js/engine.js, sinon ./EnduraBuild-standalone-1.html
 */
const fs = require("fs"), path = require("path");
function loadEngine() {
  const direct = process.env.ENGINE || path.join(__dirname, "modules/js/engine.js");
  if (fs.existsSync(direct)) { require(direct); return; }
  const html = process.env.STANDALONE || path.join(__dirname, "EnduraBuild-standalone-1.html");
  if (!fs.existsSync(html)) throw new Error("moteur introuvable : renseigne ENGINE= ou STANDALONE=");
  const src = fs.readFileSync(html, "utf8");
  const m = /<script type="application\/json" id="ebModules">\s*([\s\S]*?)\s*<\/script>/.exec(src);
  if (!m) throw new Error("bloc #ebModules absent de " + html);
  const raw = JSON.parse(m[1]);
  const key = Object.keys(raw).find((k) => /engine\.js$/.test(k));
  const code = Buffer.from(raw[key], "base64").toString("utf8");
  const tmp = path.join(require("os").tmpdir(), "eb_engine_" + process.pid + ".js");
  fs.writeFileSync(tmp, code);
  require(tmp);
  fs.unlinkSync(tmp);
}
loadEngine();
const E = globalThis.EBV2;
if (!E) throw new Error("globalThis.EBV2 absent après chargement du moteur");

/* ---------------- RNG déterministe ---------------- */
let seed = 1234567;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];

/* ---------------- Dimensions ---------------- */
const COMMON = {
  intent: ["competition", "finir", "plaisir"],
  level: ["debutant", "inter", "avance"],
  history: ["reprise", "confirme", "ancien"],
  injury: ["aucune", "tibia", "genou", "epaule", "dos", "pied", "hanche", "tibia,genou"],
  sessions_max: ["3", "5", "7", "9", "12"],
  vol_max: ["4", "7", "10", "13", "16", "20"],
  vol_recent: ["1", "3", "5", "7", "10", "13"],
  dispo: ["quotidienne", "semaine", "partielle", "weekend"],
  off_days: ["non", "oui"],
  off_which: ["Lun", "Sam", "Lun,Mar", "Sam,Dim", "Lun,Mer,Ven"],
  doubles: ["oui", "parfois", "non"],
  age: ["16", "22", "30", "45", "58", "72"],
  sex: ["H", "F", "np"],
  weight: ["", "58", "79", "104"],
  med_pain: ["non", "oui"],
  med_dizzy: ["non", "oui"],
  med_treat: ["non", "oui"],
  race_date: ["", "2026-10-04", "2026-12-13", "2027-03-14", "2027-05-09", "2027-09-12", "2028-06-11"],
  weight_lever: ["non", "oui", "coach"],
  sleep: ["court", "moyen", "bon"],
  life_load: ["legere", "normale", "lourde"],
};

const TRAIL = {
  race_distance_km: ["6", "18", "30", "45", "72", "110", "170", "330"],
  race_dplus_m: ["0", "400", "1100", "2200", "3600", "6500", "11000", "19000"],
  race_technicity: ["roulant", "mixte", "technique", "alpin"],
  race_night: ["non", "partielle", "majoritaire"],
  race_cutoff_h: ["", "4", "12", "26", "46"],
  train_dplus_access: ["montagne", "collines", "plat"],
  treadmill: ["oui", "non"],
  poles: ["oui", "non", "a_decider"],
  pace_known: ["oui", "non"],
  pace: ["3:40", "4:50", "6:30"],
  vam_known: ["oui", "non"],
  vam: ["450", "850", "1350"],
};

const SWIMRUN = {
  format: ["experience", "sprint", "series", "championship"],
  swim_total_m: ["", "800", "2600", "6000", "11000"],
  run_total_km: ["", "5", "9.2", "31", "65"],
  race_dplus_m: ["0", "250", "900", "2400"],
  segments_n: ["", "2", "10", "24", "48"],
  longest_swim_m: ["", "200", "600", "1500", "3000"],
  water_temp_c: ["", "8", "13", "16", "18", "24"],
  team_mode: ["binome", "solo"],
  team_swim_gap_sec: ["", "0", "10", "35"],
  openwater_access: ["toute_annee", "saisonnier", "aucun"],
  swim_continuous: ["oui", "non"],
  run_continuous: ["oui", "non"],
  gear_test: ["oui", "non"],
  swimrun_swim_pace: ["2:05", "2:45"],
  swimrun_run_pace: ["6:30", "8:00"],
  css_known: ["oui", "non"],
  css: ["1:35", "1:45", "2:20"],
  pace_known: ["oui", "non"],
  pace: ["4:10", "4:50", "6:00"],
};

const DUATHLON = {
  format: ["S", "M", "L", "PM"],
  terrain: ["plat", "vallonne", "montagne"],
  pace_known: ["oui", "non"],
  pace: ["3:50", "4:50", "6:10"],
  ftp_known: ["oui", "non"],
  ftp: ["150", "227", "330"],
  hr_max: ["", "188"],
};

const DIMS = { trail: TRAIL, swimrun: SWIMRUN, duathlon: DUATHLON };

const BASE = {
  trail: {
    intent: "competition", med_pain: "non", med_dizzy: "non", med_treat: "non",
    age: "30", sex: "H", weight: "79", history: "confirme", injury: "aucune",
    sessions_max: "7", vol_max: "10", vol_recent: "7", dispo: "partielle",
    off_days: "non", doubles: "oui", level: "inter", race_date: "2027-05-09",
    race_distance_km: "62", race_dplus_m: "3200", race_technicity: "technique",
    race_night: "partielle", race_cutoff_h: "14", train_dplus_access: "collines",
    treadmill: "non", poles: "oui", pace_known: "oui", pace: "4:50",
    vam_known: "oui", vam: "850",
  },
  swimrun: {
    intent: "competition", med_pain: "non", med_dizzy: "non", med_treat: "non",
    age: "30", sex: "H", weight: "79", history: "confirme", injury: "aucune",
    sessions_max: "7", vol_max: "10", vol_recent: "7", dispo: "partielle",
    off_days: "non", doubles: "oui", level: "inter", race_date: "2027-05-09",
    format: "sprint", swim_total_m: "2600", run_total_km: "9.2", race_dplus_m: "250",
    segments_n: "10", longest_swim_m: "600", water_temp_c: "16", team_mode: "binome",
    team_swim_gap_sec: "5", openwater_access: "saisonnier", swim_continuous: "oui",
    run_continuous: "oui", gear_test: "non", css_known: "oui", css: "1:45",
    pace_known: "oui", pace: "4:50",
  },
  duathlon: {
    intent: "competition", med_pain: "non", med_dizzy: "non", med_treat: "non",
    age: "30", sex: "H", weight: "79", history: "confirme", injury: "aucune",
    sessions_max: "7", vol_max: "10", vol_recent: "7", dispo: "partielle",
    off_days: "non", doubles: "oui", level: "inter", race_date: "2027-05-09",
    format: "M", terrain: "vallonne", pace_known: "oui", pace: "4:50",
    ftp_known: "oui", ftp: "227",
  },
};

/* ---------------- Helpers de lecture de plan ---------------- */
const txtOf = (s) =>
  [s.name, s.note, s.det, ...(s.steps || []).map((st) =>
    [st.text, st.suffix, st.recoveryText, st.zone, st.mode, st.surface].filter(Boolean).join(" "))].filter(Boolean).join(" ");

const bodies = (s) => (s.steps || []).filter((x) => x.role === "body");
const isWork = (s) => s.d !== "rs" && (s.min || 0) > 0;
const HARD_ZONE = /\.(vo2|thr|css|rp|ss|asc|climb|vam|frc)$/;
const HARD_HI = /\.(vo2|thr|rp|css)$/;

function weekMin(w) {
  let m = 0;
  for (const d of w.days) for (const s of d.sessions) m += s.min || 0;
  return m;
}
function discMin(w) {
  const o = { rn: 0, bk: 0, sw: 0, br: 0 };
  for (const d of w.days) for (const s of d.sessions) {
    if (s.d === "rs") continue;
    if (s.d === "br") { // répartir le brick par legs si dispo
      let done = false;
      for (const b of bodies(s)) if (b.leg || b.d) { o[b.d === "sw" ? "sw" : "rn"] += (b.reps || 1) * (b.durationMin || 0); done = true; }
      if (!done) o.br += s.min || 0;
    } else o[s.d] = (o[s.d] || 0) + (s.min || 0);
  }
  return o;
}

/* ---------------- Checks ---------------- */
function runChecks(sport, a, plan, fail) {
  const F = (id, msg) => fail(id, msg);
  const WARN = (plan._v2 && plan._v2.warnings ? plan._v2.warnings : []).join(" ");
  const warned = (re) => re.test(WARN);
  const weeks = plan.weeks;
  const sessMax = parseInt(a.sessions_max || "99");
  const volMaxMin = parseFloat(a.vol_max || "99") * 60;
  const offSet = new Set(a.off_days === "oui" ? String(a.off_which || "").split(",").filter(Boolean) : []);
  const medHold = a.med_pain === "oui" || a.med_dizzy === "oui" || a.med_treat === "oui";
  const inj = String(a.injury || "");

  let peak = 0;
  for (const w of weeks) peak = Math.max(peak, weekMin(w));

  const seenDates = new Set();
  for (const w of weeks) {
    if (w.days.length !== 7) F("U-STRUCT", `S${w.num} ${w.days.length} jours`);
    let nSess = 0;
    const namesInWeek = new Map();
    for (const d of w.days) {
      let dayWork = 0;
      if (d.date) { if (seenDates.has(d.date)) F("U-DATE-DUP", `date ${d.date} en double`); seenDates.add(d.date); }
      for (const s of d.sessions) {
        const t = txtOf(s);
        if (/undefined|NaN|Infinity|\[object|null/.test(t)) F("U-TEXT", `S${w.num} ${d.jour} « ${s.name} » : ${t.match(/undefined|NaN|Infinity|\[object|null/)[0]}`);
        if (s.d !== "rs" && (typeof s.min !== "number" || !isFinite(s.min) || s.min <= 0)) F("U-MIN", `S${w.num} ${d.jour} « ${s.name} » min=${s.min}`);
        if (s.d === "rs" && typeof s.min !== "number") F("U-MIN-REST", `S${w.num} ${d.jour} « ${s.name} » : champ min absent (0 ailleurs)`);
        // cohérence min / steps
        const stepSum = (s.steps || []).reduce((x, st) => x + (st._min || 0), 0);
        if ((s.steps || []).length && Math.abs(stepSum - (s.min || 0)) > 1.01) F("U-MIN-SUM", `S${w.num} ${d.jour} « ${s.name} » min=${s.min} vs Σsteps=${Math.round(stepSum)}`);
        if (isWork(s)) { nSess++; dayWork++; }
        if (isWork(s) && offSet.has(d.jour)) F("U-OFF", `S${w.num} séance ${d.jour} déclaré OFF`);
        // médical
        if (medHold) for (const b of bodies(s)) if (HARD_HI.test(String(b.zone || ""))) F("U-MED", `S${w.num} ${d.jour} zone ${b.zone} malgré drapeau médical`);
        // reps absurdes
        for (const b of bodies(s)) {
          const reps = b.reps || 1, du = b.durationMin || 0;
          if (reps >= 12) F("U-REPCAP", `S${w.num} ${d.jour} « ${s.name} » ${reps}×${du || (b.distanceM + "m")} (${b.zone || "?"}) — plafond global 15 atteint`);
          if (HARD_HI.test(String(b.zone || "")) && reps * du > 45) F("U-DOSE", `S${w.num} ${d.jour} « ${s.name} » ${reps}×${du}min = ${Math.round(reps * du)}min en ${b.zone}`);
        }
        if (parseInt(a.age) < 18) for (const b of bodies(s)) if (/vo2/.test(String(b.zone || ""))) F("U-MINEUR", `S${w.num} ${b.zone} à ${a.age} ans`);
        // doublons dans la semaine
        if (isWork(s) && bodies(s).some((b) => HARD_HI.test(String(b.zone || "")) || (b.reps || 1) > 1)) {
          const k = s.name + "|" + (s.det || "").slice(0, 80);
          namesInWeek.set(k, (namesInWeek.get(k) || 0) + 1);
        }
      }
      if (a.doubles === "non" && dayWork > 1) F("U-DOUBLES", `S${w.num} ${d.jour} ${dayWork} séances alors que doubles=non`);
    }
    for (const [k, n] of namesInWeek) if (n > 1) F("U-DUP", `S${w.num} ${n}× la même séance « ${k.split("|")[0]} »`);
    if (nSess > sessMax) F("U-SESSBUDGET", `S${w.num} ${nSess} séances > ${sessMax} déclarées`);
    const wm = weekMin(w);
    if (wm > volMaxMin * 1.15) F("U-VOLCAP", `S${w.num} ${(wm / 60).toFixed(1)}h prescrites > plafond ${a.vol_max}h`);
    const declMin = (w.vol_declared ?? w.vol) * 60;
    if (declMin > 0 && wm > declMin * 1.4) F("U-DECL", `S${w.num} ratio ${(wm/declMin).toFixed(2)} — prescrit ${(wm / 60).toFixed(1)}h vs courbe ${(declMin / 60).toFixed(1)}h`);
  }
  // affûtage
  const last = weekMin(weeks[weeks.length - 1]);
  if (peak > 0 && last > peak * 0.75) F("U-TAPER", `dernière semaine ${(last / 60).toFixed(1)}h vs pic ${(peak / 60).toFixed(1)}h`);
  // date de course
  if (a.race_date) {
    const dates = weeks[weeks.length - 1].days.map((d) => d.date).filter(Boolean);
    if (dates.length && !(a.race_date >= dates[0] && a.race_date <= dates[dates.length - 1])
        && !warned(/course est dans \d+ semaines|semaine\(s\) avant la course/))
      F("U-RACEDATE", `course ${a.race_date} hors dernière semaine [${dates[0]}..${dates[dates.length - 1]}] et aucun avertissement`);
  }

  /* ---- TRAIL ---- */
  if (sport === "trail") {
    const flat = a.train_dplus_access === "plat";
    for (const w of weeks) {
      let wD = 0;
      for (const d of w.days) for (const s of d.sessions) {
        for (const b of bodies(s)) {
          wD += (b.reps || 1) * (b.dplusM || 0);
          if (a.poles === "non" && b.poles === true) F("T-POLES", `S${w.num} bâtons prescrits alors que poles=non`);
          if (flat && a.treadmill === "non" && (b.dplusM || 0) > 200) F("T-DPLUS", `S${w.num} ${b.dplusM}m D+/rep en accès plat sans tapis`);
          if (b.distanceM && !b.durationMin) F("T-KM", `S${w.num} prescription en distance (${b.distanceM}m) — trail se planifie en temps/D+`);
        }
      }
      if (flat && a.treadmill === "non" && wD > 1200) F("T-DPLUS-WK", `S${w.num} ${wD}m D+ hebdo en accès plat sans tapis`);
    }
    const all = weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map(txtOf))).join(" ");
    if (a.race_night !== "non" && !/nuit|frontale|lampe/i.test(all)) F("T-NIGHT", `course de nuit (${a.race_night}) : aucune séance/consigne nuit dans tout le plan`);
    if (parseInt(a.race_dplus_m) >= 1500 && a.poles === "a_decider" && !/bâton/i.test(all)) F("T-POLES-ADV", `${a.race_dplus_m}m D+ et bâtons « à décider » : aucun conseil bâtons`);
    if (!/descente|excentrique/i.test(all)) F("T-DESC", "aucun travail de descente/excentrique");
  }

  /* ---- SWIMRUN ---- */
  if (sport === "swimrun") {
    const owCap = { toute_annee: 3, saisonnier: 1, aucun: 0 }[a.openwater_access] ?? 1;
    const solo = a.team_mode === "solo";
    for (const w of weeks) {
      let ow = 0, runS = 0, swS = 0;
      for (const d of w.days) for (const s of d.sessions) {
        const t = txtOf(s);
        if (!isWork(s)) continue;
        if (/eau libre/i.test(t)) ow++;
        if (s.d === "rn") runS++;
        if (s.d === "sw") swS++;
        if (solo && /longe|binôme/i.test(t)) F("S-SOLO", `S${w.num} « ${s.name} » parle de longe/binôme en solo`);
        if (/epaule/.test(inj) && /plaquettes/i.test(t) && !/SANS plaquettes/i.test(t)) F("S-EPAULE", `S${w.num} plaquettes prescrites avec épaule déclarée`);
      }
      if (ow > owCap) F("S-OW", `S${w.num} ${ow} séances en eau libre > ${owCap} autorisée(s) (${a.openwater_access})`);
      if (!w.isRecup && w.phase.id !== "taper" && runS + (w.days.some((d) => d.sessions.some((s) => s.d === "br")) ? 1 : 0) < 2)
        F("S-RUN-STARVED", `S${w.num} ${runS} séance(s) de course pure (${swS} de nage) — course = majorité du temps de course`);
    }
    let anyVo2 = 0;
    for (const w of weeks) for (const d of w.days) for (const s of d.sessions) for (const b of bodies(s)) if (/vo2/.test(String(b.zone || ""))) anyVo2++;
    if (!anyVo2 && parseInt(a.age) >= 18 && a.level !== "debutant" && !medHold) F("S-NOVO2", "aucune séance VO2max/vitesse dans tout le plan (module swimrun sans stimulus VO2)");
    // part de course vs part de nage sur les semaines de charge
    let rnT = 0, swT = 0;
    for (const w of weeks) { if (w.isRecup || w.phase.id === "taper") continue; const o = discMin(w); rnT += o.rn; swT += o.sw; }
    const obj = E.swimrunObjective(a);
    const raceRunShare = obj ? 1 - obj.swimTimeShare : 0.6;
    const degenerate = obj && (obj.transitionMin > obj.swimMin + obj.runMin || obj.segments * 100 > obj.swimTotalM);
    if (rnT + swT > 0 && !degenerate) {
      const planRunShare = rnT / (rnT + swT);
      if (planRunShare < raceRunShare - 0.15) F("S-MIX", `plan ${Math.round(planRunShare * 100)}% de course vs ${Math.round(raceRunShare * 100)}% dans la course (écart ${Math.round((raceRunShare - planRunShare) * 100)} pts)`);
    }
    // nom de la séance pivot vs nombre réel de transitions prescrites
    for (const w of weeks) for (const d of w.days) for (const s of d.sessions) {
      const m = /\((\d+) transitions\)/.exec(s.name || "");
      if (!m) continue;
      const swLeg = bodies(s).find((b) => b.leg === "swim");
      if (!swLeg) continue;
      const real = 2 * (swLeg.reps || 1);
      if (real !== Number(m[1])) F("S-TRANSITIONS", `S${w.num} nom « ${s.name} » mais ${real} transitions réellement prescrites (${swLeg.reps} nages)`);
    }
    const prereq = E.swimrunPrereq(a);
    if (prereq && plan.weeks.length && !warned(/prérequis|il faut savoir nager/i))
      F("S-PREREQ", `prérequis non atteints et plan généré SANS avertissement`);
    // plus longue nage continue vs course
    const FMT_MAX_SWIM = { experience: 800, sprint: 1200, series: 2000, championship: 3000 };
    const target = parseFloat(a.longest_swim_m || "0");
    const coherent = target <= (FMT_MAX_SWIM[a.format] || 3000);
    if (target > 0 && coherent) {
      let maxCont = 0;
      for (const w of weeks) for (const d of w.days) for (const s of d.sessions)
        for (const b of bodies(s)) if ((b.d || s.d) === "sw" && (b.reps || 1) === 1 && b.distanceM) maxCont = Math.max(maxCont, b.distanceM);
      if (maxCont < target * 0.8) F("S-LONGSWIM", `plus longue nage continue du plan ${maxCont}m < 80% de ${target}m (course)`);
    }
  }

  /* ---- DUATHLON ---- */
  if (sport === "duathlon") {
    for (const w of weeks) {
      let vo2run = 0, hasBk = false, hasRn = false;
      for (const d of w.days) for (const s of d.sessions) {
        if (s.d === "sw") F("D-SWIM", `S${w.num} séance de natation en duathlon`);
        if (/\bnage\b|\bnager|natation|bassin|piscine/i.test(txtOf(s))) F("D-SWIMTXT", `S${w.num} « ${s.name} » évoque la natation`);
        if (s.d === "bk" || s.d === "br") hasBk = true;
        if (s.d === "rn" || s.d === "br") hasRn = true;
        if (s.d === "rn" && bodies(s).some((b) => /rn\.vo2/.test(String(b.zone || "")))) vo2run++;
      }
      if (vo2run > 1) F("D-VO2", `S${w.num} ${vo2run} séances VO2max course (garde-fou singleRunVo2PerWeek)`);
      if (!w.isRecup && !medHold && (!hasBk || !hasRn) && !warned(/ne permet pas de faire tenir toutes les disciplines/))
        F("D-DISC", `S${w.num} ${hasRn ? "" : "aucune course"}${hasBk ? "" : " aucun vélo"} — sans avertissement d'enveloppe`);
    }
    const all = weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map(txtOf))).join(" ");
    if (!/transition|brick|R2|enchaîn/i.test(all)) F("D-BRICK", "aucun enchaînement/transition dans tout le plan");
    if (a.terrain === "montagne" && !/côte|montée|grimp|force|braquet/i.test(all)) F("D-TERRAIN", "parcours montagneux : aucun travail de côte/force");
  }
}

/* ---------------- Génération de profils ---------------- */
function ofat(sport) {
  const out = [["baseline", { ...BASE[sport] }]];
  const dims = { ...COMMON, ...DIMS[sport] };
  for (const k of Object.keys(dims)) for (const v of dims[k]) {
    const a = { ...BASE[sport], [k]: v };
    if (k === "off_days" && v === "oui") a.off_which = "Lun,Sam";
    if (k === "off_which") a.off_days = "oui";
    if (k === "dispo" && v === "quotidienne") a.shift_ok = "oui";
    out.push([`${k}=${v || "∅"}`, a]);
  }
  return out;
}
function fuzz(sport, n) {
  const out = [];
  const dims = { ...COMMON, ...DIMS[sport] };
  for (let i = 0; i < n; i++) {
    const a = { ...BASE[sport] };
    for (const k of Object.keys(dims)) if (rnd() < 0.55) a[k] = pick(dims[k]);
    if (a.off_days === "oui" && !a.off_which) a.off_which = pick(COMMON.off_which);
    if (a.dispo === "quotidienne") a.shift_ok = rnd() < 0.5 ? "oui" : "non";
    out.push([`fuzz#${i}`, a]);
  }
  return out;
}

/* ---------------- Exécution ---------------- */
const sport = process.argv[2];
const nFuzz = parseInt(process.argv[3] || "1200");
const cases = [...ofat(sport), ...fuzz(sport, nFuzz)];
const tally = new Map();
const examples = new Map();
let crashes = 0, nondet = 0, ok = 0;

for (const [label, a] of cases) {
  let plan;
  try {
    plan = E.buildPlan(sport, a);
  } catch (e) {
    crashes++;
    const id = "U-CRASH:" + String(e && e.message).slice(0, 60);
    tally.set(id, (tally.get(id) || 0) + 1);
    if (!examples.has(id)) examples.set(id, { label, a, msg: String(e && e.stack).split("\n").slice(0, 3).join(" | ") });
    continue;
  }
  if (!plan || !plan.weeks || !plan.weeks.length) {
    tally.set("U-EMPTY", (tally.get("U-EMPTY") || 0) + 1);
    if (!examples.has("U-EMPTY")) examples.set("U-EMPTY", { label, a, msg: "plan vide" });
    continue;
  }
  const hits = new Set();
  runChecks(sport, a, plan, (id, msg) => {
    if (hits.has(id)) return; // 1 hit par check et par profil
    hits.add(id);
    tally.set(id, (tally.get(id) || 0) + 1);
    if (!examples.has(id)) examples.set(id, { label, a, msg });
  });
  if (!hits.size) ok++;
  // déterminisme (échantillon)
  if (label.endsWith("0") || label === "baseline") {
    const p2 = E.buildPlan(sport, a);
    const k = (p) => JSON.stringify(p.weeks.map((w) => w.days.map((d) => d.sessions.map((s) => [s.d, Math.round(s.min || 0), s.name]))));
    if (k(plan) !== k(p2)) { nondet++; tally.set("U-NONDET", (tally.get("U-NONDET") || 0) + 1); if (!examples.has("U-NONDET")) examples.set("U-NONDET", { label, a, msg: "2 générations divergent" }); }
  }
}

const rows = [...tally.entries()].sort((x, y) => y[1] - x[1]);
console.log(JSON.stringify({ sport, cases: cases.length, clean: ok, crashes, nondet, rows, examples: Object.fromEntries([...examples].map(([k, v]) => [k, { label: v.label, msg: v.msg, a: v.a }])) }));
